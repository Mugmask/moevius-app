"use server";

import { z } from "zod";

import { getClientIp, verifyTurnstile } from "@/lib/abuse";
import { MAX_PENDING_RESERVATIONS_PER_IP, RESERVATION_MINUTES } from "@/lib/config";
import { getEventBySlug } from "@/lib/events";
import { createPreference } from "@/lib/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";

type CheckoutValues = {
  ticketTypeId: string;
  quantity: string;
  name: string;
  email: string;
  dni: string;
};

/** Reserva lista para pagar: el cliente renderiza el Wallet Brick con `preferenceId`. */
export type CheckoutReservation = {
  preferenceId: string;
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
  const [firstName, ...lastNames] = input.name.split(/\s+/);

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
    p_client_ip: ip ?? undefined,
  });
  if (error) {
    const message = DB_ERROR_MESSAGES[error.message];
    if (!message) console.error("create_order", error);
    return { error: message ?? "No pudimos reservar tu entrada. Probá de nuevo.", values };
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("expires_at, total")
    .eq("id", orderId)
    .single();
  if (orderError) throw orderError;

  try {
    const preference = await createPreference({
      orderId,
      expiresAt: order.expires_at,
      buyer: { firstName, lastName: lastNames.join(" "), email: input.email, dni: input.dni },
      items: [
        {
          id: tier.id,
          title: `Moevius ${event.day} ${event.month} · ${tier.name}`,
          description: `Entrada ${tier.name} · ${event.venue}, ${event.neighborhood} · ${event.time}`,
          quantity: input.quantity,
          unitPrice: tier.price,
          eventDate: event.startsAt,
        },
      ],
    });
    await supabase.from("orders").update({ mp_preference_id: preference.id }).eq("id", orderId);

    return {
      values,
      reservation: {
        preferenceId: preference.id,
        expiresAt: order.expires_at,
        quantity: input.quantity,
        tierName: tier.name,
        total: order.total,
      },
    };
  } catch (err) {
    console.error("createPreference", err);
    // Libera el cupo reservado: sin preferencia no hay forma de pagar esta orden.
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    return { error: "No pudimos conectar con Mercado Pago. Probá de nuevo.", values };
  }
}
