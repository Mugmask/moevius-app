import "server-only";

import { render } from "react-email";

import { TicketEmail } from "@/emails/ticket-email";
import { formatEventDates } from "@/lib/events";
import { sendMail } from "@/lib/mailer";
import { getMpOrder, refundMpOrder } from "@/lib/mercadopago";
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
    .select("status, mp_order_id, expires_at")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function orderUrl(orderId: string) {
  return `${publicEnv.siteUrl}/orders/${orderId}`;
}

/** Estados de la orden de MP que devuelven la plata: las entradas dejan de valer. */
const REFUND_STATUSES = new Set(["refunded", "charged_back"]);

export type MpSyncResult = {
  /** paid | waiting | processing | rejected | refunded | refunded_no_capacity | … */
  status: string;
  statusDetail?: string;
  orderId?: string;
  /** true solo la vez que efectivamente pagó la orden: el que llama manda el mail. */
  justPaid?: boolean;
};

/**
 * Consulta la orden a MP (nunca se confía en lo que trae el webhook ni la URL de
 * vuelta) y actúa según su estado:
 * - procesada y cubre el total → emite las entradas. Si llegó tarde y ya no hay
 *   cupo, o la pagó otra orden de MP, se reembolsa solo.
 * - reembolsada o contracargada → anula las entradas.
 * - en revisión, rechazada o sin pagar → solo guarda el estado (lo muestra la página).
 */
export async function processMpOrder(mpOrderId: string): Promise<MpSyncResult> {
  const mpOrder = await getMpOrder(mpOrderId);
  if (!mpOrder) {
    // No es un error nuestro: reintentar no lo arregla (ej. notificación simulada).
    console.warn("processMpOrder: MP no conoce la orden", { mpOrderId });
    return { status: "mp_order_not_found" };
  }
  const orderId = mpOrder.external_reference;
  if (!orderId) return { status: "no_external_reference" };

  const supabase = createAdminClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, total, mp_order_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!order) {
    console.error("processMpOrder: orden inexistente", { mpOrderId, orderId });
    return { status: "order_not_found" };
  }

  // Con reintentos puede haber varios intentos: vale el procesado, si hay; si no, el último.
  const payments = mpOrder.transactions?.payments ?? [];
  const payment = payments.find((p) => p.status === "processed") ?? payments.at(-1);
  const paymentId = payment?.id;

  // Solo de la orden de MP que armamos nosotros: así la página sabe si el pago está en
  // revisión o lo rechazaron aunque no le toque consultar a MP.
  if (mpOrderId === order.mp_order_id) {
    const { error: statusError } = await supabase
      .from("orders")
      .update({
        mp_status: mpOrder.status ?? null,
        mp_payment_detail: payment ? `${payment.status}:${payment.status_detail ?? ""}` : null,
      })
      .eq("id", orderId);
    if (statusError) throw statusError;
  }

  if (mpOrder.status && REFUND_STATUSES.has(mpOrder.status)) {
    if (paymentId) await voidOrderForPayment(orderId, paymentId);
    return { status: "refunded", orderId };
  }

  if (mpOrder.status_detail === "partially_refunded") {
    // Con un reembolso parcial no sabemos qué entrada anular: queda para hacerlo a mano.
    console.warn("processMpOrder: reembolso parcial, revisar a mano", { mpOrderId, orderId });
  }

  if (mpOrder.status === "processing") {
    // Pago en revisión (ej. pending_review_manual): MP avisa cuando se resuelve.
    return { status: "processing", statusDetail: mpOrder.status_detail, orderId };
  }
  if (mpOrder.status !== "processed" || !paymentId) {
    const rejected = payment?.status === "failed" || mpOrder.status === "failed";
    return rejected
      ? { status: "rejected", statusDetail: payment?.status_detail, orderId }
      : { status: "waiting", statusDetail: mpOrder.status, orderId };
  }

  // Tiene que ser en pesos y cubrir el total: la orden de MP la armamos nosotros,
  // pero el pago se valida igual contra lo que dice MP. Si no cubre, no hay entradas
  // y se devuelve lo cobrado.
  if (mpOrder.currency !== "ARS" || Number(mpOrder.total_paid_amount ?? 0) < order.total) {
    console.error("processMpOrder: monto o moneda no coinciden, se reembolsa", {
      mpOrderId,
      orderId,
      paid: mpOrder.total_paid_amount,
      currency: mpOrder.currency,
      total: order.total,
    });
    await refundMpOrder(mpOrderId);
    return { status: "invalid_amount", orderId };
  }

  const { data: outcome, error: fulfillError } = await supabase.rpc("fulfill_order", {
    p_order_id: orderId,
    p_mp_payment_id: paymentId,
  });
  if (fulfillError) throw fulfillError;

  switch (outcome) {
    case "fulfilled":
      return { status: "paid", orderId, justPaid: true };
    case "already_paid":
      return { status: "paid", orderId, justPaid: false };
    case "duplicate_paid":
      // La orden ya está pagada con otro pago. Si este viene de OTRA orden de MP se
      // devuelve esa entera. Si es de la nuestra, reembolsarla devolvería también el
      // pago que emitió las entradas: no pasa con un solo pago procesado por orden,
      // pero si pasa, se revisa a mano.
      if (mpOrderId !== order.mp_order_id) {
        console.error("processMpOrder: pago duplicado, se reembolsa", { orderId, mpOrderId });
        await refundMpOrder(mpOrderId);
      } else {
        console.error("processMpOrder: dos pagos en la misma orden de MP, revisar a mano", {
          orderId,
          mpOrderId,
          paymentId,
        });
      }
      return { status: "paid", orderId, justPaid: false };
    case "needs_refund":
      // Pagó con la reserva vencida y el cupo ya se vendió: no hay entradas para dar.
      console.error("processMpOrder: pago tardío sin cupo, se reembolsa", { orderId, mpOrderId });
      await refundMpOrder(mpOrderId);
      await markRefunded(orderId, paymentId);
      return { status: "refunded_no_capacity", orderId };
    default:
      throw new Error(`fulfill_order devolvió algo inesperado: ${outcome}`);
  }
}

/**
 * Para la página de la orden: si todavía espera el pago, le pregunta a MP. Es lo que
 * completa la compra cuando el webhook no llega (previews) o se demora. Como la página
 * se refresca sola, consulta a MP como mucho cada `MP_SYNC_SECONDS` por orden.
 */
export async function syncOrderWithMp(orderId: string, mpOrderId: string) {
  const { data: claimed, error } = await createAdminClient().rpc("claim_mp_sync", {
    p_order_id: orderId,
    p_min_seconds: MP_SYNC_SECONDS,
  });
  if (error) throw error;
  if (!claimed) return null;
  return processMpOrder(mpOrderId);
}

const MP_SYNC_SECONDS = 5;

async function markRefunded(orderId: string, paymentId: string) {
  const { error } = await createAdminClient().rpc("mark_refunded", {
    p_order_id: orderId,
    p_mp_payment_id: paymentId,
  });
  if (error) throw error;
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
  // Reembolso que hicimos nosotros por pago tardío: solo falta marcarla.
  if (order.status === "needs_refund" && order.mp_payment_id === paymentId) {
    await markRefunded(orderId, paymentId);
    return;
  }
  if (order.status !== "paid" || order.mp_payment_id !== paymentId) {
    console.warn("processMpOrder: reembolso de un pago que no emitió la orden", {
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

/**
 * Para después de un pago: el SMTP falla de forma transitoria (timeouts, límites por
 * minuto de Gmail), así que reintenta con espera antes de rendirse. Si igual falla,
 * la orden queda sin `email_sent_at` y el admin la marca para reenviar a mano.
 */
export async function sendTicketsEmailWithRetry(orderId: string) {
  const delaysMs = [0, 3_000, 10_000];
  for (const [attempt, delay] of delaysMs.entries()) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      return await sendTicketsEmail(orderId);
    } catch (err) {
      console.error("sendTicketsEmail", { orderId, attempt: attempt + 1, err });
    }
  }
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
