import { after, type NextRequest } from "next/server";

import { allowUnsignedWebhooks, checkWebhookSignature } from "@/lib/mercadopago";
import { processPayment, sendTicketsEmail } from "@/lib/orders";

/**
 * Notificaciones de Mercado Pago. Las entradas se emiten antes de responder: si
 * algo falla devolvemos 500 y MP reintenta (`fulfill_order` es idempotente). El
 * mail va en `after()` para no demorar la respuesta; si falla se reenvía desde /admin.
 */
export async function POST(request: NextRequest) {
  const url = request.nextUrl;
  const body = (await request.json().catch(() => null)) as {
    type?: string;
    data?: { id?: string | number };
  } | null;

  const type = url.searchParams.get("type") ?? body?.type;
  const dataId = url.searchParams.get("data.id") ?? body?.data?.id?.toString();

  // Otros tópicos (merchant_order, etc.) y el formato IPN viejo (`topic`/`id`) no
  // nos interesan: MP manda el mismo pago también en formato webhook.
  if (type !== "payment" || !dataId) {
    return new Response(null, { status: 200 });
  }

  const requestId = request.headers.get("x-request-id");
  const signature = checkWebhookSignature({
    signature: request.headers.get("x-signature"),
    requestId,
    dataId,
  });
  if (!signature.valid) {
    const allowed = allowUnsignedWebhooks();
    console.warn("webhook mercadopago: firma inválida", {
      paymentId: dataId,
      requestId,
      reason: signature.reason,
      accepted: allowed,
    });
    if (!allowed) return new Response("Firma inválida", { status: 401 });
  }

  try {
    const { orderId, justPaid } = await processPayment(dataId);
    if (orderId && justPaid) {
      after(() =>
        sendTicketsEmail(orderId).catch((err) =>
          console.error("sendTicketsEmail", { orderId, err }),
        ),
      );
    }
  } catch (err) {
    console.error("webhook mercadopago", { paymentId: dataId, err });
    return new Response("Error procesando el pago", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
