"use client";

import { ArrowUpRight } from "lucide-react";
import { useActionState } from "react";

import { INK_BUTTON, PaperField } from "@/components/paper-slip";

import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <PaperField
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        defaultValue={state.email}
      />
      <PaperField
        id="password"
        name="password"
        type="password"
        label="Contraseña"
        autoComplete="current-password"
        required
      />
      {state.error && (
        <p role="alert" className="text-accent text-sm font-semibold">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={INK_BUTTON}>
        {pending ? "Entrando…" : "Entrar"}
        <ArrowUpRight aria-hidden className="text-primary size-5" />
      </button>
    </form>
  );
}
