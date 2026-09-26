"use server";

import { z } from "zod";

import { requireStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";

/** Lo que devuelve `check_in` en la DB. Se valida: es jsonb, el tipo no lo garantiza. */
const checkInResponseSchema = z.object({
  result: z.enum(["ok", "already_used", "wrong_event", "void", "not_found"]),
  buyer_name: z.string().nullish(),
  ticket_type: z.string().nullish(),
  checked_in_at: z.string().nullish(),
});

export type CheckInResult =
  | z.infer<typeof checkInResponseSchema>
  | { result: "error"; buyer_name?: undefined; ticket_type?: undefined; checked_in_at?: undefined };

/**
 * Acepta la URL completa del QR (`…/tickets/<code>`) o el código pelado, así el
 * input manual sirve para las dos cosas.
 */
function extractCode(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/\/tickets\/([\w-]+)\/?$/);
  return match ? match[1] : trimmed;
}

export async function checkIn(eventId: string, scanned: string): Promise<CheckInResult> {
  await requireStaff();

  const code = extractCode(scanned);
  if (!z.uuid().safeParse(eventId).success || !/^[\w-]{16,32}$/.test(code)) {
    return { result: "not_found" };
  }

  // Con la sesión del staff: check_in usa auth.uid() para registrar quién validó.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in", { p_event_id: eventId, p_code: code });
  if (error) {
    console.error("check_in", error);
    return { result: "error" };
  }

  const parsed = checkInResponseSchema.safeParse(data);
  if (!parsed.success) {
    console.error("check_in: respuesta inesperada", { data, issues: parsed.error.issues });
    return { result: "error" };
  }
  return parsed.data;
}
