import "server-only";

import {
  InvalidWebhookSignatureError,
  MercadoPagoConfig,
  MPNotFoundError,
  Payment,
  Preference,
  WebhookSignatureValidator,
} from "mercadopago";

import { serverEnv } from "@/lib/env.server";
import { publicEnv } from "@/lib/supabase/env";

function config() {
  return new MercadoPagoConfig({ accessToken: serverEnv.mpAccessToken });
}

type PreferenceInput = {
  orderId: string;
  expiresAt: string;
  buyer: { firstName: string; lastName: string; email: string; dni: string };
  items: {
    id: string;
    title: string;
    description: string;
    quantity: number;
    unitPrice: number;
    eventDate: string;
  }[];
};

/**
 * Crea la preferencia de Checkout Pro. Los campos siguen el checklist de calidad de
 * MP y los datos de industria "Tickets y entretenimiento" (category_id, event_date,
 * datos del comprador): mejoran la tasa de aprobación.
 */
export async function createPreference({ orderId, expiresAt, buyer, items }: PreferenceInput) {
  const site = publicEnv.siteUrl;
  const returnUrl = `${site}/orders/${orderId}`;

  const preference = await new Preference(config()).create({
    body: {
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        category_id: "tickets",
        event_date: item.eventDate,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        currency_id: "ARS",
      })),
      payer: {
        name: buyer.firstName,
        surname: buyer.lastName,
        email: buyer.email,
        identification: { type: "DNI", number: buyer.dni },
      },
      external_reference: orderId,
      notification_url: webhookUrl(site),
      back_urls: { success: returnUrl, pending: returnUrl, failure: returnUrl },
      // MP rechaza auto_return si la URL de vuelta no es https (ej. localhost).
      ...(site.startsWith("https://") && { auto_return: "approved" }),
      // La reserva de cupo dura lo mismo que la preferencia.
      expires: true,
      expiration_date_to: expiresAt,
      // Efectivo (Rapipago, Pago Fácil) queda pendiente días: no encaja con una
      // reserva de minutos.
      payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }] },
      // Aprobado o rechazado al instante, sin estados "en proceso" que puedan
      // resolverse después de que venció la reserva.
      binary_mode: true,
      statement_descriptor: "MOEVIUS",
    },
    requestOptions: { idempotencyKey: orderId },
  });

  if (!preference.id) {
    throw new Error("Mercado Pago no devolvió la preferencia");
  }
  return { id: preference.id };
}

/**
 * En los previews de Vercel la protección de deploys le devolvería 401 a MP. Si el
 * proyecto tiene "Protection Bypass for Automation", Vercel expone el secreto en
 * `VERCEL_AUTOMATION_BYPASS_SECRET` y va en la URL para que el webhook pase.
 */
function webhookUrl(site: string) {
  const url = new URL(`${site}/api/webhooks/mercadopago`);
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypass) url.searchParams.set("x-vercel-protection-bypass", bypass);
  return url.toString();
}

/** El pago según MP, o null si MP dice que no existe (ej. una notificación simulada). */
export async function getPayment(id: string) {
  try {
    return await new Payment(config()).get({ id });
  } catch (err) {
    if (err instanceof MPNotFoundError) return null;
    throw err;
  }
}

export type WebhookSignatureCheck = { valid: true } | { valid: false; reason: string };

/**
 * Valida el header `x-signature` de un webhook con el validador oficial del SDK.
 * Devuelve el motivo del rechazo para loguearlo (ej. `SignatureMismatch` = el
 * secreto no es el de la app que mandó la notificación).
 * https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
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
      // MP pide pasar el id a minúsculas si es alfanumérico.
      dataId: dataId.toLowerCase(),
      secret: serverEnv.mpWebhookSecret,
    });
    return { valid: true };
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) return { valid: false, reason: err.reason };
    throw err;
  }
}

/**
 * Si se aceptan notificaciones con firma inválida. Solo en previews de Vercel o en
 * `next dev`, y solo con `MP_WEBHOOK_ALLOW_UNSIGNED=true`: con las credenciales de
 * prueba MP firma con el secreto de la app del vendedor de test, no con el nuestro.
 * Es seguro porque el webhook nunca confía en el body: relee el pago en la API de MP.
 * En producción no aplica aunque la variable esté seteada por error.
 */
export function allowUnsignedWebhooks() {
  const nonProduction =
    process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV === "development";
  return nonProduction && process.env.MP_WEBHOOK_ALLOW_UNSIGNED === "true";
}
