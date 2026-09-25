import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Wordmark } from "@/components/brand";
import { getStaff } from "@/lib/staff";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Staff · Moevius", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const staff = await getStaff();
  if (staff) redirect(staff.role === "admin" ? "/admin" : "/door");

  const { error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <Wordmark />
      <div className="border-foreground bg-card shadow-hard w-full max-w-sm rounded-3xl border-2 p-8">
        <h1 className="font-display text-3xl tracking-tight uppercase">Staff</h1>
        <p className="text-muted-foreground mt-2 text-sm font-medium">
          Te mandamos un link al mail para entrar. Solo funciona con mails dados de alta.
        </p>
        {error && (
          <p role="alert" className="bg-muted mt-4 rounded-2xl px-4 py-3 text-sm font-bold">
            El link venció o ya se usó. Pedí uno nuevo.
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
