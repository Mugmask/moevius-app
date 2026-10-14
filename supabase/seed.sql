-- Datos para el Supabase local (Docker): corre después de las migraciones en cada
-- `pnpm db:local:reset`. Nunca llega al remoto (`db push` no aplica el seed).
--
-- Una fecha de prueba siempre en el futuro, con su lineup y un solo tipo de entrada (como
-- las primeras fechas reales). Para probar varios lotes o el agotado, sumá filas a
-- `ticket_types` o bajale el `capacity`.

with fecha as (
  insert into public.events (
    slug, title, starts_at, ends_at, venue, neighborhood, lineup, status, is_test,
    description, address
  )
  values (
    'local-test', 'Moevius Vol. 13',
    date_trunc('day', now()) + interval '30 days 23 hours 59 minutes',
    date_trunc('day', now()) + interval '31 days 6 hours',
    'Roddy Club', 'Chacarita, CABA',
    array['FECHA DE PRUEBA', 'LOCAL'],
    'published',
    true,
    'Fecha de prueba para desarrollo local.
Techno, house y lo que pida la pista hasta que prendan las luces.',
    'Av. Corrientes 6271, CABA'
  )
  -- Las filas que inserta un CTE no se ven desde el resto del statement: se pasa
  -- starts_at acá en vez de volver a leer events.
  returning id, starts_at
),
sets as (
  insert into public.event_sets (event_id, artist, starts_at, sort_order)
  select id, s.artist, starts_at + s.offset_time, s.sort_order
  from fecha
  cross join (
    values
      ('Apertura · DJ Trivilín', interval '0 minutes', 0),
      ('La Banda de Prueba', interval '2 hours', 1),
      ('Cierre · Moevius DJs', interval '4 hours', 2)
  ) as s (artist, offset_time, sort_order)
)
insert into public.ticket_types (event_id, name, price, capacity, max_per_order, sort_order)
select id, tier.name, tier.price, tier.capacity, tier.max_per_order, tier.sort_order
from fecha
cross join (
  values
    ('General', 8000, 50, 4, 0)
) as tier (name, price, capacity, max_per_order, sort_order);
