"use client";

import { useSyncExternalStore } from "react";

function subscribe(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}

const nowInSeconds = () => Math.floor(Date.now() / 1000);

/**
 * Segundos que faltan hasta `target`, actualizado cada segundo. En el server (y en la
 * hidratación) es null: la hora se calcula recién en el navegador, así no hay mismatch.
 */
export function useSecondsLeft(target: string) {
  const now = useSyncExternalStore(subscribe, nowInSeconds, () => null);
  return now === null ? null : Math.max(0, Math.floor(Date.parse(target) / 1000) - now);
}
