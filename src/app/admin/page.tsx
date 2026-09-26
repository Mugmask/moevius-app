import type { Metadata } from "next";
import Link from "next/link";

import { StaffHeader } from "@/components/staff-header";
import { formatEventDates } from "@/lib/events";
import { PRICE_FORMAT } from "@/lib/format";
import { requireStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ventas · Moevius", robots: { index: false } };

export default async function AdminPage() {
  const staff = await requireStaff(["admin"]);
  const supabase = await createClient();

  // Con la sesión del staff: RLS deja leer también borradores.
  const [events, stats] = await Promise.all([
    supabase
      .from("events")
      .select("*, ticket_types(capacity, active)")
      .neq("status", "archived")
      .order("starts_at"),
    supabase.rpc("event_stats"),
  ]);
  if (events.error) throw events.error;
  if (stats.error) throw stats.error;

  const statsByEvent = new Map(stats.data.map((s) => [s.event_id, s]));
  const rows = events.data.map((event) => {
    const s = statsByEvent.get(event.id);
    return {
      event,
      ...formatEventDates(event),
      capacity: event.ticket_types
        .filter((tt) => tt.active)
        .reduce((acc, tt) => acc + tt.capacity, 0),
      sold: s?.sold ?? 0,
      checkedIn: s?.checked_in ?? 0,
      revenue: s?.revenue ?? 0,
    };
  });

  return (
    <>
      <StaffHeader email={staff.user.email} role={staff.role} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <h1 className="font-display text-5xl tracking-tight uppercase">Ventas</h1>
        <p className="text-muted-foreground mt-2 text-sm font-medium">
          Las fechas y los lotes se cargan desde el dashboard de Supabase (tablas{" "}
          <code>events</code> y <code>ticket_types</code>).
        </p>

        <div className="border-foreground mt-10 overflow-x-auto rounded-2xl border-2">
          <table className="bg-card w-full min-w-[40rem] text-left text-sm">
            <thead className="border-foreground border-b-2 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Vendidas / cupo</th>
                <th className="px-4 py-3 text-right">Ingresaron</th>
                <th className="px-4 py-3 text-right">Recaudado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.event.id} className="border-muted border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/${row.event.slug}`}
                      className="font-bold underline-offset-4 hover:underline"
                    >
                      {row.day} {row.month} {row.year}
                    </Link>
                    <p className="text-muted-foreground text-xs">{row.event.slug}</p>
                  </td>
                  <td className="px-4 py-3">{row.event.status}</td>
                  <td className="px-4 py-3 text-right font-bold">
                    {row.sold} / {row.capacity}
                  </td>
                  <td className="px-4 py-3 text-right">{row.checkedIn}</td>
                  <td className="px-4 py-3 text-right font-bold">
                    {PRICE_FORMAT.format(row.revenue)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted-foreground px-4 py-8 text-center">
                    No hay fechas cargadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
