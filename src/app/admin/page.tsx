import { ArrowUpRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StaffHeader } from "@/components/staff-header";
import { AuraBackdrop } from "@/components/aura-backdrop";
import { StaffTitle } from "@/components/staff-page";
import { formatEventDates } from "@/lib/events";
import { TEST_MODE } from "@/lib/environment";
import { PRICE_FORMAT } from "@/lib/format";
import { requireStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

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
      .eq("is_test", TEST_MODE)
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
      <StaffHeader email={staff.user.email} role={staff.role} current="ventas" />
      <main className="relative isolate mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-16 sm:px-6">
        <AuraBackdrop />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <StaffTitle label="Admin">Ventas</StaffTitle>
          <Link
            href="/admin/new"
            className="bg-primary text-primary-foreground hover:bg-primary/85 focus-visible:ring-primary/40 inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold tracking-tight outline-none focus-visible:ring-4"
          >
            <Plus aria-hidden className="size-4" />
            Nueva fecha
          </Link>
        </div>

        {rows.length === 0 ? (
          <p className="label-mono text-muted-foreground mt-12">No hay fechas cargadas.</p>
        ) : (
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => {
              const soldShare = row.capacity > 0 ? Math.min(row.sold / row.capacity, 1) : 0;
              return (
                <li key={row.event.id}>
                  {/* Cada fecha, un recibo: toda la tarjeta lleva a sus órdenes. */}
                  <Link
                    href={`/admin/${row.event.slug}`}
                    className="group bg-paper paper-crumple text-ink focus-visible:ring-primary/50 relative block px-5 pt-5 pb-6 font-mono text-[0.8125rem] uppercase shadow-[0_18px_30px_oklch(0_0_0/0.5)] transition-transform outline-none hover:-translate-y-1 focus-visible:ring-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="tracking-[0.15em] opacity-60">{row.event.slug}</span>
                      <span
                        className={cn(
                          "rounded-full border-2 px-2 py-0.5 text-[0.6875rem] font-bold tracking-[0.1em]",
                          row.event.status === "published"
                            ? "border-ink bg-ink text-paper"
                            : "border-ink/40",
                        )}
                      >
                        {EVENT_STATUS[row.event.status] ?? row.event.status}
                      </span>
                    </div>
                    <p className="font-display font-stretch-condensed mt-3 text-4xl leading-[0.9] font-extrabold">
                      <span className="bg-highlighter/80 box-decoration-clone px-1">
                        {row.day} {row.month.slice(0, 3)}
                      </span>{" "}
                      <span className="opacity-40">{row.year}</span>
                    </p>

                    <dl className="border-ink mt-5 border-t-2 border-dashed pt-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="opacity-60">Vendidas</dt>
                        <dd className="font-bold tabular-nums">
                          {row.sold} / {row.capacity}
                        </dd>
                      </div>
                      <div aria-hidden className="bg-ink/15 mt-2 h-2 overflow-hidden rounded-full">
                        <div
                          className="bg-ink h-full rounded-full"
                          style={{ width: `${soldShare * 100}%` }}
                        />
                      </div>
                      <div className="mt-3 flex items-baseline justify-between gap-3">
                        <dt className="opacity-60">Ingresaron</dt>
                        <dd className="font-bold tabular-nums">{row.checkedIn}</dd>
                      </div>
                      <div className="border-ink mt-4 flex items-baseline justify-between gap-3 border-t-2 pt-3">
                        <dt className="font-bold tracking-[0.15em]">Recaudado</dt>
                        <dd className="font-display font-stretch-condensed text-3xl leading-none font-extrabold tabular-nums">
                          {PRICE_FORMAT.format(row.revenue)}
                        </dd>
                      </div>
                    </dl>
                    <ArrowUpRight
                      aria-hidden
                      className="absolute right-4 bottom-4 size-5 opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}

const EVENT_STATUS: Record<string, string> = {
  published: "Publicada",
  draft: "Borrador",
};
