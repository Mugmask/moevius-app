"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; email?: string };

/**
 * Login de staff con mail + contraseña. Las cuentas y contraseñas las damos de alta
 * nosotros (`pnpm staff:set`): no hay registro ni recuperación por mail.
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawEmail = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const email = z.email().safeParse(rawEmail);
  if (!email.success) return { error: "Ese mail no parece válido.", email: rawEmail };

  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Poné tu contraseña.", email: email.data };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error) {
    if (error.code !== "invalid_credentials") console.error("signInWithPassword", error);
    return {
      error:
        error.code === "over_request_rate_limit"
          ? "Demasiados intentos. Esperá unos minutos."
          : "Mail o contraseña incorrectos.",
      email: email.data,
    };
  }

  // Cualquier usuario de Auth puede tener contraseña: solo pasa si es staff.
  const staff = await getStaff();
  if (!staff) {
    await supabase.auth.signOut();
    return { error: "Esta cuenta no tiene acceso al staff.", email: email.data };
  }

  redirect(staff.role === "admin" ? "/admin" : "/door");
}
