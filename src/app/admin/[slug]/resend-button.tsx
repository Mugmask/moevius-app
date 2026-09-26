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
      className="border-foreground hover:bg-muted rounded-full border-2 px-3 py-1 text-xs font-bold whitespace-nowrap disabled:opacity-60"
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
