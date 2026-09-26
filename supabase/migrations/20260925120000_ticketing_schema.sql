-- Esquema de la ticketera: fechas, lotes, órdenes, entradas y staff.
--
-- Reglas de acceso:
-- - El público solo lee fechas publicadas y sus lotes activos.
-- - Órdenes y entradas no se leen desde el cliente: las maneja el server con la
--   secret key, y el staff logueado las puede consultar.
-- - Toda escritura con reglas de negocio (reservar cupo, emitir entradas, validar
--   en puerta) pasa por funciones de acá abajo, que son atómicas.
--
-- El proyecto no auto-expone tablas nuevas a la Data API: cada grant está escrito.

create extension if not exists pgcrypto with schema extensions;

/* -------------------------------------------------------------------------- */
/* Tipos                                                                       */
/* -------------------------------------------------------------------------- */

create type public.event_status as enum ('draft', 'published', 'archived');
create type public.order_status as enum ('pending', 'paid', 'expired', 'cancelled', 'refunded');
create type public.ticket_status as enum ('valid', 'used', 'void');
create type public.staff_role as enum ('admin', 'door');

/* -------------------------------------------------------------------------- */
/* Tablas                                                                      */
/* -------------------------------------------------------------------------- */

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue text not null,
  neighborhood text not null,
  lineup text[] not null default '{}',
  status public.event_status not null default 'draft',
  created_at timestamptz not null default now(),
  constraint events_dates_check check (ends_at > starts_at)
);

comment on column public.events.slug is 'Identificador público, va en la URL. Ej: mvs-012.';

-- Un lote es un tipo de entrada con precio y cupo propios ("General", "Preventa 1").
create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  -- En pesos, sin centavos.
  price integer not null check (price >= 0),
  capacity integer not null check (capacity >= 0),
  max_per_order integer not null default 6 check (max_per_order > 0),
  sales_start timestamptz,
  sales_end timestamptz,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index ticket_types_event_id_idx on public.ticket_types (event_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id),
  buyer_name text not null,
  buyer_email text not null,
  buyer_dni text not null,
  total integer not null default 0 check (total >= 0),
  status public.order_status not null default 'pending',
  -- Mientras está pending y no venció, la orden reserva su cupo.
  expires_at timestamptz not null default now() + interval '15 minutes',
  mp_preference_id text,
  mp_payment_id text unique,
  paid_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index orders_event_id_idx on public.orders (event_id);
create index orders_buyer_email_idx on public.orders (lower(buyer_email));

create table public.order_items (
  order_id uuid not null references public.orders (id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types (id),
  quantity integer not null check (quantity > 0),
  -- Precio congelado al momento de comprar.
  unit_price integer not null check (unit_price >= 0),
  primary key (order_id, ticket_type_id)
);

create index order_items_ticket_type_id_idx on public.order_items (ticket_type_id);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  event_id uuid not null references public.events (id),
  ticket_type_id uuid not null references public.ticket_types (id),
  -- 128 bits aleatorios en base64url: es lo que va en el QR.
  code text not null unique
    default translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/=', '-_'),
  status public.ticket_status not null default 'valid',
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index tickets_order_id_idx on public.tickets (order_id);
create index tickets_event_id_idx on public.tickets (event_id);

create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.staff_role not null default 'door',
  created_at timestamptz not null default now()
);

create table public.subscribers (
  email text primary key,
  created_at timestamptz not null default now()
);

/* -------------------------------------------------------------------------- */
/* Funciones                                                                   */
/* -------------------------------------------------------------------------- */

create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()));
$$;

-- Entradas vendidas + reservadas vigentes de un lote.
create function public.ticket_type_taken(p_ticket_type_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(oi.quantity), 0)::integer
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.ticket_type_id = p_ticket_type_id
    and (o.status = 'paid' or (o.status = 'pending' and o.expires_at > now()));
$$;

-- Disponibilidad pública de los lotes de fechas publicadas. Expone solo números:
-- las órdenes en sí siguen siendo privadas.
create function public.ticket_availability()
returns table (ticket_type_id uuid, capacity integer, available integer)
language sql
stable
security definer
set search_path = ''
as $$
  select tt.id, tt.capacity, greatest(tt.capacity - public.ticket_type_taken(tt.id), 0)
  from public.ticket_types tt
  join public.events e on e.id = tt.event_id
  where tt.active and e.status = 'published';
$$;

-- Reserva cupo y crea la orden. `p_items` es [{ "ticket_type_id": uuid, "quantity": int }].
-- Bloquea las filas de los lotes, así dos compras simultáneas por el último cupo no
-- pueden pasar las dos. Los errores salen con códigos cortos que traduce la app.
create function public.create_order(
  p_event_id uuid,
  p_items jsonb,
  p_buyer_name text,
  p_buyer_email text,
  p_buyer_dni text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_total integer := 0;
  v_row record;
  v_tt public.ticket_types;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items_invalidos';
  end if;

  if not exists (
    select 1 from public.events
    where id = p_event_id and status = 'published' and ends_at > now()
  ) then
    raise exception 'fecha_no_disponible';
  end if;

  insert into public.orders (event_id, buyer_name, buyer_email, buyer_dni)
  values (p_event_id, p_buyer_name, lower(p_buyer_email), p_buyer_dni)
  returning id into v_order_id;

  -- Orden fijo por id para que dos transacciones no se bloqueen cruzadas.
  for v_row in
    select (e ->> 'ticket_type_id')::uuid as ticket_type_id, sum((e ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) e
    group by 1
    order by 1
  loop
    select * into v_tt
    from public.ticket_types
    where id = v_row.ticket_type_id and event_id = p_event_id
    for update;

    if not found or not v_tt.active then
      raise exception 'lote_invalido';
    end if;
    if (v_tt.sales_start is not null and now() < v_tt.sales_start)
      or (v_tt.sales_end is not null and now() > v_tt.sales_end) then
      raise exception 'lote_fuera_de_venta';
    end if;
    if v_row.quantity < 1 or v_row.quantity > v_tt.max_per_order then
      raise exception 'cantidad_invalida';
    end if;
    if public.ticket_type_taken(v_tt.id) + v_row.quantity > v_tt.capacity then
      raise exception 'sin_cupo';
    end if;

    insert into public.order_items (order_id, ticket_type_id, quantity, unit_price)
    values (v_order_id, v_tt.id, v_row.quantity, v_tt.price);

    v_total := v_total + v_row.quantity * v_tt.price;
  end loop;

  update public.orders set total = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

-- Marca la orden como pagada y emite una entrada por unidad. Idempotente: devuelve
-- true solo la vez que efectivamente la pagó, así el mail sale una sola vez aunque
-- Mercado Pago reintente el webhook. Una orden vencida que igual se pagó se honra.
create function public.fulfill_order(p_order_id uuid, p_mp_payment_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;

  if not found then
    raise exception 'orden_inexistente';
  end if;
  if v_order.status = 'paid' then
    return false;
  end if;
  if v_order.status not in ('pending', 'expired') then
    raise exception 'orden_no_pagable';
  end if;

  update public.orders
  set status = 'paid', paid_at = now(), mp_payment_id = p_mp_payment_id
  where id = p_order_id;

  insert into public.tickets (order_id, event_id, ticket_type_id)
  select p_order_id, v_order.event_id, oi.ticket_type_id
  from public.order_items oi
  cross join lateral generate_series(1, oi.quantity)
  where oi.order_id = p_order_id;

  return true;
end;
$$;

-- Valida una entrada en la puerta. El update condicional es atómico: si dos
-- celulares escanean la misma entrada, solo uno la deja pasar.
create function public.check_in(p_event_id uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.tickets;
  v_ok boolean;
  v_buyer text;
  v_ticket_type text;
begin
  if not public.is_staff() then
    raise exception 'no_autorizado';
  end if;

  update public.tickets
  set status = 'used', checked_in_at = now(), checked_in_by = (select auth.uid())
  where code = p_code and event_id = p_event_id and status = 'valid'
  returning * into v_ticket;

  v_ok := found;

  if not v_ok then
    select * into v_ticket from public.tickets where code = p_code;
    if not found then
      return jsonb_build_object('result', 'no_existe');
    end if;
  end if;

  select o.buyer_name, tt.name into v_buyer, v_ticket_type
  from public.orders o
  join public.ticket_types tt on tt.id = v_ticket.ticket_type_id
  where o.id = v_ticket.order_id;

  return jsonb_build_object(
    'result',
    case
      when v_ok then 'ok'
      when v_ticket.event_id <> p_event_id then 'otra_fecha'
      when v_ticket.status = 'used' then 'ya_usada'
      else 'anulada'
    end,
    'buyer_name', v_buyer,
    'ticket_type', v_ticket_type,
    'checked_in_at', v_ticket.checked_in_at
  );
end;
$$;

-- Métricas por fecha para el panel. Se agregan en la DB porque la Data API corta
-- en 1000 filas.
create function public.event_stats()
returns table (event_id uuid, sold integer, checked_in integer, revenue integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'no_autorizado';
  end if;

  return query
  select
    e.id,
    (select count(*)::integer from public.tickets t where t.event_id = e.id and t.status <> 'void'),
    (select count(*)::integer from public.tickets t where t.event_id = e.id and t.status = 'used'),
    (select coalesce(sum(o.total), 0)::integer from public.orders o where o.event_id = e.id and o.status = 'paid')
  from public.events e;
end;
$$;

-- Las funciones nacen ejecutables por PUBLIC: se cierra todo y se abre lo justo.
revoke execute on function
  public.event_stats(),
  public.is_staff(),
  public.ticket_type_taken(uuid),
  public.ticket_availability(),
  public.create_order(uuid, jsonb, text, text, text),
  public.fulfill_order(uuid, text),
  public.check_in(uuid, text)
from public, anon, authenticated;

-- anon también: las policies públicas la evalúan (y para anon da false).
grant execute on function public.is_staff() to anon, authenticated, service_role;
grant execute on function public.ticket_type_taken(uuid) to service_role;
grant execute on function public.ticket_availability() to anon, authenticated, service_role;
grant execute on function public.create_order(uuid, jsonb, text, text, text) to service_role;
grant execute on function public.fulfill_order(uuid, text) to service_role;
grant execute on function public.check_in(uuid, text) to authenticated;
grant execute on function public.event_stats() to authenticated;

/* -------------------------------------------------------------------------- */
/* Grants y RLS                                                                */
/* -------------------------------------------------------------------------- */

grant select on public.events, public.ticket_types to anon, authenticated;
grant select on public.orders, public.order_items, public.tickets, public.staff to authenticated;
grant all on
  public.events,
  public.ticket_types,
  public.orders,
  public.order_items,
  public.tickets,
  public.staff,
  public.subscribers
to service_role;

alter table public.events enable row level security;
alter table public.ticket_types enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.tickets enable row level security;
alter table public.staff enable row level security;
alter table public.subscribers enable row level security;

create policy "Fechas publicadas visibles para todos"
on public.events for select
to anon, authenticated
using (status = 'published' or (select public.is_staff()));

create policy "Lotes activos de fechas publicadas visibles para todos"
on public.ticket_types for select
to anon, authenticated
using (
  (
    active
    and exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id and e.status = 'published'
    )
  )
  or (select public.is_staff())
);

create policy "Staff lee órdenes"
on public.orders for select
to authenticated
using ((select public.is_staff()));

create policy "Staff lee ítems de órdenes"
on public.order_items for select
to authenticated
using ((select public.is_staff()));

create policy "Staff lee entradas"
on public.tickets for select
to authenticated
using ((select public.is_staff()));

create policy "Cada uno ve su fila de staff"
on public.staff for select
to authenticated
using (user_id = (select auth.uid()));
