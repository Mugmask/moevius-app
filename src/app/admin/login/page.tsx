import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Wordmark } from "@/components/brand";
import { getStaff } from "@/lib/staff";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Staff · Moevius", robots: { index: false } };

export default async function LoginPage() {
  const staff = await getStaff();
  if (staff) redirect(staff.role === "admin" ? "/admin" : "/door");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <Wordmark />
      <div className="border-foreground bg-card shadow-hard w-full max-w-sm rounded-3xl border-2 p-8">
        <h1 className="font-display text-3xl tracking-tight uppercase">Staff</h1>
        <p className="text-muted-foreground mt-2 text-sm font-medium">
          Entrá con tu mail y contraseña. Si no tenés cuenta, pedísela al admin.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
