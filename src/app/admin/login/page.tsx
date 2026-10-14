import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PaperSlip } from "@/components/paper-slip";
import { getStaff } from "@/lib/staff";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Staff · Moevius", robots: { index: false } };

/** El login del staff, en el mismo papel que las demás pantallas sueltas. */
export default async function LoginPage() {
  const staff = await getStaff();
  if (staff) redirect(staff.role === "admin" ? "/admin" : "/door");

  return (
    <main className="flex flex-1 flex-col">
      <PaperSlip label="Staff" title="Entrá al panel" seed="staff">
        <p>Entrá con tu mail y contraseña. Si no tenés cuenta, pedísela al admin.</p>
        <LoginForm />
      </PaperSlip>
    </main>
  );
}
