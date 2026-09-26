import "server-only";

import { render } from "react-email";

import { TicketEmail } from "@/emails/ticket-email";
import { formatEventDates } from "@/lib/events";
import { sendMail } from "@/lib/mailer";
import { getPayment } from "@/lib/mercadopago";
import { qrPng, ticketUrl } from "@/lib/qr";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/supabase/env";

const ORDER_SELECT =
  "*, event:events(*), tickets(id, code, status, ticket_type:ticket_types(name))" as const;

export async function getOrder(orderId: string) {
  const { data, error } = await createAdminClient()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type OrderWithTickets = NonNullable<Awaited<ReturnType<typeof getOrder>>>;

/**
 * Solo el estado. Es una query distinta a `getOrder` a propósito: Next memoiza los
 * `fetch` idénticos dentro de un render, así que leer la orden, pagarla y volver a
 * llamar `getOrder` devolvería la versión vieja.
 */
export async function getOrderStatus(orderId: string) {
  const { data, error } = await createAdminClient()
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data?.status ?? null;
}

function orderUrl(orderId: string) {
  return `${publicEnv.siteUrl}/orders/${orderId}`;
}

/** Estados de MP que devuelven la plata: las entradas de esa orden dejan de valer. */
const REFUND_STATUSES = new Set(["refunded", "charged_back"]);

/**
 * Consulta el pago a MP (nunca se confía en lo que trae el webhook ni la URL de
 * vuelta) y actúa según su estado:
 * - aprobado y cubre el total → emite las entradas. `justPaid` es true solo la
 *   vez que efectivamente pagó la orden: el que llama manda el mail solo en ese caso.
 * - reembolsado o contracargado → anula las entradas.
 */
export async function processPayment(paymentId: string): Promise<{
  status: string;
  statusDetail?: string;
  orderId?: string;
  justPaid?: boolean;
}> {
  const payment = await getPayment(paymentId);
  if (!payment) {
    // No es un error nuestro: reintentar no lo arregla (ej. notificación simulada).
    console.warn("processPayment: MP no conoce el pago", { paymentId });
    return { status: "payment_not_found" };
  }
  const orderId = payment.external_reference;

  if (orderId && payment.status && REFUND_STATUSES.has(payment.status)) {
    await voidOrderForPayment(orderId, String(payment.id ?? paymentId));
    return { status: payment.status, orderId };
  }

  if (payment.status === "approved" && payment.status_detail === "partially_refunded") {
    // Con un reembolso parcial no sabemos qué entrada anular: queda para hacerlo a mano.
    console.warn("processPayment: reembolso parcial, revisar a mano", { paymentId, orderId });
  }

  if (payment.status !== "approved" || !orderId) {
    return {
      status: payment.status ?? "unknown",
      statusDetail: payment.status_detail,
      orderId: orderId ?? undefined,
    };
  }

  const supabase = createAdminClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, total")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!order) {
    console.error("processPayment: orden inexistente", { paymentId, orderId });
    return { status: "order_not_found" };
  }
  // Tiene que ser en pesos y cubrir el total: la preferencia la armamos nosotros,
  // pero el pago se valida igual contra lo que dice MP.
  if (payment.currency_id !== "ARS" || (payment.transaction_amount ?? 0) < order.total) {
    console.error("processPayment: monto o moneda no coinciden", {
      paymentId,
      orderId,
      paid: payment.transaction_amount,
      currency: payment.currency_id,
      total: order.total,
    });
    return { status: "invalid_amount" };
  }

  const { data: justPaid, error: fulfillError } = await supabase.rpc("fulfill_order", {
    p_order_id: orderId,
    p_mp_payment_id: String(payment.id ?? paymentId),
  });
  if (fulfillError) throw fulfillError;

  return { status: "approved", orderId, justPaid };
}

/**
 * Anula las entradas de la orden, pero solo si se pagó con ESTE pago: si alguien
 * pagó dos veces y le devolvieron el duplicado, las entradas siguen valiendo.
 */
async function voidOrderForPayment(orderId: string, paymentId: string) {
  const supabase = createAdminClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("status, mp_payment_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;

  if (!order || order.status === "refunded") return;
  if (order.status !== "paid" || order.mp_payment_id !== paymentId) {
    console.warn("processPayment: reembolso de un pago que no emitió la orden", {
      orderId,
      paymentId,
      status: order.status,
      orderPaymentId: order.mp_payment_id,
    });
    return;
  }

  const { error: voidError } = await supabase.rpc("void_order", {
    p_order_id: orderId,
    p_mp_payment_id: paymentId,
  });
  if (voidError) throw voidError;
}

export async function sendTicketsEmail(orderId: string) {
  const order = await getOrder(orderId);
  if (!order || order.status !== "paid") {
    throw new Error(`La orden ${orderId} no está pagada`);
  }

  const { day, month, time } = formatEventDates(order.event);
  const tickets = order.tickets
    .filter((t) => t.status !== "void")
    .map((t, i) => ({
      code: t.code,
      ticketType: t.ticket_type.name,
      url: ticketUrl(t.code),
      cid: `qr-${i + 1}`,
    }));

  const html = await render(
    TicketEmail({
      buyerName: order.buyer_name.split(" ")[0] ?? order.buyer_name,
      day,
      month,
      time,
      venue: order.event.venue,
      neighborhood: order.event.neighborhood,
      orderUrl: orderUrl(order.id),
      tickets,
    }),
  );

  const inlineImages = await Promise.all(
    tickets.map(async (t) => ({
      cid: t.cid,
      filename: `entrada-${t.cid}.png`,
      content: await qrPng(t.code),
    })),
  );

  // No hace falta deduplicar: solo manda quien recibió `justPaid` (una vez por orden)
  // o el admin a mano desde /admin.
  await sendMail({
    to: order.buyer_email,
    subject: `Tus entradas para Moevius ${day} ${month}`,
    html,
    inlineImages,
  });

  await createAdminClient()
    .from("orders")
    .update({ email_sent_at: new Date().toISOString() })
    .eq("id", order.id);
}
