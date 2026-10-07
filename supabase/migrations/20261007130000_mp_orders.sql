-- Checkout Pro pasa de la API de Preferencias a la de Orders.
--
-- mp_order_id      la orden de MP (ORD…) que paga esta orden. external_reference = orders.id.
-- mp_checkout_url  a dónde se redirige al comprador para pagar (se reusa si reintenta).
-- mp_synced_at     última vez que la página de la orden consultó a MP. La página se
--                  refresca sola mientras espera el pago: con esto consulta a MP como
--                  mucho cada unos segundos por orden, no en cada refresh.
-- mp_status        último estado de la orden de MP que vimos (created, processing,
--                  processed, …).
-- mp_payment_detail status del último intento de pago y su detalle ("failed:…").
--                  La página lee estos dos de acá: aunque no le toque consultar a MP
--                  (throttle), sabe si el pago está en revisión o lo rechazaron.
--
-- mp_preference_id deja de usarse, pero no se borra todavía: el código deployado antes
-- de esta migración (staging, previews) todavía la lee. Se borra en una migración
-- posterior, cuando todo lo deployado use Orders.

alter table public.orders add column mp_order_id text unique;
alter table public.orders add column mp_checkout_url text;
alter table public.orders add column mp_synced_at timestamptz;
alter table public.orders add column mp_status text;
alter table public.orders add column mp_payment_detail text;

-- Reserva el turno de consultar a MP por esta orden. Devuelve false si alguien lo
-- hizo hace menos de p_min_seconds (otro refresh, otra pestaña, el webhook).
create function public.claim_mp_sync(p_order_id uuid, p_min_seconds integer)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with claimed as (
    update public.orders
    set mp_synced_at = now()
    where id = p_order_id
      and (mp_synced_at is null or mp_synced_at < now() - make_interval(secs => p_min_seconds))
    returning 1
  )
  select exists (select 1 from claimed);
$$;

revoke execute on function public.claim_mp_sync(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_mp_sync(uuid, integer) to service_role;
