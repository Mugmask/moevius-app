import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

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
      notification_url: `${site}/api/webhooks/mercadopago`,
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

export function getPayment(id: string) {
  return new Payment(config()).get({ id });
}

/**
 * Valida el header `x-signature` de un webhook de MP.
 * Manifest: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, firmado con HMAC-SHA256.
 * https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */
export function verifyWebhookSignature({
  signature,
  requestId,
  dataId,
}: {
  signature: string | null;
  requestId: string | null;
  dataId: string;
}) {
  if (!signature || !requestId) return false;

  const parts = Object.fromEntries(
    signature.split(",").map((part) => {
      const [key, ...value] = part.trim().split("=");
      return [key, value.join("=")];
    }),
  );
  const { ts, v1 } = parts;
  if (!ts || !v1) return false;

  // MP pide pasar el id a minúsculas si es alfanumérico.
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", serverEnv.mpWebhookSecret).update(manifest).digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
