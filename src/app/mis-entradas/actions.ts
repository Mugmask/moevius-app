"use server";

import { after } from "next/server";
import { z } from "zod";

import { getClientIp, verifyTurnstile } from "@/lib/abuse";
import { resendTicketsForEmail } from "@/lib/orders";

export type ResendState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

/**
 * Reenvía las entradas al mail. La respuesta es siempre la misma, haya compras o no, y
 * el envío va después de responder (`after`): ni el texto ni la demora dicen si ese mail
 * compró.
 */
export async function resendTickets(_prev: ResendState, formData: FormData): Promise<ResendState> {
  const parsed = z.email().safeParse(
    String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!parsed.success) {
    return { status: "error", message: "Ese mail no parece válido." };
  }

  const ip = await getClientIp();
  const token = formData.get("cf-turnstile-response");
  const isHuman = await verifyTurnstile(typeof token === "string" ? token : null, ip);
  if (!isHuman) {
    return {
      status: "error",
      message: "No pudimos verificar que no seas un robot. Probá de nuevo.",
    };
  }

  const email = parsed.data;
  after(() =>
    resendTicketsForEmail(email).catch((err) => console.error("resendTicketsForEmail", err)),
  );
  return { status: "sent", email };
}
