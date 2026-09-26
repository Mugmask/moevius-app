"use client";

import { useActionState } from "react";

import { Field, Pill } from "@/components/brand";

import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  if (state.sent) {
    return (
      <p className="bg-primary text-primary-foreground mt-6 rounded-2xl px-4 py-3 font-bold">
        Listo: revisá tu mail y abrí el link desde este dispositivo.
      </p>
    );
  }

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
      {/* Sin `required`: el botón del link no necesita contraseña. Lo valida el server. */}
      <Field
        id="password"
        name="password"
        type="password"
        label="Contraseña"
        autoComplete="current-password"
      />
      {state.error && (
        <p role="alert" className="text-sm font-bold">
          {state.error}
        </p>
      )}
      <Pill
        type="submit"
        name="intent"
        value="password"
        disabled={pending}
        className="justify-center"
      >
        {pending ? "Entrando…" : "Entrar"}
      </Pill>
      <button
        type="submit"
        name="intent"
        value="link"
        disabled={pending}
        className="text-muted-foreground text-sm font-bold underline-offset-4 hover:underline disabled:opacity-50"
      >
        Sin contraseña: mandame un link por mail
      </button>
    </form>
  );
}
