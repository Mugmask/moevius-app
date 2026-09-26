import "server-only";

import { redirect } from "next/navigation";

import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type StaffRole = Tables<"staff">["role"];

/** Usuario logueado + su rol, o null si no hay sesión o no es staff. */
export async function getStaff() {
  const supabase = await createClient();
  // getUser valida el token contra Supabase Auth; getSession solo lee la cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: staff } = await supabase
    .from("staff")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!staff) return null;

  return { user, role: staff.role };
}

/**
 * Para páginas y Server Actions. Llamarla en cada una: un layout protegido no
 * alcanza, porque una action se puede invocar con un POST directo.
 */
export async function requireStaff(roles: StaffRole[] = ["admin", "door"]) {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  if (!roles.includes(staff.role)) redirect("/door");
  return staff;
}
