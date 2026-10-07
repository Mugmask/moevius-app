-- Datos para el Supabase local (Docker): corre después de las migraciones en cada
-- `pnpm db:local:reset`. Nunca llega al remoto (`db push` no aplica el seed).
--
-- Una fecha de prueba siempre en el futuro, con dos lotes: uno chico para probar el
-- agotado y uno normal.

with fecha as (
  insert into public.events (slug, title, starts_at, ends_at, venue, neighborhood, lineup, status, is_test)
  values (
    'local-test', 'Moevius Local',
    date_trunc('day', now()) + interval '30 days 23 hours 59 minutes',
    date_trunc('day', now()) + interval '31 days 6 hours',
    'Roddy Club', 'Chacarita, CABA',
    array['FECHA DE PRUEBA', 'LOCAL'],
    'published',
    true
  )
  returning id
)
insert into public.ticket_types (event_id, name, price, capacity, max_per_order, sort_order)
select id, tier.name, tier.price, tier.capacity, tier.max_per_order, tier.sort_order
from fecha
cross join (
  values
    ('Preventa', 8000, 2, 2, 0),
    ('General', 10000, 50, 4, 1)
) as tier (name, price, capacity, max_per_order, sort_order);
