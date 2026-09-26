"use client";

import { useActionState } from "react";

import { Field, Pill } from "@/components/brand";

import { sendMagicLink, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, {});

  if (state.sent) {
    return (
      <p className="bg-primary text-primary-foreground mt-6 rounded-2xl px-4 py-3 font-bold">
        Listo: revisá tu mail y abrí el link desde este dispositivo.
      </p>
    );
  }

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <Field id="email" name="email" type="email" label="Email" autoComplete="email" required />
      {state.error && (
        <p role="alert" className="text-sm font-bold">
          {state.error}
        </p>
      )}
      <Pill type="submit" disabled={pending} className="justify-center">
        {pending ? "Mandando…" : "Mandame el link"}
      </Pill>
    </form>
  );
}
