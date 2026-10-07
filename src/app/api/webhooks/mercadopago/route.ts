import { after, type NextRequest } from "next/server";

import { checkWebhookSignature } from "@/lib/mercadopago";
import { processMpOrder, sendTicketsEmailWithRetry } from "@/lib/orders";

/**
 * Notificaciones de Mercado Pago (evento "Order", configurado en el panel de la app:
 * la API de Orders no acepta una URL por orden). Las entradas se emiten antes de
 * responder: si algo falla devolvemos 500 y MP reintenta (`fulfill_order` es
 * idempotente). El mail va en `after()` para no demorar la respuesta, con reintentos;
 * si igual falla, el admin la marca para reenviar.
 */
export async function POST(request: NextRequest) {
  const url = request.nextUrl;
  const body = (await request.json().catch(() => null)) as {
    type?: string;
    data?: { id?: string | number };
  } | null;

  const type = url.searchParams.get("type") ?? body?.type;
  const dataId = url.searchParams.get("data.id") ?? body?.data?.id?.toString();

  // Otros tópicos (payment, merchant_order, etc.) no nos interesan: todo lo que
  // necesitamos está en la orden de MP.
  if (type !== "order" || !dataId) {
    return new Response(null, { status: 200 });
  }

  const requestId = request.headers.get("x-request-id");
  const signature = checkWebhookSignature({
    signature: request.headers.get("x-signature"),
    requestId,
    dataId,
  });
  if (!signature.valid) {
    console.warn("webhook mercadopago: firma inválida", {
      mpOrderId: dataId,
      requestId,
      reason: signature.reason,
    });
    return new Response("Firma inválida", { status: 401 });
  }

  try {
    const { orderId, justPaid } = await processMpOrder(dataId);
    if (orderId && justPaid) {
      after(() => sendTicketsEmailWithRetry(orderId));
    }
  } catch (err) {
    console.error("webhook mercadopago", { mpOrderId: dataId, err });
    return new Response("Error procesando el pago", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
