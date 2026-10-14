import "server-only";

import { z } from "zod";

import { TEST_MODE } from "@/lib/environment";
import { TIMEZONE } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Alta y edición de fechas desde el admin. Escribe con el cliente de servicio (RLS no
 * deja escribir a nadie): por eso cada acción pide `requireStaff(["admin"])` antes.
 */

/* ---------------------------------------------------------------- horarios */

/** Diferencia de Argentina con UTC en ese instante, en minutos (hoy siempre -180). */
function offsetMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return (asUtc - date.getTime()) / 60_000;
}

/** "2026-11-14T23:59" en hora de Argentina → ISO en UTC. */
export function argentinaToIso(local: string) {
  const asIfUtc = new Date(`${local}:00Z`);
  return new Date(asIfUtc.getTime() - offsetMinutes(asIfUtc) * 60_000).toISOString();
}

/** ISO → "2026-11-14T23:59" en hora de Argentina (lo que pide un `datetime-local`). */
export function isoToArgentina(iso: string) {
  const date = new Date(iso);
  return new Date(date.getTime() + offsetMinutes(date) * 60_000).toISOString().slice(0, 16);
}

/**
 * Horario de un set ("01:30") → ISO. La noche cruza las 00: un set más temprano que la
 * apertura es del día siguiente.
 */
function setTimeToIso(startsAtLocal: string, time: string) {
  const [date, opensAt] = startsAtLocal.split("T");
  if (time >= opensAt) return argentinaToIso(`${date}T${time}`);
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return argentinaToIso(`${next.toISOString().slice(0, 10)}T${time}`);
}

/* ---------------------------------------------------------------- validación */

const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Revisá las fechas y horarios.");
const optionalDateTime = z
  .string()
  .transform((value) => value || null)
  .pipe(localDateTime.nullable());
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

const tierSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Cada lote necesita un nombre.").max(40),
  price: z.coerce
    .number({ error: "Revisá los precios." })
    .int("El precio va en pesos, sin centavos.")
    .min(0)
    .max(10_000_000),
  capacity: z.coerce
    .number({ error: "Revisá los cupos." })
    .int("El cupo es un número entero.")
    .min(0)
    .max(100_000),
  maxPerOrder: z.coerce
    .number({ error: "Revisá el máximo por compra." })
    .int()
    .min(1, "El máximo por compra va de 1 a 20.")
    .max(20, "El máximo por compra va de 1 a 20."),
  salesStart: optionalDateTime,
  salesEnd: optionalDateTime,
  active: z.boolean(),
});

const setSchema = z.object({
  artist: z.string().trim().min(1, "Cada artista necesita un nombre.").max(80),
  time: z
    .string()
    .regex(/^(\d{2}:\d{2})?$/, "Revisá los horarios del lineup.")
    .transform((value) => value || null),
});

export const eventInputSchema = z
  .object({
    id: z.uuid().optional(),
    title: z.string().trim().min(2, "Poné el nombre de la edición.").max(80),
    slug: z
      .string()
      .trim()
      .regex(
        /^[a-z0-9]+(-[a-z0-9]+)*$/,
        "La URL va en minúsculas, números y guiones (ej. moevius-vol-14).",
      )
      .max(60),
    startsAt: localDateTime,
    endsAt: localDateTime,
    venue: z.string().trim().min(2, "Poné el lugar.").max(80),
    neighborhood: z.string().trim().min(2, "Poné el barrio.").max(80),
    address: optionalText(160),
    description: optionalText(2000),
    sets: z.array(setSchema).max(30),
    tiers: z.array(tierSchema).min(1, "Cargá al menos un lote.").max(10),
  })
  .refine((event) => event.endsAt > event.startsAt, {
    message: "La fiesta tiene que terminar después de empezar.",
  })
  .refine(
    (event) =>
      event.tiers.every(
        (tier) => !tier.salesStart || !tier.salesEnd || tier.salesEnd > tier.salesStart,
      ),
    { message: "En cada lote, el fin de venta tiene que ser después del inicio." },
  );

export type EventInput = z.input<typeof eventInputSchema>;

/* ---------------------------------------------------------------- guardado */

export class EventSaveError extends Error {}

/**
 * Crea o actualiza la fecha con sus lotes y su lineup. Antes de escribir revisa contra
 * lo que ya se vendió: un lote con ventas no se borra (se pausa) y su cupo no baja de lo
 * vendido o reservado (`taken`). Ese último chequeo se repite en el mismo update
 * (`taken <= cupo`), por si alguien compra mientras tanto. Devuelve el slug.
 *
 * Sin transacción (PostgREST escribe tabla por tabla): por eso valida todo antes de
 * escribir, una fecha nueva que falla a mitad de camino se borra entera, y el lineup
 * nuevo se inserta antes de borrar el viejo (nunca queda vacío por un error).
 */
export async function saveEvent(input: z.output<typeof eventInputSchema>) {
  const supabase = createAdminClient();
  const row = {
    title: input.title,
    venue: input.venue,
    neighborhood: input.neighborhood,
    address: input.address,
    description: input.description,
    starts_at: argentinaToIso(input.startsAt),
    ends_at: argentinaToIso(input.endsAt),
    // Columna vieja (solo nombres) que todavía lee el código deployado antes del lineup.
    lineup: input.sets.map((set) => set.artist),
  };

  // Lo que ya está en la base de esta fecha: para validar antes de tocar nada.
  let existing: { id: string; name: string; taken: number }[] = [];
  // Una fecha nueva no tiene lotes: un id acá sería de otra fecha.
  if (!input.id && input.tiers.some((tier) => tier.id)) {
    throw new EventSaveError("Uno de los lotes ya no existe. Recargá la página.");
  }
  if (input.id) {
    const { data, error } = await supabase
      .from("ticket_types")
      .select("id, name, taken")
      .eq("event_id", input.id);
    if (error) throw error;
    existing = data;

    for (const tier of input.tiers) {
      if (!tier.id) continue;
      const current = existing.find((t) => t.id === tier.id);
      if (!current) throw new EventSaveError("Uno de los lotes ya no existe. Recargá la página.");
      if (tier.capacity < current.taken) {
        throw new EventSaveError(
          `"${current.name}" ya tiene ${current.taken} vendidas o reservadas: el cupo no puede ser menor.`,
        );
      }
    }
    const removed = existing.filter((t) => !input.tiers.some((tier) => tier.id === t.id));
    const sold = removed.find((t) => t.taken > 0);
    if (sold) {
      throw new EventSaveError(`"${sold.name}" ya tiene ventas: pausalo en vez de borrarlo.`);
    }
  }

  const eventId = input.id;
  let slug = input.slug;
  if (eventId) {
    const { data, error } = await supabase
      .from("events")
      .update(row)
      .eq("id", eventId)
      .eq("is_test", TEST_MODE)
      .select("slug")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new EventSaveError("Esa fecha ya no existe.");
    slug = data.slug;
  } else {
    const { data, error } = await supabase
      .from("events")
      .insert({ ...row, slug, status: "draft", is_test: TEST_MODE })
      .select("id")
      .single();
    if (error?.code === "23505") {
      throw new EventSaveError("Ya hay una fecha con esa URL. Cambiala.");
    }
    if (error) throw error;
    try {
      await writeTiersAndSets(data.id, input, existing);
    } catch (err) {
      // Sin lotes o sin lineup no sirve: se borra (en cascada) y la URL queda libre.
      const { error: rollbackError } = await supabase.from("events").delete().eq("id", data.id);
      if (rollbackError) console.error("saveEvent: no se pudo deshacer la fecha", rollbackError);
      throw err;
    }
    return slug;
  }

  await writeTiersAndSets(eventId, input, existing);
  return slug;
}

async function writeTiersAndSets(
  eventId: string,
  input: z.output<typeof eventInputSchema>,
  existing: { id: string; taken: number }[],
) {
  const supabase = createAdminClient();

  // Lotes: los que se sacaron (sin ventas), los que cambiaron y los nuevos.
  const removedIds = existing
    .filter((t) => !input.tiers.some((tier) => tier.id === t.id))
    .map((t) => t.id);
  if (removedIds.length) {
    const { error } = await supabase.from("ticket_types").delete().in("id", removedIds);
    // 23503: alguien compró de ese lote recién; la base no deja borrarlo.
    if (error?.code === "23503") {
      throw new EventSaveError("Uno de los lotes que sacaste tiene ventas: pausalo.");
    }
    if (error) throw error;
  }

  for (const [index, tier] of input.tiers.entries()) {
    const values = {
      name: tier.name,
      price: tier.price,
      capacity: tier.capacity,
      max_per_order: tier.maxPerOrder,
      sales_start: tier.salesStart && argentinaToIso(tier.salesStart),
      sales_end: tier.salesEnd && argentinaToIso(tier.salesEnd),
      active: tier.active,
      sort_order: index,
    };
    if (tier.id) {
      const { data, error } = await supabase
        .from("ticket_types")
        .update(values)
        .eq("id", tier.id)
        .eq("event_id", eventId)
        .lte("taken", tier.capacity)
        .select("id");
      if (error) throw error;
      if (data.length === 0) {
        throw new EventSaveError(
          `"${tier.name}" vendió más mientras editabas: el cupo no puede ser menor a lo vendido.`,
        );
      }
    } else {
      const { error } = await supabase
        .from("ticket_types")
        .insert({ ...values, event_id: eventId });
      if (error) throw error;
    }
  }

  // Lineup: se reemplaza entero (nada lo referencia). Primero el nuevo, después se
  // borra el viejo: si algo falla, queda el de antes.
  const { data: oldSets, error: oldSetsError } = await supabase
    .from("event_sets")
    .select("id")
    .eq("event_id", eventId);
  if (oldSetsError) throw oldSetsError;
  if (input.sets.length) {
    const { error } = await supabase.from("event_sets").insert(
      input.sets.map((set, index) => ({
        event_id: eventId,
        artist: set.artist,
        starts_at: set.time && setTimeToIso(input.startsAt, set.time),
        sort_order: index,
      })),
    );
    if (error) throw error;
  }
  if (oldSets.length) {
    const { error } = await supabase
      .from("event_sets")
      .delete()
      .in(
        "id",
        oldSets.map((set) => set.id),
      );
    if (error) throw error;
  }
}

/**
 * Publica, vuelve a borrador o archiva. Para publicar pide que la fiesta no haya
 * terminado y al menos un lote que se pueda comprar: activo, con lugar y con la venta
 * abierta o por abrir.
 */
export async function setEventStatus(eventId: string, status: "draft" | "published" | "archived") {
  const supabase = createAdminClient();
  if (status === "published") {
    const { data: event, error } = await supabase
      .from("events")
      .select("ends_at, ticket_types(active, capacity, taken, sales_end)")
      .eq("id", eventId)
      .eq("is_test", TEST_MODE)
      .maybeSingle();
    if (error) throw error;
    if (!event) throw new EventSaveError("Esa fecha ya no existe.");
    if (Date.parse(event.ends_at) <= Date.now()) {
      throw new EventSaveError("Esa fecha ya pasó: no se puede publicar.");
    }
    const now = Date.now();
    const buyable = event.ticket_types.some(
      (tier) =>
        tier.active &&
        tier.capacity > tier.taken &&
        (!tier.sales_end || Date.parse(tier.sales_end) > now),
    );
    if (!buyable) {
      throw new EventSaveError(
        "Para publicar, dejá al menos un lote a la venta, con lugar y con la venta abierta.",
      );
    }
  }
  const { data, error } = await supabase
    .from("events")
    .update({ status })
    .eq("id", eventId)
    .eq("is_test", TEST_MODE)
    .select("slug")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new EventSaveError("Esa fecha ya no existe.");
  return data.slug;
}
