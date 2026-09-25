import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StaffHeader } from "@/components/staff-header";
import { formatEventDates } from "@/lib/events";
import { DATE_TIME_FORMAT, PRICE_FORMAT } from "@/lib/format";
import { requireStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";

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
    .maybeSingle();
  if (error) throw error;
  if (!event) notFound();

  let query = supabase
    .from("orders")
    .select("*, tickets(status)")
    .eq("event_id", event.id)
    .in("status", ["paid", "pending", "refunded"])
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
      <StaffHeader email={staff.user.email} role={staff.role} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <h1 className="font-display text-5xl tracking-tight uppercase">
          {day} {month} {year}
        </h1>

        <form className="mt-8 flex max-w-md gap-2">
          <input
            name="q"
            defaultValue={search}
            placeholder="Buscar por mail, nombre o DNI"
            className="border-foreground bg-card h-11 flex-1 rounded-full border-2 px-4 text-sm font-medium"
          />
          <button
            type="submit"
            className="bg-foreground text-background rounded-full px-5 text-sm font-bold"
          >
            Buscar
          </button>
        </form>

        <div className="border-foreground mt-8 overflow-x-auto rounded-2xl border-2">
          <table className="bg-card w-full min-w-[48rem] text-left text-sm">
            <thead className="border-foreground border-b-2 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Comprador</th>
                <th className="px-4 py-3">DNI</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Entradas</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const expired = isReservationExpired(order.expires_at);
                const used = order.tickets.filter((t) => t.status === "used").length;
                return (
                  <tr key={order.id} className="border-muted border-b last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-bold">{order.buyer_name}</p>
                      <p className="text-muted-foreground text-xs">{order.buyer_email}</p>
                    </td>
                    <td className="px-4 py-3">{order.buyer_dni}</td>
                    <td className="px-4 py-3">
                      {order.status === "paid"
                        ? "Pagada"
                        : order.status === "refunded"
                          ? "Reembolsada"
                          : expired
                            ? "Vencida"
                            : "Esperando pago"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {order.status === "paid" ? `${used} / ${order.tickets.length} usadas` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {PRICE_FORMAT.format(order.total)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {DATE_TIME_FORMAT.format(new Date(order.created_at))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {order.status === "paid" && <ResendButton orderId={order.id} />}
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-muted-foreground px-4 py-8 text-center">
                    {search ? "Nada con esa búsqueda." : "Todavía no hay órdenes."}
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

function isReservationExpired(expiresAt: string) {
  return Date.parse(expiresAt) < Date.now();
}
