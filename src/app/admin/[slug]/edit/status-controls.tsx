"use client";

import { useActionState } from "react";

import { setEventStatusAction, type EventFormState } from "@/app/admin/event-actions";
import type { Tables } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const STATUS_COPY: Record<Tables<"events">["status"], string> = {
  draft: "Borrador: no aparece en la web.",
  published: "Publicada: está a la venta en la web.",
  archived: "Archivada.",
};

const BUTTON =
  "label-mono inline-flex min-h-11 items-center rounded-full border-2 px-4 font-bold transition-colors disabled:opacity-50";

/** Estado de la fecha y los botones para publicarla, pasarla a borrador o archivarla. */
export function StatusControls({
  eventId,
  status,
}: {
  eventId: string;
  status: Tables<"events">["status"];
}) {
  const [state, action, pending] = useActionState<EventFormState, FormData>(
    setEventStatusAction,
    {},
  );

  return (
    <form
      action={action}
      className="border-border bg-card mt-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <p className="text-sm font-medium">
        <span
          aria-hidden
          className={cn(
            "mr-2 inline-block size-2.5 rounded-full",
            status === "published" ? "bg-primary" : "bg-muted-foreground",
          )}
        />
        {STATUS_COPY[status]}
      </p>
      <div className="flex flex-wrap gap-2">
        {status !== "published" && (
          <button
            type="submit"
            name="status"
            value="published"
            disabled={pending}
            className={cn(BUTTON, "border-primary bg-primary text-primary-foreground")}
          >
            Publicar
          </button>
        )}
        {status === "published" && (
          <button
            type="submit"
            name="status"
            value="draft"
            disabled={pending}
            className={cn(BUTTON, "border-foreground/30 hover:border-foreground")}
          >
            Pasar a borrador
          </button>
        )}
        {status !== "archived" && (
          <button
            type="submit"
            name="status"
            value="archived"
            disabled={pending}
            onClick={(e) => {
              if (!confirm("¿Archivar esta fecha? Deja de verse en la web y en Ventas.")) {
                e.preventDefault();
              }
            }}
            className={cn(BUTTON, "border-foreground/30 hover:border-accent hover:text-accent")}
          >
            Archivar
          </button>
        )}
      </div>
      {state.error && (
        <p role="alert" className="text-accent text-sm font-semibold sm:basis-full">
          {state.error}
        </p>
      )}
    </form>
  );
}
