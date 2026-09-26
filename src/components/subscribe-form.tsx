"use client";

import { useActionState } from "react";

import { subscribe, type SubscribeState } from "@/app/actions";
import { Pill } from "@/components/brand";

const INITIAL: SubscribeState = { status: "idle" };

export function SubscribeForm() {
  const [state, action, pending] = useActionState(subscribe, INITIAL);

  if (state.status === "ok") {
    return (
      <p className="font-display text-primary-foreground relative mt-10 text-2xl uppercase">
        Listo, te avisamos.
      </p>
    );
  }

  return (
    <form action={action} className="relative mx-auto mt-10 flex max-w-lg flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="email">
          Tu email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="tumail@ejemplo.com"
          className="border-foreground bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-foreground h-12 flex-1 rounded-full border-2 px-5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        />
        <Pill type="submit" className="justify-center" disabled={pending}>
          {pending ? "Anotando…" : "Avisame"}
        </Pill>
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-primary-foreground text-sm font-bold">
          {state.message}
        </p>
      )}
    </form>
  );
}
