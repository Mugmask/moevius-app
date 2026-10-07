-- Fechas de prueba en la misma base que producción.
--
-- Staging y producción comparten el proyecto de Supabase (el plan gratis no da para
-- otro). Para que las compras de prueba no se mezclen con las reales:
--   - events.is_test marca las fechas de prueba.
--   - Producción (VERCEL_ENV=production) solo muestra y vende fechas reales; staging,
--     previews y local, solo fechas de prueba. La app filtra y create_order lo exige
--     con p_test_mode, así que ni por error una compra de prueba ocupa cupo real.

alter table public.events add column is_test boolean not null default false;

comment on column public.events.is_test is
  'Fecha de prueba: solo se ve y se vende fuera de producción (staging, previews, local).';

-- Las fechas cargadas hasta ahora son todas de prueba.
update public.events set is_test = true where slug in ('mvs-test', 'mvs-012', 'mvs-013');

-- create_order nuevo, con p_test_mode. El viejo (sin ese parámetro) queda por ahora:
-- lo usa el código deployado antes de esta migración. Se borra en una migración
-- posterior junto con orders.mp_preference_id.

create function public.create_order(
  p_event_id uuid,
  p_items jsonb,
  p_buyer_name text,
  p_buyer_email text,
  p_buyer_dni text,
  p_reservation_minutes integer,
  p_max_pending_per_ip integer,
  p_test_mode boolean,
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
    or p_max_pending_per_ip is null or p_max_pending_per_ip < 1 or p_test_mode is null then
    raise exception 'invalid_config';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'invalid_items';
  end if;

  if not exists (
    select 1 from public.events
    where id = p_event_id and status = 'published' and ends_at > now()
      -- Staging solo vende fechas de prueba y producción solo reales: una compra de
      -- prueba nunca toca el cupo de una fecha real (comparten base).
      and is_test = p_test_mode
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


revoke execute on function public.create_order(uuid, jsonb, text, text, text, integer, integer, boolean, inet)
from public, anon, authenticated;
grant execute on function public.create_order(uuid, jsonb, text, text, text, integer, integer, boolean, inet)
to service_role;
