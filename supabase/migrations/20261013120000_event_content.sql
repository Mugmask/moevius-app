-- La home pasa a ser una sola fiesta destacada: cada fecha suma su contenido propio
-- (bajada, dirección) y el lineup con horarios. Todo opcional: las fechas que
-- ya existen siguen andando y la página esconde lo que no esté cargado.
--
-- `events.lineup` (solo nombres) queda para el código deployado antes de esto; borrarlo
-- cuando producción lea `event_sets`.

alter table public.events
  add column description text,
  add column address text;

comment on column public.events.title is 'Nombre de la edición. Ej: "Moevius Vol. 13".';
comment on column public.events.description is 'Bajada de la edición. Los saltos de línea separan párrafos.';
comment on column public.events.address is 'Dirección del lugar, tal como se busca en Google Maps.';

-- Un set del lineup. `starts_at` es opcional: sin horario se muestra solo el nombre.
create table public.event_sets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  artist text not null check (length(trim(artist)) > 0),
  starts_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index event_sets_event_id_idx on public.event_sets (event_id);

-- Mismo criterio que el resto: este proyecto tiene default privileges viejos, así que
-- se revoca todo y se da solo lectura.
revoke all on public.event_sets from anon, authenticated;
grant select on public.event_sets to anon, authenticated;
grant all on public.event_sets to service_role;

alter table public.event_sets enable row level security;

create policy "Sets de fechas publicadas visibles para todos"
on public.event_sets for select
to anon, authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_sets.event_id and e.status = 'published'
  )
  or (select public.is_staff())
);
