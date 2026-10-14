import "server-only";

import { cache } from "react";

import { FEW_LEFT_THRESHOLD } from "@/lib/config";
import { TEST_MODE } from "@/lib/environment";
import { TIMEZONE } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type Availability = "on-sale" | "few-left" | "sold-out";

/** Un set del lineup. `time` es "01:30" en hora de Argentina, o null si no tiene horario. */
export type LineupSet = { artist: string; time: string | null };

/** Un lote: tipo de entrada con precio y cupo propios ("General", "Preventa 1"). */
export type TicketTier = {
  id: string;
  name: string;
  /** En pesos, sin puntos. */
  price: number;
  available: number;
  maxPerOrder: number;
};

export type EventListing = {
  id: string;
  slug: string;
  title: string;
  /** ISO de inicio: lo usa MP como `event_date`. */
  startsAt: string;
  /** Día en letras + número, para el bloque grande. Ej: "SÁB 12". */
  day: string;
  month: string;
  year: string;
  time: string;
  venue: string;
  neighborhood: string;
  /** Párrafos de la bajada de la edición (vacío si no se cargó). */
  description: string[];
  address: string | null;
  /** Link de Google Maps a la dirección (o al lugar, si no hay dirección). */
  mapsUrl: string;
  lineup: LineupSet[];
  /** Precio del lote más barato que todavía está a la venta. */
  price: number;
  availability: Availability;
  /** Solo los lotes que se pueden comprar ahora (activos y dentro de su ventana). */
  tiers: TicketTier[];
};

type EventRow = Tables<"events"> & {
  ticket_types: Tables<"ticket_types">[];
  event_sets: Tables<"event_sets">[];
};

const EVENT_SELECT = "*, ticket_types(*), event_sets(*)" as const;

/**
 * La fiesta que promociona la home: la próxima fecha publicada que todavía no terminó.
 * Hay una sola edición a la vez; si se cargan varias, manda la más cercana. Con `cache`:
 * la home la pide para la metadata y para la página, y va una sola vez a la DB.
 */
export const getFeaturedEvent = cache(async (): Promise<EventListing | null> => {
  const supabase = await createClient();
  const [{ data: event, error }, availability] = await Promise.all([
    supabase
      .from("events")
      .select(EVENT_SELECT)
      // Explícito: el staff logueado también ve borradores por RLS.
      .eq("status", "published")
      .eq("is_test", TEST_MODE)
      .gt("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(1)
      .maybeSingle(),
    getAvailability(),
  ]);
  if (error) throw error;

  return event ? toEventListing(event, availability) : null;
});

export async function getEventBySlug(slug: string): Promise<EventListing | null> {
  const supabase = await createClient();
  const [{ data: event, error }, availability] = await Promise.all([
    supabase
      .from("events")
      .select(EVENT_SELECT)
      .eq("slug", slug)
      .eq("status", "published")
      .eq("is_test", TEST_MODE)
      .gt("ends_at", new Date().toISOString())
      .maybeSingle(),
    getAvailability(),
  ]);
  if (error) throw error;

  return event ? toEventListing(event, availability) : null;
}

/** "SÁB 12", "ABRIL", "2026", "23:59 — 06:00", en hora de Argentina. */
export function formatEventDates(event: Pick<Tables<"events">, "starts_at" | "ends_at">) {
  const format = (options: Intl.DateTimeFormatOptions, date: string) =>
    new Intl.DateTimeFormat("es-AR", { timeZone: TIMEZONE, ...options }).format(new Date(date));

  return {
    day: `${format({ weekday: "short" }, event.starts_at).replace(".", "")} ${format({ day: "2-digit" }, event.starts_at)}`.toUpperCase(),
    month: format({ month: "long" }, event.starts_at).toUpperCase(),
    year: format({ year: "numeric" }, event.starts_at),
    time: `${formatTime(event.starts_at)} — ${formatTime(event.ends_at)}`,
  };
}

/** "23:59", en hora de Argentina. */
function formatTime(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));
}

async function getAvailability() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ticket_availability");
  if (error) throw error;
  return new Map(data.map((row) => [row.ticket_type_id, row]));
}

function toEventListing(
  event: EventRow,
  availability: Map<string, { capacity: number; available: number }>,
): EventListing {
  const now = Date.now();
  const onSale = event.ticket_types
    .filter(
      (tt) =>
        tt.active &&
        (!tt.sales_start || Date.parse(tt.sales_start) <= now) &&
        (!tt.sales_end || Date.parse(tt.sales_end) > now),
    )
    .sort((a, b) => a.sort_order - b.sort_order || a.price - b.price);

  const tiers: TicketTier[] = onSale.map((tt) => ({
    id: tt.id,
    name: tt.name,
    price: tt.price,
    available: availability.get(tt.id)?.available ?? 0,
    maxPerOrder: tt.max_per_order,
  }));

  const capacity = onSale.reduce((acc, tt) => acc + tt.capacity, 0);
  const available = tiers.reduce((acc, tier) => acc + tier.available, 0);
  const status: Availability =
    available === 0
      ? "sold-out"
      : available / capacity < FEW_LEFT_THRESHOLD
        ? "few-left"
        : "on-sale";

  const inStock = tiers.filter((tier) => tier.available > 0);
  const price = Math.min(...(inStock.length ? inStock : tiers).map((tier) => tier.price));

  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    startsAt: event.starts_at,
    ...formatEventDates(event),
    venue: event.venue,
    neighborhood: event.neighborhood,
    description: (event.description ?? "")
      .split("\n")
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
    address: event.address,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      event.address ?? `${event.venue}, ${event.neighborhood}`,
    )}`,
    lineup: [...event.event_sets]
      .sort(
        (a, b) =>
          a.sort_order - b.sort_order ||
          (a.starts_at ?? "").localeCompare(b.starts_at ?? "") ||
          a.artist.localeCompare(b.artist),
      )
      .map((set) => ({
        artist: set.artist,
        time: set.starts_at ? formatTime(set.starts_at) : null,
      })),
    price: Number.isFinite(price) ? price : 0,
    availability: status,
    tiers,
  };
}
