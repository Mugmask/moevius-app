-- Códigos de error y de resultado en inglés (son identificadores que lee la app,
-- no texto para el usuario). La lógica de cada función no cambia.
--
--   create_order:  items_invalidos → invalid_items, fecha_no_disponible → event_unavailable,
--                  lote_invalido → invalid_tier, lote_fuera_de_venta → tier_not_on_sale,
--                  cantidad_invalida → invalid_quantity, sin_cupo → sold_out,
--                  demasiadas_reservas → too_many_reservations
--   fulfill_order: orden_inexistente → order_not_found, orden_no_pagable → order_not_payable
--   void_order:    orden_no_reembolsable → order_not_refundable
--   check_in:      no_autorizado → unauthorized, ya_usada → already_used,
--                  otra_fecha → wrong_event, anulada → void, no_existe → not_found
--   event_stats:   no_autorizado → unauthorized

create or replace function public.create_order(
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
  v_tier public.ticket_types;
  v_email text := lower(p_buyer_email);
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'invalid_items';
  end if;

  if not exists (
    select 1 from public.events
    where id = p_event_id and status = 'published' and ends_at > now()
  ) then
    raise exception 'event_unavailable';
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
    raise exception 'too_many_reservations';
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
    select * into v_tier
    from public.ticket_types
    where id = v_row.ticket_type_id and event_id = p_event_id
    for update;

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
    if public.ticket_type_taken(v_tier.id) + v_row.quantity > v_tier.capacity then
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
    raise exception 'order_not_found';
  end if;
  if v_order.status = 'paid' then
    return false;
  end if;
  if v_order.status not in ('pending', 'expired', 'cancelled') then
    raise exception 'order_not_payable';
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

create or replace function public.void_order(p_order_id uuid, p_mp_payment_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_voided integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;

  if not found then
    raise exception 'order_not_found';
  end if;
  if v_order.status = 'refunded' then
    return 0;
  end if;
  if v_order.status <> 'paid' or v_order.mp_payment_id is distinct from p_mp_payment_id then
    raise exception 'order_not_refundable';
  end if;

  update public.orders set status = 'refunded' where id = p_order_id;

  update public.tickets set status = 'void' where order_id = p_order_id and status = 'valid';
  get diagnostics v_voided = row_count;

  return v_voided;
end;
$$;

create or replace function public.check_in(p_event_id uuid, p_code text)
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
    raise exception 'unauthorized';
  end if;

  update public.tickets
  set status = 'used', checked_in_at = now(), checked_in_by = (select auth.uid())
  where code = p_code and event_id = p_event_id and status = 'valid'
  returning * into v_ticket;

  v_ok := found;

  if not v_ok then
    select * into v_ticket from public.tickets where code = p_code;
    if not found then
      return jsonb_build_object('result', 'not_found');
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
      when v_ticket.event_id <> p_event_id then 'wrong_event'
      when v_ticket.status = 'used' then 'already_used'
      else 'void'
    end,
    'buyer_name', v_buyer,
    'ticket_type', v_ticket_type,
    'checked_in_at', v_ticket.checked_in_at
  );
end;
$$;

create or replace function public.event_stats()
returns table (event_id uuid, sold integer, checked_in integer, revenue integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'unauthorized';
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
