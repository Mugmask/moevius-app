import "server-only";

import {
  InvalidWebhookSignatureError,
  MercadoPagoConfig,
  MPNotFoundError,
  Order,
  WebhookSignatureValidator,
} from "mercadopago";

import { serverEnv } from "@/lib/env.server";
import { publicEnv } from "@/lib/supabase/env";

function config() {
  return new MercadoPagoConfig({ accessToken: serverEnv.mpAccessToken });
}

// Un `Order` nuevo por llamada: el SDK guarda los `requestOptions` (la clave de
// idempotencia) en la instancia y los arrastraría a la siguiente orden.
function orders() {
  return new Order(config());
}

type CheckoutInput = {
  orderId: string;
  /** El total de la orden en la DB (precio congelado por create_order). */
  total: number;
  reservationMinutes: number;
  buyer: { firstName: string; lastName: string; email: string; dni: string };
  items: {
    title: string;
    description: string;
    quantity: number;
    unitPrice: number;
    eventDate: string;
  }[];
};

const amount = (pesos: number) => pesos.toFixed(2);

/**
 * Crea la orden de Checkout Pro (API de Orders) y devuelve a dónde mandar al
 * comprador. Los campos siguen el checklist de calidad de MP y los datos de industria
 * "Tickets y entretenimiento" (category_id, event_date, datos del comprador).
 *
 * El webhook no se puede pasar por orden: se configura en el panel de la app de MP
 * (evento "Order"). La página de la orden igual consulta a MP, así que la compra
 * se completa aunque el webhook no llegue (ej. en un preview).
 */
export async function createCheckout({
  orderId,
  total,
  reservationMinutes,
  buyer,
  items,
}: CheckoutInput) {
  const returnUrl = `${publicEnv.siteUrl}/orders/${orderId}`;

  const order = await orders().create({
    body: {
      type: "online",
      processing_mode: "manual",
      external_reference: orderId,
      total_amount: amount(total),
      // Lo mismo que la reserva. MP no corta el pago justo a tiempo: si llega tarde,
      // fulfill_order re-chequea el cupo.
      expiration_time: `PT${reservationMinutes}M`,
      payer: {
        email: buyer.email,
        first_name: buyer.firstName,
        last_name: buyer.lastName,
        identification: { type: "DNI", number: buyer.dni },
      },
      // Sin external_code: MP lo limita a 30 caracteres y los ids de lote son UUIDs.
      items: items.map((item) => ({
        title: item.title,
        description: item.description,
        category_id: "tickets",
        event_date: item.eventDate,
        quantity: item.quantity,
        unit_price: amount(item.unitPrice),
      })),
      config: {
        statement_descriptor: "MOEVIUS",
        online: {
          success_url: returnUrl,
          pending_url: returnUrl,
          failure_url: returnUrl,
          // MP rechaza auto_return si la URL de vuelta no es https (ej. localhost).
          ...(returnUrl.startsWith("https://") && { auto_return: "approved" }),
          // Si rechazan la tarjeta, que pueda probar con otra en el mismo checkout (sin
          // esto el primer rechazo cierra la orden de MP).
          retries: { allowed: true },
        },
        // Efectivo (Rapipago, Pago Fácil) queda pendiente días: no encaja con una
        // reserva de minutos.
        payment_method: { not_allowed_types: ["ticket", "atm"] },
      },
    },
    // La misma orden nuestra nunca crea dos órdenes en MP.
    requestOptions: { idempotencyKey: orderId },
  });

  if (!order.id || !order.checkout_url) {
    throw new Error("Mercado Pago no devolvió la orden");
  }
  return { id: order.id, checkoutUrl: order.checkout_url };
}

/** La orden según MP, o null si MP dice que no existe (ej. una notificación simulada). */
export async function getMpOrder(id: string) {
  try {
    return await orders().get({ id });
  } catch (err) {
    if (err instanceof MPNotFoundError) return null;
    throw err;
  }
}

export type MpOrder = NonNullable<Awaited<ReturnType<typeof getMpOrder>>>;

/**
 * Reembolsa la orden de MP completa. La clave de idempotencia es por orden: si el
 * webhook se reintenta, MP no reembolsa dos veces.
 */
export async function refundMpOrder(id: string) {
  return orders().refund({ id, requestOptions: { idempotencyKey: `refund-${id}` } });
}

export type WebhookSignatureCheck = { valid: true } | { valid: false; reason: string };

/**
 * Valida el header `x-signature` de un webhook con el validador oficial del SDK.
 * Devuelve el motivo del rechazo para loguearlo (ej. `SignatureMismatch` = el
 * secreto no es el de la app que mandó la notificación: con credenciales de prueba
 * es el de la app del vendedor de test).
 * https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/notifications
 */
export function checkWebhookSignature({
  signature,
  requestId,
  dataId,
}: {
  signature: string | null;
  requestId: string | null;
  dataId: string;
}): WebhookSignatureCheck {
  try {
    WebhookSignatureValidator.validate({
      xSignature: signature,
      xRequestId: requestId,
      // MP pide pasar el id a minúsculas (los de Orders vienen como ORD…) y el SDK
      // no lo hace.
      dataId: dataId.toLowerCase(),
      secret: serverEnv.mpWebhookSecret,
    });
    return { valid: true };
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) return { valid: false, reason: err.reason };
    throw err;
  }
}
