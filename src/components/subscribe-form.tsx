"use client";

import { useActionState } from "react";

import { subscribe, type SubscribeState } from "@/app/actions";
import { Pill } from "@/components/brand";

const INITIAL: SubscribeState = { status: "idle" };

export function SubscribeForm() {
  const [state, action, pending] = useActionState(subscribe, INITIAL);

  if (state.status === "ok") {
    return (
      <p role="status" className="label-mono text-primary relative mt-8">
        ✓ Listo, te avisamos.
      </p>
    );
  }

  return (
    <form action={action} className="relative mt-8 flex max-w-lg flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="subscribe-email">
          Tu email
        </label>
        <input
          id="subscribe-email"
          name="email"
          type="email"
          required
          placeholder="tumail@ejemplo.com"
          className="border-input bg-foreground/5 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/30 h-12 rounded-full border px-5 text-base font-medium outline-none focus-visible:ring-4 sm:flex-1"
        />
        <Pill type="submit" className="justify-center" disabled={pending}>
          {pending ? "Anotando…" : "Avisame"}
        </Pill>
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-accent text-sm font-semibold">
          {state.message}
        </p>
      )}
    </form>
  );
}
