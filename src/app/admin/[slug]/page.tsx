import { ArrowLeft, Pencil, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Pill } from "@/components/brand";
import { StaffHeader } from "@/components/staff-header";
import { AuraBackdrop } from "@/components/aura-backdrop";
import { StaffTitle } from "@/components/staff-page";
import { formatEventDates } from "@/lib/events";
import { DATE_TIME_FORMAT, PRICE_FORMAT } from "@/lib/format";
import { TEST_MODE } from "@/lib/environment";
import { requireStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { ResendButton } from "./resend-button";

export const metadata: Metadata = { title: "Órdenes · Moevius", robots: { index: false } };

export default async function AdminEventPage({ params, searchParams }: PageProps<"/admin/[slug]">) {
  const staff = await requireStaff(["admin"]);
  const { slug } = await params;
  const { q } = await searchParams;
  const search = typeof q === "string" ? q.trim() : "";

  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("is_test", TEST_MODE)
    .maybeSingle();
  if (error) throw error;
  if (!event) notFound();

  let query = supabase
    .from("orders")
    .select("*, tickets(status)")
    .eq("event_id", event.id)
    .in("status", ["paid", "pending", "refunded", "needs_refund"])
    .order("created_at", { ascending: false })
    .limit(500);
  if (search) {
    // Sin comas ni paréntesis: rompen la sintaxis del filtro `or` de PostgREST.
    const sanitized = search.replace(/[,()]/g, " ");
    query = query.or(
      `buyer_email.ilike.%${sanitized}%,buyer_name.ilike.%${sanitized}%,buyer_dni.ilike.%${sanitized}%`,
    );
  }
  const { data: orders, error: ordersError } = await query;
  if (ordersError) throw ordersError;

  const { day, month, year } = formatEventDates(event);
  return (
    <>
      <StaffHeader email={staff.user.email} role={staff.role} current="ventas" />
      <main className="relative isolate mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16 sm:px-6">
        <AuraBackdrop />
        <Link
          href="/admin"
          className="label-mono text-muted-foreground hover:text-foreground mb-4 inline-flex min-h-11 items-center gap-2 transition-colors"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Ventas
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <StaffTitle label={`Órdenes · ${event.slug}`}>
            {day} {month.slice(0, 3)} <span className="text-muted-foreground">{year}</span>
          </StaffTitle>
          <Link
            href={`/admin/${event.slug}/edit`}
            className="border-foreground/30 hover:border-foreground focus-visible:ring-foreground/30 inline-flex h-12 items-center gap-2 rounded-full border-2 px-5 text-sm font-semibold tracking-tight outline-none focus-visible:ring-4"
          >
            <Pencil aria-hidden className="size-4" />
            Editar fecha
          </Link>
        </div>

        <form role="search" className="mt-8 flex max-w-lg gap-2">
          <label htmlFor="order-search" className="sr-only">
            Buscar por mail, nombre o DNI
          </label>
          <div className="relative flex-1">
            <Search
              aria-hidden
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2"
            />
            <input
              id="order-search"
              name="q"
              type="search"
              defaultValue={search}
              placeholder="Mail, nombre o DNI"
              className="border-input bg-foreground/5 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/30 h-12 w-full rounded-full border pr-4 pl-11 text-base font-medium outline-none focus-visible:ring-4"
            />
          </div>
          <Pill type="submit">Buscar</Pill>
        </form>

        {/* Las órdenes en un recibo largo: una por renglón, separadas por el troquel. */}
        <div className="bg-paper paper-crumple text-ink mt-8 px-4 py-2 shadow-[0_18px_30px_oklch(0_0_0/0.5)] sm:px-6">
          {orders.length === 0 ? (
            <p className="py-10 text-center font-mono text-sm uppercase opacity-60">
              {search ? "Nada con esa búsqueda." : "Todavía no hay órdenes."}
            </p>
          ) : (
            <ul className="divide-ink/25 divide-y-2 divide-dashed">
              {orders.map((order) => {
                const status = orderStatus(order.status, isReservationExpired(order.expires_at));
                const used = order.tickets.filter((t) => t.status === "used").length;
                return (
                  <li
                    key={order.id}
                    className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6"
                  >
                    <div className="min-w-0">
                      <p className="font-display font-stretch-condensed text-2xl leading-tight font-extrabold break-words">
                        {order.buyer_name}
                      </p>
                      <p className="mt-0.5 text-sm break-all opacity-70">{order.buyer_email}</p>
                      <p className="mt-1 font-mono text-xs tracking-[0.1em] uppercase opacity-60">
                        DNI {order.buyer_dni} ·{" "}
                        {DATE_TIME_FORMAT.format(new Date(order.created_at))}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs uppercase sm:justify-end">
                      <span
                        className={cn(
                          "rounded-full border-2 px-2 py-0.5 font-bold tracking-[0.1em]",
                          status.tone === "ok" && "border-ink bg-ink text-paper",
                          status.tone === "wait" && "border-ink/40",
                          status.tone === "alert" && "border-accent text-accent",
                        )}
                      >
                        {status.label}
                      </span>
                      {order.status === "paid" && (
                        <span className="tabular-nums opacity-70">
                          {used}/{order.tickets.length} usadas
                        </span>
                      )}
                      <span className="font-display font-stretch-condensed text-2xl leading-none font-extrabold tabular-nums normal-case">
                        {PRICE_FORMAT.format(order.total)}
                      </span>
                      {/* Los reintentos automáticos fallaron: hay que reenviar a mano. */}
                      {order.status === "paid" && !order.email_sent_at && (
                        <span className="text-accent font-bold">Mail sin enviar</span>
                      )}
                      {order.status === "paid" && <ResendButton orderId={order.id} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}

function isReservationExpired(expiresAt: string) {
  return Date.parse(expiresAt) < Date.now();
}

/** Cómo se lee el estado de la orden en el admin, y con qué tono se marca. */
function orderStatus(
  status: string,
  expired: boolean,
): { label: string; tone: "ok" | "wait" | "alert" } {
  if (status === "paid") return { label: "Pagada", tone: "ok" };
  if (status === "refunded") return { label: "Reembolsada", tone: "alert" };
  if (status === "needs_refund")
    return { label: "Pagó tarde, sin cupo: reembolsando", tone: "alert" };
  return expired ? { label: "Vencida", tone: "wait" } : { label: "Esperando pago", tone: "wait" };
}
