-- 1. Antiabuso: que nadie pueda acaparar el cupo con reservas que no paga.
--    - Mismo mail + misma fecha: la reserva pendiente anterior se cancela (y libera
--      su cupo) al crear una nueva. Reintentar no bloquea entradas de más.
--    - Misma IP + misma fecha: máximo 3 reservas pendientes vigentes.
-- 2. Reembolsos y contracargos: anulan las entradas de la orden.

alter table public.orders add column client_ip inet;

create index orders_pending_ip_idx on public.orders (event_id, client_ip) where status = 'pending';
create index orders_pending_email_idx on public.orders (event_id, buyer_email) where status = 'pending';

/* -------------------------------------------------------------------------- */
/* create_order con límites                                                   */
/* -------------------------------------------------------------------------- */

drop function public.create_order(uuid, jsonb, text, text, text);

create function public.create_order(
  p_event_id uuid,
  p_items jsonb,
  p_buyer_name text,
  p_buyer_email text,
  p_buyer_dni text,
  p_client_ip inet default null
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
  v_email text := lower(p_buyer_email);
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

  -- Una reserva pendiente por mail y fecha: la nueva reemplaza a la anterior.
  update public.orders
  set status = 'cancelled'
  where event_id = p_event_id and buyer_email = v_email and status = 'pending';

  if p_client_ip is not null and (
    select count(*) from public.orders
    where event_id = p_event_id
      and client_ip = p_client_ip
      and status = 'pending'
      and expires_at > now()
  ) >= 3 then
    raise exception 'demasiadas_reservas';
  end if;

  insert into public.orders (event_id, buyer_name, buyer_email, buyer_dni, client_ip)
  values (p_event_id, p_buyer_name, v_email, p_buyer_dni, p_client_ip)
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

revoke execute on function public.create_order(uuid, jsonb, text, text, text, inet)
from public, anon, authenticated;
grant execute on function public.create_order(uuid, jsonb, text, text, text, inet) to service_role;

/* -------------------------------------------------------------------------- */
/* fulfill_order: también honra órdenes canceladas                            */
/* -------------------------------------------------------------------------- */

-- Una orden cancelada (reemplazada por otra reserva del mismo mail) puede recibir
-- igual un pago que ya estaba en curso en MP. La plata entró: se emiten las entradas.
create or replace function public.fulfill_order(p_order_id uuid, p_mp_payment_id text)
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
  if v_order.status not in ('pending', 'expired', 'cancelled') then
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

/* -------------------------------------------------------------------------- */
/* void_order: reembolso o contracargo                                        */
/* -------------------------------------------------------------------------- */

-- Marca la orden como reembolsada y anula sus entradas válidas (las ya usadas
-- quedan como están: esa persona ya entró). Idempotente: devuelve cuántas entradas
-- anuló en esta llamada. El cupo se libera solo, porque ticket_type_taken solo
-- cuenta órdenes pagadas.
create function public.void_order(p_order_id uuid, p_mp_payment_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_anuladas integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;

  if not found then
    raise exception 'orden_inexistente';
  end if;
  if v_order.status = 'refunded' then
    return 0;
  end if;
  if v_order.status <> 'paid' or v_order.mp_payment_id is distinct from p_mp_payment_id then
    raise exception 'orden_no_reembolsable';
  end if;

  update public.orders set status = 'refunded' where id = p_order_id;

  update public.tickets set status = 'void' where order_id = p_order_id and status = 'valid';
  get diagnostics v_anuladas = row_count;

  return v_anuladas;
end;
$$;

revoke execute on function public.void_order(uuid, text) from public, anon, authenticated;
grant execute on function public.void_order(uuid, text) to service_role;
