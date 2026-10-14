"use client";

import { ArrowUpRight } from "lucide-react";
import { useActionState } from "react";

import { INK_BUTTON, PaperField } from "@/components/paper-slip";
import { Turnstile } from "@/components/turnstile";
import { cn } from "@/lib/utils";

import { requestWithdrawal, type WithdrawalState } from "./actions";

/** El pedido de arrepentimiento: los datos de la compra y, al mandarlo, el código. */
export function WithdrawalForm() {
  const [state, formAction, pending] = useActionState<WithdrawalState, FormData>(
    requestWithdrawal,
    {},
  );

  if (state.code) {
    return (
      <div role="status" className="border-ink mt-8 border-2 p-5 sm:p-6">
        <p className="font-mono text-xs font-bold tracking-[0.2em] uppercase opacity-60">
          Pedido recibido · tu código de trámite
        </p>
        <p className="font-display font-stretch-condensed mt-2 text-4xl font-extrabold tabular-nums sm:text-5xl">
          {state.code}
        </p>
        <p className="mt-3">
          Te mandamos una constancia por mail con este código. Guardalo: te vamos a escribir para
          confirmarte la devolución.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4">
      <PaperField
        id="name"
        name="name"
        label="Nombre y apellido"
        autoComplete="name"
        required
        defaultValue={state.values?.name}
      />
      <PaperField
        id="email"
        name="email"
        type="email"
        label="Email de la compra"
        hint="El mismo con el que compraste: ahí te llega la constancia."
        placeholder="vos@mail.com"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
      />
      <PaperField
        id="dni"
        name="dni"
        label="DNI"
        placeholder="12.345.678"
        inputMode="numeric"
        autoComplete="off"
        pattern="[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}"
        maxLength={10}
        title="7 u 8 números, con o sin puntos."
        required
        defaultValue={state.values?.dni}
      />
      <PaperField
        id="order"
        name="order"
        label="Compra (opcional)"
        hint="El link de tu compra o el código de la entrada, si lo tenés a mano."
        autoComplete="off"
        maxLength={80}
        defaultValue={state.values?.order}
      />

      {/* Token nuevo por intento: cada respuesta del server (state) resetea el widget. */}
      <div className="empty:hidden">
        <Turnstile resetKey={state} theme="light" compact />
      </div>

      {state.error && (
        <p
          role="alert"
          className="border-accent bg-accent/10 border-l-4 px-3 py-2 text-sm font-semibold"
        >
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={cn(INK_BUTTON, "mt-2")}>
        {pending ? "Enviando…" : "Arrepentirme de la compra"}
        {!pending && <ArrowUpRight aria-hidden className="text-primary size-5" />}
      </button>
    </form>
  );
}
