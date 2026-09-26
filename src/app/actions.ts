"use server";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

export type SubscribeState = { status: "idle" | "ok" | "error"; message?: string };

export async function subscribe(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const parsed = z.email().safeParse(
    String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!parsed.success) {
    return { status: "error", message: "Ese mail no parece válido." };
  }

  // upsert con ignoreDuplicates: suscribirse dos veces no es un error para el usuario.
  const { error } = await createAdminClient()
    .from("subscribers")
    .upsert({ email: parsed.data }, { onConflict: "email", ignoreDuplicates: true });

  if (error) {
    console.error("subscribe", error);
    return { status: "error", message: "No pudimos anotarte. Probá de nuevo en un rato." };
  }
  return { status: "ok" };
}
