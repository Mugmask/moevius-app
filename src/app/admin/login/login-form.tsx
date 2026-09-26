"use client";

import { useActionState } from "react";

import { Field, Pill } from "@/components/brand";

import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <Field
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        defaultValue={state.email}
      />
      <Field
        id="password"
        name="password"
        type="password"
        label="Contraseña"
        autoComplete="current-password"
        required
      />
      {state.error && (
        <p role="alert" className="text-sm font-bold">
          {state.error}
        </p>
      )}
      <Pill type="submit" disabled={pending} className="justify-center">
        {pending ? "Entrando…" : "Entrar"}
      </Pill>
    </form>
  );
}
