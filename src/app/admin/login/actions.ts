"use server";

import { z } from "zod";

import { publicEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { sent?: boolean; error?: string };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = z.email().safeParse(
    String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!email.success) return { error: "Ese mail no parece válido." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: {
      // Los usuarios de staff se crean a mano en el dashboard: nadie se autoregistra.
      shouldCreateUser: false,
      emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=/admin`,
    },
  });

  // Con shouldCreateUser: false, un mail desconocido da error. No lo contamos para
  // no revelar qué mails son de staff.
  if (error && error.status !== 400 && error.status !== 422) {
    console.error("signInWithOtp", error);
    return { error: "No pudimos mandar el link. Probá de nuevo en un rato." };
  }
  return { sent: true };
}
