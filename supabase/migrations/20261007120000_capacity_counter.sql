-- Cupo con contador, vencimiento activo de reservas y pagos tardíos sin overselling.
--
-- 1. `ticket_types.taken` = entradas de órdenes `pending` + `paid`. Antes se sumaban
--    todas las order_items del lote en cada compra (y con el lote bloqueado): con
--    mucha gente a la vez eso alargaba el lock y llenaba el pool de PostgREST.
--    El contador lo mantiene un trigger sobre el estado de la orden, así cualquier
--    transición (pago, vencimiento, cancelación, reembolso, borrado) lo ajusta.
-- 2. pg_cron vence las reservas cada minuto: libera el cupo apenas pasa expires_at.
-- 3. `fulfill_order` vuelve a chequear el cupo si el pago llega con la orden ya
--    vencida o cancelada. Si no entra, la orden queda `needs_refund` sin emitir
--    entradas (antes se emitían igual y se vendía de más).
-- 4. `create_order` ya no cancela la reserva pendiente del mismo mail (cualquiera
--    podía liberar la reserva de otro poniendo su mail): si es la misma compra (mail,
--    titular, DNI e items), devuelve esa orden; si no, crea otra.
-- 5. `lock_timeout` en create_order: si el lote está muy disputado, falla rápido
--    (la app pide reintentar) en vez de dejar conexiones colgadas esperando.
--
-- Aplicar con poco tráfico: la inicialización del contador asume que no hay compras
-- en curso.

alter table public.ticket_types add column taken integer not null default 0;
alter table public.ticket_types add constraint ticket_types_taken_check check (taken >= 0);

-- Una orden ocupa cupo mientras está pending o paid (las pending vencidas dejan de
-- ocupar recién cuando el cron las pasa a expired).
create function public.order_holds_capacity(p_status public.order_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_status::text in ('pending', 'paid');
$$;

-- Suma (p_sign = 1) o resta (p_sign = -1) las entradas de una orden al contador de
-- sus lotes. Bloquea los lotes en orden de id, igual que create_order.
create function public.adjust_taken(p_order_id uuid, p_sign integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1
  from public.ticket_types tt
  where tt.id in (select oi.ticket_type_id from public.order_items oi where oi.order_id = p_order_id)
  order by tt.id
  for update;

  update public.ticket_types tt
  set taken = tt.taken + p_sign * oi.quantity
  from public.order_items oi
  where oi.order_id = p_order_id and oi.ticket_type_id = tt.id;
end;
$$;

create function public.orders_track_taken()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if public.order_holds_capacity(old.status) then
      perform public.adjust_taken(old.id, -1);
    end if;
    return old;
  end if;

  if public.order_holds_capacity(old.status) and not public.order_holds_capacity(new.status) then
    perform public.adjust_taken(new.id, -1);
  elsif not public.order_holds_capacity(old.status) and public.order_holds_capacity(new.status) then
    perform public.adjust_taken(new.id, 1);
  end if;
  return new;
end;
$$;

-- En el insert la orden todavía no tiene items: create_order suma el cupo a mano.
-- BEFORE DELETE: los items se borran en cascada y después ya no se pueden contar.
create trigger orders_track_taken_update
after update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function public.orders_track_taken();

create trigger orders_track_taken_delete
before delete on public.orders
for each row
execute function public.orders_track_taken();

-- Vence las reservas cuyo plazo pasó. El trigger devuelve el cupo.
create function public.expire_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expired integer;
begin
  update public.orders
  set status = 'expired'
  where id in (
    select id from public.orders
    where status = 'pending' and expires_at <= now()
    order by id
    for update skip locked
  );
  get diagnostics v_expired = row_count;
  return v_expired;
end;
$$;

-- Recalcula el contador desde las órdenes. Para reparar a mano si algo lo desfasa.
create function public.recount_taken()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ticket_types tt
  set taken = coalesce((
    select sum(oi.quantity)
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.ticket_type_id = tt.id and o.status::text in ('pending', 'paid')
  ), 0);
$$;

-- Inicialización: primero se vencen las reservas viejas (sin trigger todavía no
-- importa, pero así el recuento ya las excluye) y después se cuenta.
alter table public.orders disable trigger orders_track_taken_update;
update public.orders set status = 'expired' where status = 'pending' and expires_at <= now();
alter table public.orders enable trigger orders_track_taken_update;
select public.recount_taken();

create or replace function public.ticket_type_taken(p_ticket_type_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select taken from public.ticket_types where id = p_ticket_type_id;
$$;

create or replace function public.ticket_availability()
returns table (ticket_type_id uuid, capacity integer, available integer)
language sql
stable
security definer
set search_path = ''
as $$
  select tt.id, tt.capacity, greatest(tt.capacity - tt.taken, 0)
  from public.ticket_types tt
  join public.events e on e.id = tt.event_id
  where tt.active and e.status = 'published';
$$;

create or replace function public.create_order(
  p_event_id uuid,
  p_items jsonb,
  p_buyer_name text,
  p_buyer_email text,
  p_buyer_dni text,
  p_reservation_minutes integer,
  p_max_pending_per_ip integer,
  p_client_ip inet default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
set lock_timeout = '3s'
as $$
declare
  v_order_id uuid;
  v_total integer := 0;
  v_row record;
  v_tier public.ticket_types;
  v_email text := lower(p_buyer_email);
  v_items jsonb;
begin
  if p_reservation_minutes is null or p_reservation_minutes not between 1 and 60
    or p_max_pending_per_ip is null or p_max_pending_per_ip < 1 then
    raise exception 'invalid_config';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'invalid_items';
  end if;

  if not exists (
    select 1 from public.events
    where id = p_event_id and status = 'published' and ends_at > now()
  ) then
    raise exception 'event_unavailable';
  end if;

  -- Items normalizados (un renglón por lote, ordenados) para comparar compras.
  select coalesce(jsonb_agg(jsonb_build_object('ticket_type_id', t.ticket_type_id, 'quantity', t.quantity) order by t.ticket_type_id), '[]')
  into v_items
  from (
    select (e ->> 'ticket_type_id')::uuid as ticket_type_id, sum((e ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) e
    group by 1
  ) t;

  -- Misma compra (mail, titular, DNI e items) y reserva vigente: es un reenvío del
  -- form, se devuelve la misma orden (y la app reusa su pago). Si cambió el titular o
  -- el DNI es otra compra: las entradas salen a nombre de quien figura en la orden.
  select o.id into v_order_id
  from public.orders o
  where o.event_id = p_event_id
    and o.buyer_email = v_email
    and o.buyer_name = p_buyer_name
    and o.buyer_dni = p_buyer_dni
    and o.status = 'pending'
    and o.expires_at > now() + interval '2 minutes'
    and (
      select jsonb_agg(jsonb_build_object('ticket_type_id', oi.ticket_type_id, 'quantity', oi.quantity) order by oi.ticket_type_id)
      from public.order_items oi where oi.order_id = o.id
    ) = v_items
  order by o.created_at desc
  limit 1;

  if v_order_id is not null then
    return v_order_id;
  end if;

  if p_client_ip is not null and (
    select count(*) from public.orders
    where event_id = p_event_id
      and client_ip = p_client_ip
      and status = 'pending'
      and expires_at > now()
  ) >= p_max_pending_per_ip then
    raise exception 'too_many_reservations';
  end if;

  insert into public.orders (event_id, buyer_name, buyer_email, buyer_dni, client_ip, expires_at)
  values (
    p_event_id, p_buyer_name, v_email, p_buyer_dni, p_client_ip,
    now() + make_interval(mins => p_reservation_minutes)
  )
  returning id into v_order_id;

  -- Orden fijo por id para que dos transacciones no se bloqueen cruzadas.
  for v_row in
    select (e ->> 'ticket_type_id')::uuid as ticket_type_id, (e ->> 'quantity')::integer as quantity
    from jsonb_array_elements(v_items) e
    order by 1
  loop
    select * into v_tier
    from public.ticket_types
    where id = v_row.ticket_type_id and event_id = p_event_id;

    if not found or not v_tier.active then
      raise exception 'invalid_tier';
    end if;
    if (v_tier.sales_start is not null and now() < v_tier.sales_start)
      or (v_tier.sales_end is not null and now() > v_tier.sales_end) then
      raise exception 'tier_not_on_sale';
    end if;
    if v_row.quantity < 1 or v_row.quantity > v_tier.max_per_order then
      raise exception 'invalid_quantity';
    end if;

    -- Reserva atómica: el lock del lote dura solo lo que queda de esta transacción.
    update public.ticket_types
    set taken = taken + v_row.quantity
    where id = v_tier.id and taken + v_row.quantity <= capacity;
    if not found then
      raise exception 'sold_out';
    end if;

    insert into public.order_items (order_id, ticket_type_id, quantity, unit_price)
    values (v_order_id, v_tier.id, v_row.quantity, v_tier.price);

    v_total := v_total + v_row.quantity * v_tier.price;
  end loop;

  update public.orders set total = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

-- Ahora devuelve qué pasó, para que la app sepa si tiene que reembolsar:
--   fulfilled       se emitieron las entradas
--   already_paid    reintento del mismo pago (idempotente)
--   duplicate_paid  la orden ya estaba pagada con OTRO pago: reembolsar este
--   needs_refund    llegó tarde y el cupo ya no alcanza: reembolsar
drop function public.fulfill_order(uuid, text);

create function public.fulfill_order(p_order_id uuid, p_mp_payment_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;

  if not found then
    raise exception 'order_not_found';
  end if;
  if v_order.status = 'paid' then
    return case when v_order.mp_payment_id = p_mp_payment_id then 'already_paid' else 'duplicate_paid' end;
  end if;
  if v_order.status = 'needs_refund' then
    return case when v_order.mp_payment_id = p_mp_payment_id then 'needs_refund' else 'duplicate_paid' end;
  end if;
  if v_order.status not in ('pending', 'expired', 'cancelled') then
    raise exception 'order_not_payable';
  end if;

  -- Pago tardío: la orden ya no ocupa cupo y puede haberse vendido. Se chequea con
  -- los lotes bloqueados; si entra, el trigger lo vuelve a sumar al pasar a paid.
  if v_order.status <> 'pending' then
    perform 1
    from public.ticket_types tt
    where tt.id in (select oi.ticket_type_id from public.order_items oi where oi.order_id = p_order_id)
    order by tt.id
    for update;

    if exists (
      select 1
      from public.order_items oi
      join public.ticket_types tt on tt.id = oi.ticket_type_id
      where oi.order_id = p_order_id and tt.taken + oi.quantity > tt.capacity
    ) then
      update public.orders
      set status = 'needs_refund', mp_payment_id = p_mp_payment_id
      where id = p_order_id;
      return 'needs_refund';
    end if;
  end if;

  update public.orders
  set status = 'paid', paid_at = now(), mp_payment_id = p_mp_payment_id
  where id = p_order_id;

  insert into public.tickets (order_id, event_id, ticket_type_id)
  select p_order_id, v_order.event_id, oi.ticket_type_id
  from public.order_items oi
  cross join lateral generate_series(1, oi.quantity)
  where oi.order_id = p_order_id;

  return 'fulfilled';
end;
$$;

-- La app marca reembolsada una orden needs_refund después de devolver la plata.
create function public.mark_refunded(p_order_id uuid, p_mp_payment_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.orders
  set status = 'refunded'
  where id = p_order_id and status = 'needs_refund' and mp_payment_id = p_mp_payment_id;
$$;

revoke execute on function public.order_holds_capacity(public.order_status) from public, anon, authenticated;
revoke execute on function public.adjust_taken(uuid, integer) from public, anon, authenticated;
revoke execute on function public.orders_track_taken() from public, anon, authenticated;
revoke execute on function public.expire_reservations() from public, anon, authenticated;
revoke execute on function public.recount_taken() from public, anon, authenticated;
revoke execute on function public.fulfill_order(uuid, text) from public, anon, authenticated;
revoke execute on function public.mark_refunded(uuid, text) from public, anon, authenticated;
grant execute on function public.fulfill_order(uuid, text) to service_role;
grant execute on function public.mark_refunded(uuid, text) to service_role;
grant execute on function public.expire_reservations() to service_role;
grant execute on function public.recount_taken() to service_role;

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule('expire-reservations', '* * * * *', 'select public.expire_reservations()');
