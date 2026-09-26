-- Fechas iniciales, las que estaban hardcodeadas en la landing. Las dos próximas se
-- corrieron a octubre y noviembre de 2026 para que haya algo en venta; la de marzo
-- queda archivada como historial.

with nuevas as (
  insert into public.events (slug, title, starts_at, ends_at, venue, neighborhood, lineup, status)
  values
    (
      'mvs-011', 'Moevius Marzo',
      '2026-03-07 23:59-03', '2026-03-08 06:00-03',
      'Roddy Club', 'Chacarita, CABA',
      array['DOBLE V', 'LA PIBA DEL SUR', 'MOEVIUS DJS'],
      'archived'
    ),
    (
      'mvs-012', 'Moevius Octubre',
      '2026-10-10 23:59-03', '2026-10-11 06:00-03',
      'Roddy Club', 'Chacarita, CABA',
      array['LORD GOBLIN', 'FISTORM', 'KCHE', 'TYNKA'],
      'published'
    ),
    (
      'mvs-013', 'Moevius Noviembre',
      '2026-11-14 23:59-03', '2026-11-15 06:00-03',
      'Roddy Club', 'Villa Crespo, CABA',
      array['TBA', 'TBA', 'MOEVIUS DJS'],
      'published'
    )
  returning id, slug
)
insert into public.ticket_types (event_id, name, price, capacity)
select
  id,
  'General',
  case slug when 'mvs-011' then 9000 when 'mvs-012' then 12000 else 10000 end,
  300
from nuevas;
