-- Las reglas de negocio (minutos de reserva, reservas pendientes por IP) dejan de
-- estar escritas acá y llegan como parámetros desde `src/lib/config.ts`, así la UI y
-- la base usan el mismo valor. Sin defaults a propósito: si no se pasan, falla.

-- `create_order` es el único que inserta órdenes y ahora setea expires_at explícito.
alter table public.orders alter column expires_at drop default;

drop function public.create_order(uuid, jsonb, text, text, text, inet);

create function public.create_order(
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
as $$
declare
  v_order_id uuid;
  v_total integer := 0;
  v_row record;
  v_tier public.ticket_types;
  v_email text := lower(p_buyer_email);
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

revoke execute on function public.create_order(uuid, jsonb, text, text, text, integer, integer, inet)
from public, anon, authenticated;
grant execute on function public.create_order(uuid, jsonb, text, text, text, integer, integer, inet)
to service_role;
