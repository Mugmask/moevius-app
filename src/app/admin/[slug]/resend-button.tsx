"use client";

import { useState, useTransition } from "react";

import { resendTickets, type ResendState } from "@/app/admin/actions";

export function ResendButton({ orderId }: { orderId: string }) {
  const [state, setState] = useState<ResendState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending || state.status === "ok"}
      onClick={() => startTransition(async () => setState(await resendTickets(orderId)))}
      className="border-ink hover:bg-ink hover:text-paper inline-flex min-h-9 items-center rounded-full border-2 px-3 font-mono text-xs font-bold tracking-[0.1em] whitespace-nowrap uppercase transition-colors disabled:opacity-60"
    >
      {pending
        ? "Mandando…"
        : state.status === "ok"
          ? "Enviado"
          : state.status === "error"
            ? (state.message ?? "Error")
            : "Reenviar mail"}
    </button>
  );
}
