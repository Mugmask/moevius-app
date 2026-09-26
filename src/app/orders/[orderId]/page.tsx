import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { AutoRefresh } from "@/components/auto-refresh";
import { Pill } from "@/components/brand";
import { MpWallet } from "@/components/mp-wallet";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { TicketView } from "@/components/ticket-view";
import { TIME_FORMAT } from "@/lib/format";
import {
  getOrder,
  getOrderStatus,
  processPayment,
  sendTicketsEmail,
  type OrderWithTickets,
} from "@/lib/orders";

export const metadata: Metadata = {
  title: "Tu compra · Moevius",
  robots: { index: false },
};

/**
 * Mensajes para los rechazos más comunes (`status_detail` de MP). El checklist de
 * calidad pide darle al comprador feedback concreto de por qué no pasó el pago.
 */
const REJECTION_MESSAGES: Record<string, string> = {
  cc_rejected_insufficient_amount: "La tarjeta no tiene fondos suficientes.",
  cc_rejected_bad_filled_security_code: "El código de seguridad no es correcto.",
  cc_rejected_bad_filled_date: "La fecha de vencimiento no es correcta.",
  cc_rejected_bad_filled_other: "Algún dato de la tarjeta no es correcto.",
  cc_rejected_call_for_authorize: "Tenés que autorizar el pago con el banco de tu tarjeta.",
  cc_rejected_card_disabled: "La tarjeta no está activa. Llamá a tu banco para activarla.",
  cc_rejected_duplicated_payment:
    "Ya hiciste un pago igual. Si necesitás pagar de nuevo, usá otro medio.",
  cc_rejected_high_risk: "Mercado Pago no aprobó el pago. Probá con otro medio de pago.",
  cc_rejected_max_attempts: "Llegaste al límite de intentos. Probá con otra tarjeta.",
};
const GENERIC_REJECTION_MESSAGE =
  "Mercado Pago no aprobó el pago. Probá con otra tarjeta o medio de pago.";

export default async function OrderPage({ params, searchParams }: PageProps<"/orders/[orderId]">) {
  const { orderId } = await params;
  if (!z.uuid().safeParse(orderId).success) notFound();

  const status = await getOrderStatus(orderId);
  if (!status) notFound();

  // MP vuelve con ?payment_id=…: si el webhook todavía no llegó, confirmamos el pago
  // desde acá. processPayment lo consulta a la API de MP, no confía en la URL.
  // La orden completa se lee recién después, una sola vez (ver getOrderStatus).
  const { payment_id } = await searchParams;
  let rejection: string | null = null;
  if (status === "pending" && typeof payment_id === "string" && /^\d+$/.test(payment_id)) {
    try {
      const result = await processPayment(payment_id);
      if (result.orderId === orderId) {
        if (result.justPaid) {
          after(() =>
            sendTicketsEmail(orderId).catch((err) =>
              console.error("sendTicketsEmail", { orderId, err }),
            ),
          );
        }
        if (result.status === "rejected") {
          rejection =
            (result.statusDetail && REJECTION_MESSAGES[result.statusDetail]) ||
            GENERIC_REJECTION_MESSAGE;
        }
      }
    } catch (err) {
      // No es grave: el webhook lo va a procesar igual.
      console.error("compra: processPayment", { orderId, payment_id, err });
    }
  }

  const order = await getOrder(orderId);
  if (!order) notFound();

  const expired = isReservationExpired(order);
  const holdUntil = TIME_FORMAT.format(new Date(order.expires_at));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
        {order.status === "paid" ? (
          <>
            <h1 className="font-display text-5xl leading-[0.95] tracking-tight uppercase sm:text-6xl">
              Ya <span className="highlight">estás</span> adentro
            </h1>
            <p className="mt-6 max-w-xl text-lg font-medium">
              Te mandamos {order.tickets.length === 1 ? "la entrada" : "las entradas"} a{" "}
              <strong>{order.buyer_email}</strong>. Si no te llega, revisá spam o mostrá esta página
              en la puerta.
            </p>
            <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {order.tickets.map((ticket) => (
                <li key={ticket.id}>
                  <TicketView
                    event={order.event}
                    ticket={ticket}
                    ticketType={ticket.ticket_type.name}
                    holder={order.buyer_name}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : order.status === "refunded" ? (
          <StatusMessage title="Compra reembolsada">
            <p>
              Te devolvimos el pago de esta compra y las entradas quedaron anuladas. Si creés que es
              un error, escribinos por Instagram con el mail de la compra.
            </p>
          </StatusMessage>
        ) : expired ? (
          <StatusMessage title="Se venció la reserva">
            <p>
              No llegamos a recibir el pago a tiempo y liberamos las entradas. Si te cobraron,
              escribinos por Instagram con el mail de la compra.
            </p>
            <Pill
              className="mt-8"
              nativeButton={false}
              render={<Link href={`/events/${order.event.slug}`} />}
            >
              Volver a comprar
            </Pill>
          </StatusMessage>
        ) : rejection ? (
          <StatusMessage title="No pasó el pago">
            <p>
              {rejection} Tu reserva sigue en pie hasta las <strong>{holdUntil}</strong>.
            </p>
            {order.mp_preference_id && (
              <div className="mt-8 max-w-sm">
                <MpWallet preferenceId={order.mp_preference_id} />
              </div>
            )}
          </StatusMessage>
        ) : (
          <StatusMessage title="Estamos esperando el pago">
            <p>
              Apenas Mercado Pago nos confirme el pago, las entradas aparecen acá y te llegan por
              mail. Si cerraste la ventana sin pagar, podés hacerlo acá hasta las{" "}
              <strong>{holdUntil}</strong>.
            </p>
            {order.mp_preference_id && (
              <div className="mt-8 max-w-sm">
                <MpWallet preferenceId={order.mp_preference_id} />
              </div>
            )}
            <AutoRefresh />
          </StatusMessage>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function isReservationExpired(order: Pick<OrderWithTickets, "status" | "expires_at">) {
  if (order.status === "expired" || order.status === "cancelled") return true;
  return order.status === "pending" && Date.parse(order.expires_at) < Date.now();
}

function StatusMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-5xl leading-[0.95] tracking-tight uppercase sm:text-6xl">
        {title}
      </h1>
      <div className="mt-6 text-lg font-medium">{children}</div>
    </div>
  );
}
