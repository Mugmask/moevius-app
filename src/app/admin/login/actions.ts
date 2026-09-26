"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getStaff } from "@/lib/staff";
import { publicEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { sent?: boolean; error?: string; email?: string };

/**
 * Login de staff. El form tiene dos botones y `intent` dice cuál se tocó:
 * - `password`: mail + contraseña. No manda mails, así que no lo frena el límite
 *   del SMTP por defecto de Supabase.
 * - `link`: magic link por mail (para cuando haya SMTP propio).
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawEmail = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const email = z.email().safeParse(rawEmail);
  if (!email.success) return { error: "Ese mail no parece válido.", email: rawEmail };

  return formData.get("intent") === "link"
    ? sendMagicLink(email.data)
    : signInWithPassword(email.data, String(formData.get("password") ?? ""));
}

async function signInWithPassword(email: string, password: string): Promise<LoginState> {
  if (!password) return { error: "Poné tu contraseña.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code !== "invalid_credentials") console.error("signInWithPassword", error);
    return {
      error:
        error.code === "over_request_rate_limit"
          ? "Demasiados intentos. Esperá unos minutos."
          : "Mail o contraseña incorrectos.",
      email,
    };
  }

  // Cualquier usuario de Auth puede tener contraseña: solo pasa si es staff.
  const staff = await getStaff();
  if (!staff) {
    await supabase.auth.signOut();
    return { error: "Esta cuenta no tiene acceso al staff.", email };
  }

  redirect(staff.role === "admin" ? "/admin" : "/door");
}

async function sendMagicLink(email: string): Promise<LoginState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Los usuarios de staff se crean a mano en el dashboard: nadie se autoregistra.
      shouldCreateUser: false,
      emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=/admin`,
    },
  });

  if (error?.code === "over_email_send_rate_limit") {
    return {
      error: "Se pidieron muchos links seguidos. Esperá unos minutos o entrá con tu contraseña.",
      email,
    };
  }
  // Con shouldCreateUser: false, un mail desconocido da error. No lo contamos para
  // no revelar qué mails son de staff.
  if (error && error.status !== 400 && error.status !== 422) {
    console.error("signInWithOtp", error);
    return { error: "No pudimos mandar el link. Probá de nuevo en un rato.", email };
  }
  return { sent: true };
}
