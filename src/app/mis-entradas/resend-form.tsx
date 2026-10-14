"use client";

import { ArrowUpRight } from "lucide-react";
import { useActionState } from "react";

import { INK_BUTTON, PaperField } from "@/components/paper-slip";
import { Turnstile } from "@/components/turnstile";

import { resendTickets, type ResendState } from "./actions";

const INITIAL: ResendState = { status: "idle" };

/** Pide el mail de la compra y reenvía las entradas ahí. */
export function ResendForm() {
  const [state, action, pending] = useActionState(resendTickets, INITIAL);

  if (state.status === "sent") {
    return (
      <p role="status" className="border-ink rounded-lg border-2 border-dashed p-4">
        Si hay entradas compradas con <strong>{state.email}</strong>, te llegan en un minuto. Revisá
        también spam. Si te las mandamos hace un rato, esperá unos minutos antes de pedirlas de
        nuevo.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <PaperField
        label="Email de la compra"
        id="resend-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="vos@mail.com"
      />
      <Turnstile theme="light" resetKey={state} />
      {state.status === "error" && (
        <p role="alert" className="text-accent text-sm font-semibold">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className={INK_BUTTON}>
        {pending ? "Enviando…" : "Mandámelas"}
        <ArrowUpRight aria-hidden className="text-primary size-5" />
      </button>
    </form>
  );
}
