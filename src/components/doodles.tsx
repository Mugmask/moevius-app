import { cn } from "@/lib/utils";

/**
 * La intervención a mano sobre el ticket: estrellas pintadas, flechas y notas en letra de
 * marcador. Todo decorativo (`aria-hidden`): lo que dicen las notas
 * también está escrito en el texto real. Las formas salen de una semilla, así son
 * irregulares pero siempre iguales (no rompen la hidratación).
 *
 * El borde tembloroso de marcador es un filtro SVG (`#marker-rough`) que tiene que estar
 * una vez en la página: `<MarkerFilter />`.
 */

const ROUGH = "[filter:url(#marker-rough)]";

function random(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

const round = (value: number) => Math.round(value * 10) / 10;

export function MarkerFilter() {
  return (
    <svg aria-hidden className="absolute size-0">
      <filter id="marker-rough">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="3" />
        <feDisplacementMap in="SourceGraphic" scale="5" />
      </filter>
    </svg>
  );
}

/** Estrella de cinco puntas pintada con marcador: dos pasadas de pintura, algo torcida. */
export function Star({ seed, className }: { seed: number; className?: string }) {
  const rand = random(seed);
  const points = (spread: number) =>
    Array.from({ length: 10 }, (_, i) => {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const radius = (i % 2 === 0 ? 46 : 19) + (rand() - 0.5) * spread;
      return `${round(50 + radius * Math.cos(angle))},${round(52 + radius * Math.sin(angle))}`;
    }).join(" ");
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={cn("pointer-events-none fill-current mix-blend-multiply", ROUGH, className)}
    >
      <polygon points={points(10)} opacity={0.75} />
      <polygon points={points(14)} opacity={0.55} transform="rotate(4 50 50)" />
    </svg>
  );
}

/** Flecha curva de marcador. Apunta hacia abajo a la derecha; se gira con `className`. */
export function Arrow({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 60 60"
      fill="none"
      className={cn("pointer-events-none stroke-current", ROUGH, className)}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8 C 30 4, 46 18, 48 46" />
      <path d="M38 38 L 48 48 L 55 36" />
    </svg>
  );
}

/** Nota escrita a mano con marcador rojo. */
export function Note({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        "font-marker text-accent pointer-events-none leading-none tracking-normal normal-case",
        className,
      )}
    >
      {children}
    </span>
  );
}
