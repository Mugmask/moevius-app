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

/**
 * Pasada de resaltador detrás de un texto: una franja amarilla flúo, irregular y un poco
 * torcida, que tapa la mitad de abajo de las letras (como se resalta de verdad).
 */
export function Highlight({
  seed,
  className,
  children,
}: {
  seed: number;
  className?: string;
  children: React.ReactNode;
}) {
  const rand = random(seed);
  const jitter = (value: number) => round(value + (rand() - 0.5) * 4);
  const band = `M${jitter(2)},${jitter(4)} L${jitter(98)},${jitter(2)} L${jitter(99)},${jitter(17)} L${jitter(1)},${jitter(19)} Z`;
  return (
    <span className={cn("relative isolate inline-block", className)}>
      <svg
        aria-hidden
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
        className={cn(
          "text-highlighter pointer-events-none absolute top-[40%] -left-[4%] -z-10 h-[62%] w-[108%] fill-current mix-blend-multiply",
          ROUGH,
        )}
      >
        <path d={band} opacity={0.9} />
      </svg>
      {children}
    </span>
  );
}

/**
 * Óvalo de fibrón alrededor de algo, que no cierra justo (se pasa de largo, como cuando se
 * marca rápido). Se estira al tamaño de lo que rodea: va absoluto sobre un `relative`.
 */
export function Circle({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 50"
      preserveAspectRatio="none"
      fill="none"
      className={cn("pointer-events-none stroke-current", ROUGH, className)}
      strokeWidth={2.5}
      strokeLinecap="round"
    >
      <path
        d="M14 9 C 40 1, 88 2, 96 20 C 102 36, 66 48, 36 46 C 8 44, -2 30, 6 18 C 12 10, 30 5, 46 5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Subrayado ondulado de fibrón; se estira al ancho de lo que subraya. */
export function Squiggle({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
      fill="none"
      className={cn("pointer-events-none stroke-current", ROUGH, className)}
      strokeWidth={2.5}
      strokeLinecap="round"
    >
      <path
        d="M2 6 Q 8 1, 14 5 T 26 5 T 38 5 T 50 5 T 62 5 T 74 5 T 86 5 T 98 4"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Mancha de pintura: una forma blanda e irregular (radios al azar unidos con curvas), con
 * un par de gotas sueltas alrededor. Se pinta del color del texto, multiplicada sobre el
 * papel.
 */
export function Blob({ seed, className }: { seed: number; className?: string }) {
  const rand = random(seed);
  const points = Array.from({ length: 9 }, (_, i) => {
    const angle = (i / 9) * Math.PI * 2;
    const radius = 30 + rand() * 14;
    return [50 + radius * Math.cos(angle), 50 + radius * Math.sin(angle)];
  });
  const at = (i: number) => points[(i + points.length) % points.length];
  let d = `M${round(at(0)[0])},${round(at(0)[1])}`;
  for (let i = 0; i < points.length; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    d += `C${round(p1[0] + (p2[0] - p0[0]) / 6)},${round(p1[1] + (p2[1] - p0[1]) / 6)} ${round(p2[0] - (p3[0] - p1[0]) / 6)},${round(p2[1] - (p3[1] - p1[1]) / 6)} ${round(p2[0])},${round(p2[1])}`;
  }
  const drops = Array.from({ length: 4 }, () => {
    const angle = rand() * Math.PI * 2;
    const distance = 44 + rand() * 6;
    return {
      cx: round(50 + distance * Math.cos(angle)),
      cy: round(50 + distance * Math.sin(angle)),
      r: round(1.5 + rand() * 3),
    };
  });
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={cn("pointer-events-none fill-current mix-blend-multiply", ROUGH, className)}
    >
      <path d={`${d}Z`} opacity={0.8} />
      {drops.map((drop, i) => (
        <circle key={i} {...drop} opacity={0.8} />
      ))}
    </svg>
  );
}

/** Trazos de fibrón sueltos (espiral, zigzag, rayo, destello, carita): se pintan del color del texto. */
const STROKES = {
  spiral:
    "M50 50 C 54 46, 58 52, 54 57 C 48 63, 38 56, 40 47 C 42 36, 58 32, 65 42 C 74 54, 64 70, 48 70 C 30 70, 22 52, 28 38 C 34 24, 56 18, 70 26",
  zigzag: "M6 60 L 20 40 L 32 60 L 46 40 L 58 60 L 72 40 L 84 60 L 96 42",
  bolt: "M58 8 L 30 54 L 50 54 L 40 92 L 72 40 L 52 40 Z",
  sparkle:
    "M50 10 C 52 40, 60 48, 90 50 C 60 52, 52 60, 50 90 C 48 60, 40 52, 10 50 C 40 48, 48 40, 50 10 Z",
  smiley:
    "M50 12 C 74 12, 90 28, 88 52 C 86 76, 66 90, 46 88 C 24 86, 10 68, 12 46 C 14 26, 30 12, 52 14 M36 38 L 36 46 M62 38 L 62 46 M32 60 C 40 74, 60 74, 68 60",
} as const;

export function Scribble({
  shape,
  className,
}: {
  shape: keyof typeof STROKES;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      fill="none"
      className={cn("pointer-events-none stroke-current", ROUGH, className)}
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={STROKES[shape]} />
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
