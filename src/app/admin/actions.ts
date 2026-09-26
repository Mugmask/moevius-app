"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { sendTicketsEmail } from "@/lib/orders";
import { requireStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export type ResendState = { status: "idle" | "ok" | "error"; message?: string };

export async function resendTickets(orderId: string): Promise<ResendState> {
  await requireStaff(["admin"]);
  if (!z.uuid().safeParse(orderId).success) return { status: "error", message: "Orden inválida" };

  try {
    await sendTicketsEmail(orderId);
    return { status: "ok" };
  } catch (err) {
    console.error("resendTickets", { orderId, err });
    return { status: "error", message: "No se pudo mandar" };
  }
}
