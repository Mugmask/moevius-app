"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Las entradas que se abrieron en este dispositivo (la página de la compra o la de una
 * entrada), para volver a ellas sin buscar el mail. Viven solo en el navegador: no hay
 * login y los links ya son secretos. Se olvidan solas cuando termina la fiesta.
 */
export type SavedTicket = {
  /** `/orders/<id>` o `/tickets/<código>`. */
  href: string;
  /** "Moevius Vol. 13 · VIE 13 NOV". */
  label: string;
  /** ISO de cuando termina la fiesta. */
  endsAt: string;
};

const KEY = "moevius:tickets";
const CHANGE_EVENT = "moevius:tickets-change";

function readRaw() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): SavedTicket[] {
  if (!raw) return [];
  try {
    const items: unknown = JSON.parse(raw);
    if (!Array.isArray(items)) return [];
    return items.filter(
      (item): item is SavedTicket =>
        typeof item?.href === "string" &&
        /^\/(orders|tickets)\/[\w-]+$/.test(item.href) &&
        typeof item.label === "string" &&
        typeof item.endsAt === "string" &&
        Date.parse(item.endsAt) > Date.now(),
    );
  } catch {
    return [];
  }
}

export function saveTicket(ticket: SavedTicket) {
  const items = parse(readRaw()).filter((item) => item.href !== ticket.href);
  try {
    localStorage.setItem(KEY, JSON.stringify([ticket, ...items]));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Navegación privada o almacenamiento bloqueado: no se recuerda, y listo.
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Las entradas guardadas, de la más reciente a la más vieja. En el server, ninguna. */
export function useSavedTickets() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => parse(raw), [raw]);
}
