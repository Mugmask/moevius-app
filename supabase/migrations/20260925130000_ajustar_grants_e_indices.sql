-- Este proyecto todavía tiene los default privileges viejos: anon y authenticated
-- recibieron ALL (incluido TRUNCATE, que RLS no frena) sobre las tablas nuevas.
-- Se revoca todo y se dejan solo los grants del esquema original.

revoke all on
  public.events,
  public.ticket_types,
  public.orders,
  public.order_items,
  public.tickets,
  public.staff,
  public.subscribers
from anon, authenticated;

grant select on public.events, public.ticket_types to anon, authenticated;
grant select on public.orders, public.order_items, public.tickets, public.staff to authenticated;

-- Índices de foreign keys que marcó el advisor de performance.
create index tickets_ticket_type_id_idx on public.tickets (ticket_type_id);
create index tickets_checked_in_by_idx on public.tickets (checked_in_by);
