import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { AutoRefresh } from "@/components/auto-refresh";
import { Pill } from "@/components/brand";
import { MpPayButton } from "@/components/mp-pay-button";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { TicketView } from "@/components/ticket-view";
import { TIME_FORMAT } from "@/lib/format";
import {
  getOrder,
  getOrderStatus,
  syncOrderWithMp,
  sendTicketsEmailWithRetry,
  type OrderWithTickets,
} from "@/lib/orders";

export const metadata: Metadata = {
  title: "Tu compra · Moevius",
  robots: { index: false },
};

/**
 * Mensajes para los rechazos (`transactions.payments[].status_detail` de la API de
 * Orders, que no usa los `cc_rejected_*` de Payments). El checklist de calidad pide
 * darle al comprador feedback concreto de por qué no pasó el pago.
 */
const REJECTION_MESSAGES: Record<string, string> = {
  card_insufficient_amount: "La tarjeta no tiene fondos suficientes.",
  amount_limit_exceeded: "El monto supera el límite de la tarjeta.",
  bad_filled_card_data: "Algún dato de la tarjeta no es correcto.",
  required_call_for_authorize: "Tenés que autorizar el pago con el banco de tu tarjeta.",
  card_disabled: "La tarjeta no está activa. Llamá a tu banco para activarla.",
  rejected_by_issuer: "El banco de tu tarjeta rechazó el pago. Probá con otra.",
  high_risk: "Mercado Pago no aprobó el pago. Probá con otro medio de pago.",
  max_attempts_exceeded: "Llegaste al límite de intentos. Probá con otra tarjeta.",
  invalid_installments: "Esa cantidad de cuotas no está disponible. Probá con otra.",
};

/**
 * Cuánto después de vencida la reserva se sigue consultando a MP desde esta página. MP
 * aprueba pagos tardíos (la orden de MP no corta justo a tiempo); pasado esto, una
 * reserva abandonada no vuelve a costar una consulta a MP por visita.
 */
const LATE_PAYMENT_WINDOW_MS = 2 * 60 * 60 * 1000;

const GENERIC_REJECTION_MESSAGE =
  "Mercado Pago no aprobó el pago. Probá con otra tarjeta o medio de pago.";

export default async function OrderPage({ params }: PageProps<"/orders/[orderId]">) {
  const { orderId } = await params;
  if (!z.uuid().safeParse(orderId).success) notFound();

  const current = await getOrderStatus(orderId);
  if (!current) notFound();

  // Si todavía espera el pago, le preguntamos a MP por la orden que armamos (nunca se
  // confía en los parámetros de la URL de vuelta). Es lo que completa la compra si el
  // webhook no llega o se demora. También con la reserva vencida, por un rato: MP
  // aprueba pagos tardíos y, si todavía hay cupo, valen. La orden completa se lee
  // después (ver getOrderStatus).
  const awaitingPayment =
    current.status === "pending" ||
    ((current.status === "expired" || current.status === "cancelled") &&
      withinLatePaymentWindow(current.expires_at));
  if (awaitingPayment && current.mp_order_id) {
    try {
      const result = await syncOrderWithMp(orderId, current.mp_order_id);
      if (result?.justPaid) {
        after(() => sendTicketsEmailWithRetry(orderId));
      }
    } catch (err) {
      // No es grave: el webhook lo va a procesar igual.
      console.error("compra: syncOrderWithMp", { orderId, err });
    }
  }

  const order = await getOrder(orderId);
  if (!order) notFound();

  // El estado de MP sale de la orden (lo guarda processMpOrder), no del resultado de
  // esta consulta: con el throttle, la mayoría de los refresh no consultan a MP.
  const inReview = order.mp_status === "processing";
  const [paymentStatus, paymentDetail] = order.mp_payment_detail?.split(":") ?? [];
  const rejection =
    order.mp_status !== "processed" && paymentStatus === "failed"
      ? (paymentDetail && REJECTION_MESSAGES[paymentDetail]) || GENERIC_REJECTION_MESSAGE
      : null;
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
        ) : inReview ? (
          <StatusMessage title="Estamos revisando tu pago">
            <p>
              Mercado Pago está revisando el pago. Suele resolverse en minutos: apenas se apruebe,
              las entradas aparecen acá y te llegan por mail. No hace falta que pagues de nuevo.
            </p>
            <AutoRefresh />
          </StatusMessage>
        ) : order.status === "needs_refund" ||
          (order.status === "refunded" && order.paid_at === null) ? (
          // Pagó con la reserva vencida y el cupo ya se había vendido.
          <StatusMessage title="Se agotó mientras pagabas">
            <p>
              El pago llegó cuando tu reserva ya había vencido y no quedaban entradas. Te devolvemos
              la plata completa a tu medio de pago (según el medio, puede tardar unos días en
              verse).
            </p>
            <Pill
              className="mt-8"
              nativeButton={false}
              render={<Link href={`/events/${order.event.slug}`} />}
            >
              Ver la fecha
            </Pill>
          </StatusMessage>
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
            {order.mp_checkout_url && (
              <div className="mt-8 max-w-sm">
                <MpPayButton checkoutUrl={order.mp_checkout_url} />
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
            {order.mp_checkout_url && (
              <div className="mt-8 max-w-sm">
                <MpPayButton checkoutUrl={order.mp_checkout_url} />
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

function withinLatePaymentWindow(expiresAt: string) {
  return Date.now() - Date.parse(expiresAt) < LATE_PAYMENT_WINDOW_MS;
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
