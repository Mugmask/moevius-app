"use server";

import { z } from "zod";

import { getClientIp, verifyTurnstile } from "@/lib/abuse";
import { MAX_PENDING_RESERVATIONS_PER_IP, RESERVATION_MINUTES } from "@/lib/config";
import { TEST_MODE } from "@/lib/environment";
import { getEventBySlug } from "@/lib/events";
import { createCheckout } from "@/lib/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";

type CheckoutValues = {
  ticketTypeId: string;
  quantity: string;
  name: string;
  email: string;
  dni: string;
};

/** Reserva lista para pagar: el cliente manda al comprador a `checkoutUrl` (Mercado Pago). */
export type CheckoutReservation = {
  checkoutUrl: string;
  expiresAt: string;
  quantity: number;
  tierName: string;
  total: number;
};

export type CheckoutState = {
  error?: string;
  values?: CheckoutValues;
  reservation?: CheckoutReservation;
};

const schema = z.object({
  ticketTypeId: z.uuid(),
  quantity: z.coerce.number().int().min(1).max(20),
  // Nombre y apellido por separado: MP los pide como payer.name y payer.surname.
  name: z
    .string()
    .trim()
    .max(80)
    .regex(/^\S{2,}(\s+\S+)+$/, "Poné tu nombre y apellido."),
  email: z.email("Ese mail no parece válido.").trim().toLowerCase(),
  dni: z
    .string()
    .transform((dni) => dni.replace(/\D/g, ""))
    .pipe(z.string().regex(/^\d{7,8}$/, "El DNI tiene que tener 7 u 8 números.")),
});

/** Los errores de `create_order` salen como códigos; acá se traducen para el comprador. */
const DB_ERROR_MESSAGES: Record<string, string> = {
  sold_out: "No quedan entradas suficientes de ese lote. Probá con menos o con otro lote.",
  tier_not_on_sale: "Ese lote ya no está a la venta.",
  invalid_tier: "Ese lote ya no está a la venta.",
  invalid_quantity: "Esa cantidad no está permitida para este lote.",
  event_unavailable: "Esta fecha ya no está a la venta.",
  busy: "Hay mucha gente comprando en este momento. Probá de nuevo en unos segundos.",
  too_many_reservations:
    "Hay varias reservas sin pagar desde tu conexión. Terminá de pagar alguna o esperá unos minutos.",
};

export async function startCheckout(
  slug: string,
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const values: CheckoutValues = {
    ticketTypeId: String(formData.get("ticketTypeId") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    dni: String(formData.get("dni") ?? ""),
  };

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos.", values };
  }
  const input = parsed.data;

  const ip = await getClientIp();
  const token = formData.get("cf-turnstile-response");
  const isHuman = await verifyTurnstile(typeof token === "string" ? token : null, ip);
  if (!isHuman) {
    return { error: "No pudimos verificar que no seas un robot. Probá de nuevo.", values };
  }

  // El lote y el precio salen de la DB, nunca del form.
  const event = await getEventBySlug(slug);
  const tier = event?.tiers.find((t) => t.id === input.ticketTypeId);
  if (!event || !tier) {
    return { error: "Esta fecha o lote ya no está a la venta.", values };
  }

  const supabase = createAdminClient();
  const { data: orderId, error } = await supabase.rpc("create_order", {
    p_event_id: event.id,
    p_items: [{ ticket_type_id: tier.id, quantity: input.quantity }],
    p_buyer_name: input.name,
    p_buyer_email: input.email,
    p_buyer_dni: input.dni,
    p_reservation_minutes: RESERVATION_MINUTES,
    p_max_pending_per_ip: MAX_PENDING_RESERVATIONS_PER_IP,
    p_test_mode: TEST_MODE,
    p_client_ip: ip ?? undefined,
  });
  if (error) {
    // 55P03 = lock_timeout: hay mucha gente reservando el mismo lote a la vez.
    const message =
      error.code === "55P03" ? DB_ERROR_MESSAGES.busy : DB_ERROR_MESSAGES[error.message];
    if (!message) console.error("create_order", error);
    return { error: message ?? "No pudimos reservar tu entrada. Probá de nuevo.", values };
  }

  // El pago se arma con lo que quedó en la orden (precio congelado, titular), no con el
  // form: así un reenvío del mismo pedido produce exactamente la misma orden de MP y la
  // idempotencia de MP devuelve la existente en vez de fallar.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "expires_at, total, buyer_name, buyer_email, buyer_dni, mp_checkout_url, order_items(quantity, unit_price, ticket_type:ticket_types(name))",
    )
    .eq("id", orderId)
    .single();
  if (orderError) throw orderError;

  const reservation = {
    expiresAt: order.expires_at,
    quantity: input.quantity,
    tierName: tier.name,
    total: order.total,
  };

  // Reenvío del form con una reserva vigente: create_order devolvió la misma orden y
  // ya tiene su pago armado.
  if (order.mp_checkout_url) {
    return { values, reservation: { ...reservation, checkoutUrl: order.mp_checkout_url } };
  }

  try {
    const [firstName, ...lastNames] = order.buyer_name.split(/\s+/);
    const checkout = await createCheckout({
      orderId,
      total: order.total,
      reservationMinutes: RESERVATION_MINUTES,
      buyer: {
        firstName,
        lastName: lastNames.join(" "),
        email: order.buyer_email,
        dni: order.buyer_dni,
      },
      items: order.order_items.map((item) => ({
        title: `Moevius ${event.day} ${event.month} · ${item.ticket_type.name}`,
        description: `Entrada ${item.ticket_type.name} · ${event.venue}, ${event.neighborhood} · ${event.time}`,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        eventDate: event.startsAt,
      })),
    });
    const { error: saveError } = await supabase
      .from("orders")
      .update({ mp_order_id: checkout.id, mp_checkout_url: checkout.checkoutUrl })
      .eq("id", orderId);
    // Sin el id de MP guardado la página de la orden no puede consultar el pago.
    if (saveError) throw saveError;

    return { values, reservation: { ...reservation, checkoutUrl: checkout.checkoutUrl } };
  } catch (err) {
    console.error("createCheckout", err);
    // Si otro envío del mismo pedido ya armó el pago, la reserva vale: se usa esa.
    const { data: current } = await supabase
      .from("orders")
      .select("mp_checkout_url")
      .eq("id", orderId)
      .single();
    if (current?.mp_checkout_url) {
      return { values, reservation: { ...reservation, checkoutUrl: current.mp_checkout_url } };
    }
    // Libera el cupo reservado: sin orden de MP no hay forma de pagar esta reserva.
    await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .is("mp_checkout_url", null);
    return { error: "No pudimos conectar con Mercado Pago. Probá de nuevo.", values };
  }
}
