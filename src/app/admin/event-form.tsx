"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import { INK_BUTTON, PaperField } from "@/components/paper-slip";
import type { EventInput } from "@/lib/event-admin";
import { cn } from "@/lib/utils";

import { saveEventAction, type EventFormState } from "./event-actions";

/** Un lote en el form: los números van como texto mientras se escriben. */
export type TierDraft = {
  id?: string;
  /** Vendidas o reservadas: con ventas no se puede borrar ni bajar el cupo de acá. */
  taken: number;
  name: string;
  price: string;
  capacity: string;
  maxPerOrder: string;
  salesStart: string;
  salesEnd: string;
  active: boolean;
};

export type EventDraft = Omit<EventInput, "tiers" | "sets" | "address" | "description"> & {
  address: string;
  description: string;
  sets: { artist: string; time: string }[];
  tiers: TierDraft[];
};

const NEW_TIER: TierDraft = {
  taken: 0,
  name: "",
  price: "",
  capacity: "",
  maxPerOrder: "6",
  salesStart: "",
  salesEnd: "",
  active: true,
};

/** "Moevius Vol. 14" → "moevius-vol-14". */
function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const SECTION =
  "bg-paper paper-crumple text-ink px-5 py-6 shadow-[0_18px_30px_oklch(0_0_0/0.5)] sm:px-8 sm:py-8";
const SECTION_TITLE =
  "font-display font-stretch-condensed text-3xl leading-none font-extrabold uppercase";
const SMALL_BUTTON =
  "border-ink hover:bg-ink hover:text-paper inline-flex min-h-10 items-center gap-2 rounded-full border-2 px-4 font-mono text-xs font-bold tracking-[0.1em] uppercase transition-colors disabled:pointer-events-none disabled:opacity-40";
const ICON_BUTTON =
  "hover:bg-ink/10 grid size-10 shrink-0 place-items-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-30";

/**
 * Alta y edición de una fecha: la fiesta, el lineup y los lotes, cada parte en su papel.
 * Todo el form es controlado y viaja entero a la acción (no un FormData): si la
 * validación falla, lo escrito queda como estaba.
 */
export function EventForm({
  initial,
  isNew,
  justSaved = false,
}: {
  initial: EventDraft;
  isNew: boolean;
  /** Se acaba de guardar (la página se remontó): muestra el "guardado" hasta el próximo intento. */
  justSaved?: boolean;
}) {
  const [event, setEvent] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [state, dispatch, pending] = useActionState<EventFormState, EventInput>(
    saveEventAction,
    {},
  );
  const [, startTransition] = useTransition();

  const update = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) =>
    setEvent((current) => ({ ...current, [key]: value }));

  const updateTier = (index: number, patch: Partial<TierDraft>) =>
    update(
      "tiers",
      event.tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)),
    );

  const updateSet = (index: number, patch: Partial<EventDraft["sets"][number]>) =>
    update(
      "sets",
      event.sets.map((set, i) => (i === index ? { ...set, ...patch } : set)),
    );

  const moveSet = (index: number, delta: -1 | 1) => {
    const sets = [...event.sets];
    [sets[index], sets[index + delta]] = [sets[index + delta], sets[index]];
    update("sets", sets);
  };

  return (
    <form
      className="mt-8 flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(() =>
          dispatch({
            ...event,
            tiers: event.tiers.map((tier) => ({
              id: tier.id,
              name: tier.name,
              price: tier.price,
              capacity: tier.capacity,
              maxPerOrder: tier.maxPerOrder,
              salesStart: tier.salesStart,
              salesEnd: tier.salesEnd,
              active: tier.active,
            })),
          }),
        );
      }}
    >
      <section className={SECTION} aria-labelledby="event-party">
        <h2 id="event-party" className={SECTION_TITLE}>
          La fiesta
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <PaperField
            id="event-title"
            label="Nombre de la edición"
            placeholder="Moevius Vol. 14"
            required
            value={event.title}
            onChange={(e) => {
              const title = e.target.value;
              setEvent((current) => ({
                ...current,
                title,
                slug: slugTouched ? current.slug : slugify(title),
              }));
            }}
          />
          <PaperField
            id="event-slug"
            label="URL"
            hint={isNew ? "Sale del nombre. Después no se puede cambiar." : "No se puede cambiar."}
            required
            readOnly={!isNew}
            value={event.slug}
            onChange={(e) => {
              setSlugTouched(true);
              update("slug", e.target.value);
            }}
          />
          <PaperField
            id="event-starts"
            label="Abre"
            type="datetime-local"
            hint="Hora de Argentina."
            required
            value={event.startsAt}
            onChange={(e) => update("startsAt", e.target.value)}
          />
          <PaperField
            id="event-ends"
            label="Cierra"
            type="datetime-local"
            required
            value={event.endsAt}
            onChange={(e) => update("endsAt", e.target.value)}
          />
          <PaperField
            id="event-venue"
            label="Lugar"
            placeholder="Roddy Club"
            required
            value={event.venue}
            onChange={(e) => update("venue", e.target.value)}
          />
          <PaperField
            id="event-neighborhood"
            label="Barrio"
            placeholder="Villa Crespo, CABA"
            required
            value={event.neighborhood}
            onChange={(e) => update("neighborhood", e.target.value)}
          />
          <PaperField
            id="event-address"
            label="Dirección (opcional)"
            placeholder="Av. Corrientes 6271, CABA"
            hint="Tal como se busca en Google Maps."
            className="sm:col-span-2"
            value={event.address}
            onChange={(e) => update("address", e.target.value)}
          />
          <div className="sm:col-span-2">
            <label
              htmlFor="event-description"
              className="block text-xs font-bold tracking-[0.1em] sm:text-sm"
            >
              Bajada (opcional)
            </label>
            <textarea
              id="event-description"
              rows={4}
              value={event.description}
              onChange={(e) => update("description", e.target.value)}
              className="border-ink/30 text-ink placeholder:text-ink/35 focus:border-ink focus-visible:ring-ink/15 mt-1.5 w-full rounded-lg border-2 bg-white/50 px-3 py-2 font-sans text-base font-medium outline-none focus-visible:ring-4"
            />
            <p className="mt-1.5 font-sans text-xs opacity-70 sm:text-sm">
              Cada línea es un párrafo.
            </p>
          </div>
        </div>
      </section>

      <section className={SECTION} aria-labelledby="event-lineup">
        <h2 id="event-lineup" className={SECTION_TITLE}>
          Lineup
        </h2>
        <p className="mt-2 font-sans text-sm opacity-70">
          En el orden en que tocan. El horario es opcional.
        </p>
        <ol className="mt-5 flex flex-col gap-3">
          {event.sets.map((set, index) => (
            <li key={index} className="flex items-end gap-2">
              <PaperField
                id={`set-${index}-artist`}
                label={`Artista ${index + 1}`}
                className="min-w-0 flex-1"
                required
                value={set.artist}
                onChange={(e) => updateSet(index, { artist: e.target.value })}
              />
              <PaperField
                id={`set-${index}-time`}
                label="Hora"
                type="time"
                className="w-28 shrink-0"
                value={set.time}
                onChange={(e) => updateSet(index, { time: e.target.value })}
              />
              <div className="flex shrink-0 pb-1">
                <button
                  type="button"
                  className={ICON_BUTTON}
                  disabled={index === 0}
                  onClick={() => moveSet(index, -1)}
                  aria-label={`Subir a ${set.artist || `artista ${index + 1}`}`}
                >
                  <ArrowUp aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  className={ICON_BUTTON}
                  disabled={index === event.sets.length - 1}
                  onClick={() => moveSet(index, 1)}
                  aria-label={`Bajar a ${set.artist || `artista ${index + 1}`}`}
                >
                  <ArrowDown aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  className={ICON_BUTTON}
                  onClick={() =>
                    update(
                      "sets",
                      event.sets.filter((_, i) => i !== index),
                    )
                  }
                  aria-label={`Sacar a ${set.artist || `artista ${index + 1}`}`}
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className={cn(SMALL_BUTTON, "mt-5")}
          onClick={() => update("sets", [...event.sets, { artist: "", time: "" }])}
        >
          <Plus aria-hidden className="size-4" />
          Agregar artista
        </button>
      </section>

      <section className={SECTION} aria-labelledby="event-tiers">
        <h2 id="event-tiers" className={SECTION_TITLE}>
          Lotes
        </h2>
        <p className="mt-2 font-sans text-sm opacity-70">
          Los tipos de entrada, cada uno con su precio y cupo. Un lote con ventas no se borra: se
          pausa.
        </p>
        <ul className="mt-5 flex flex-col gap-5">
          {event.tiers.map((tier, index) => (
            <li key={tier.id ?? `new-${index}`} className="border-ink/25 rounded-xl border-2 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs font-bold tracking-[0.15em] uppercase">
                  Lote {index + 1}
                  {tier.taken > 0 && (
                    <span className="opacity-60"> · {tier.taken} vendidas o reservadas</span>
                  )}
                </p>
                <button
                  type="button"
                  className={ICON_BUTTON}
                  disabled={tier.taken > 0 || event.tiers.length === 1}
                  title={tier.taken > 0 ? "Tiene ventas: pausalo en vez de borrarlo" : undefined}
                  onClick={() =>
                    update(
                      "tiers",
                      event.tiers.filter((_, i) => i !== index),
                    )
                  }
                  aria-label={`Sacar el lote ${tier.name || index + 1}`}
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <PaperField
                  id={`tier-${index}-name`}
                  label="Nombre"
                  placeholder="Preventa 1"
                  required
                  className="sm:col-span-2"
                  value={tier.name}
                  onChange={(e) => updateTier(index, { name: e.target.value })}
                />
                <PaperField
                  id={`tier-${index}-price`}
                  label="Precio (pesos)"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  required
                  value={tier.price}
                  onChange={(e) => updateTier(index, { price: e.target.value })}
                />
                <PaperField
                  id={`tier-${index}-capacity`}
                  label="Cupo"
                  type="number"
                  inputMode="numeric"
                  min={tier.taken}
                  step={1}
                  required
                  hint={tier.taken > 0 ? `No puede ser menos de ${tier.taken}.` : undefined}
                  value={tier.capacity}
                  onChange={(e) => updateTier(index, { capacity: e.target.value })}
                />
                <PaperField
                  id={`tier-${index}-max`}
                  label="Máximo por compra"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={20}
                  step={1}
                  required
                  value={tier.maxPerOrder}
                  onChange={(e) => updateTier(index, { maxPerOrder: e.target.value })}
                />
                <label className="flex min-h-12 items-center gap-3 self-end font-mono text-xs font-bold tracking-[0.1em] uppercase sm:text-sm">
                  <input
                    type="checkbox"
                    checked={tier.active}
                    onChange={(e) => updateTier(index, { active: e.target.checked })}
                    className="accent-ink size-5"
                  />
                  A la venta
                </label>
                <PaperField
                  id={`tier-${index}-start`}
                  label="Se vende desde (opcional)"
                  type="datetime-local"
                  value={tier.salesStart}
                  onChange={(e) => updateTier(index, { salesStart: e.target.value })}
                />
                <PaperField
                  id={`tier-${index}-end`}
                  label="Hasta (opcional)"
                  type="datetime-local"
                  value={tier.salesEnd}
                  onChange={(e) => updateTier(index, { salesEnd: e.target.value })}
                />
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={cn(SMALL_BUTTON, "mt-5")}
          onClick={() => update("tiers", [...event.tiers, NEW_TIER])}
        >
          <Plus aria-hidden className="size-4" />
          Agregar lote
        </button>
      </section>

      <div className="flex flex-col gap-3">
        {justSaved && !state.error && !pending && (
          <p role="status" className="label-mono text-go">
            ✓ Cambios guardados
          </p>
        )}
        {state.error && (
          <p
            role="alert"
            className="bg-accent text-accent-foreground rounded-lg px-4 py-3 text-sm font-semibold"
          >
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className={cn(INK_BUTTON, "bg-primary text-primary-foreground hover:bg-primary/85")}
        >
          {pending ? "Guardando…" : isNew ? "Crear fecha (queda en borrador)" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
