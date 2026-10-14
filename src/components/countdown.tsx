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

const UNITS = [
  { label: "Días", seconds: 86_400, max: Infinity },
  { label: "Horas", seconds: 3_600, max: 24 },
  { label: "Min", seconds: 60, max: 60 },
  { label: "Seg", seconds: 1, max: 60 },
];

/** La cuenta regresiva en una línea de ticket: "30D 21H 36M 02S". */
export function CountdownLine({ startsAt }: { startsAt: string }) {
  const left = useSecondsLeft(startsAt);
  if (left === 0) return <span>Es hoy</span>;
  return (
    <span className="tabular-nums">
      {UNITS.map(({ label, seconds, max }) => {
        const value = left === null ? null : Math.floor(left / seconds) % max;
        return `${value === null ? "--" : String(value).padStart(2, "0")}${label[0]}`;
      }).join(" ")}
    </span>
  );
}
