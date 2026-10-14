"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  EventSaveError,
  eventInputSchema,
  saveEvent,
  setEventStatus,
  type EventInput,
} from "@/lib/event-admin";
import { requireStaff } from "@/lib/staff";

export type EventFormState = { error?: string };

/** Guarda la fecha (nueva o editada) y vuelve a sus órdenes. Solo admin. */
export async function saveEventAction(
  _prev: EventFormState,
  input: EventInput,
): Promise<EventFormState> {
  await requireStaff(["admin"]);

  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }

  let slug: string;
  try {
    slug = await saveEvent(parsed.data);
  } catch (err) {
    if (err instanceof EventSaveError) return { error: err.message };
    console.error("saveEvent", err);
    return { error: "No pudimos guardar la fecha. Probá de nuevo." };
  }
  // Un valor nuevo en cada guardado: la página remonta el form con lo guardado.
  redirect(`/admin/${slug}/edit?saved=${Date.now()}`);
}

/** Publicar, volver a borrador o archivar. Solo admin. */
export async function setEventStatusAction(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  await requireStaff(["admin"]);

  const eventId = z.uuid().safeParse(formData.get("eventId"));
  const status = String(formData.get("status") ?? "");
  if (!eventId.success) return { error: "Esa fecha ya no existe." };
  if (status !== "draft" && status !== "published" && status !== "archived") {
    return { error: "Estado inválido." };
  }

  let slug: string;
  try {
    slug = await setEventStatus(eventId.data, status);
  } catch (err) {
    if (err instanceof EventSaveError) return { error: err.message };
    console.error("setEventStatus", err);
    return { error: "No pudimos cambiar el estado. Probá de nuevo." };
  }
  redirect(status === "archived" ? "/admin" : `/admin/${slug}/edit`);
}
