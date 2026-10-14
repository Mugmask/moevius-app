import { cn } from "@/lib/utils";

/** Botón principal sobre el papel del ticket: tinta, ancho completo, en mono. */
export const INK_BUTTON =
  "bg-ink text-paper hover:bg-ink/85 focus-visible:ring-ink/30 flex h-14 w-full items-center justify-between gap-3 rounded-full px-6 font-mono text-sm font-bold tracking-wider uppercase outline-none focus-visible:ring-4 active:scale-[0.98] disabled:opacity-50 sm:h-16 sm:px-8 sm:text-base";

/** El secundario: misma forma, con borde de tinta. */
export const INK_BUTTON_OUTLINE =
  "border-ink hover:bg-ink hover:text-paper focus-visible:ring-ink/30 flex h-14 w-full items-center justify-between gap-3 rounded-full border-2 px-6 font-mono text-sm font-bold tracking-wider uppercase outline-none focus-visible:ring-4 active:scale-[0.98] sm:h-16 sm:px-8 sm:text-base";

/**
 * Las pantallas sueltas (404, error, estado de la compra) son un recibo como el talón de
 * la home: papel arrugado sobre la noche, una etiqueta en mono, el título condensado, el
 * texto y las acciones; al pie, el código de barras y el borde cortado.
 */
export function PaperSlip({
  label,
  title,
  seed,
  children,
}: {
  label: string;
  title: string;
  /** Para el código de barras: el mismo seed da siempre el mismo. */
  seed: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex flex-1 items-center justify-center px-4 py-16 sm:py-24">
      {/* Luz de la pista atrás del papel (degradado quieto, con grano: ver la home). */}
      <div aria-hidden className="grain pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="glow text-accent absolute top-1/4 left-1/2 -z-20 size-[120vw] max-w-[48rem] -translate-x-1/2 rounded-full opacity-25" />
      </div>

      <article className="text-ink relative w-full max-w-[28rem] rotate-[-0.6deg] sm:max-w-[32rem]">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 shadow-[0_24px_30px_oklch(0_0_0/0.55)]"
        />
        <div className="bg-paper paper-crumple px-5 pt-8 pb-6 font-mono text-[0.8125rem] leading-relaxed uppercase sm:px-10 sm:pt-10 sm:text-sm">
          <p className="font-bold tracking-[0.2em] opacity-60">{label}</p>
          <h1 className="font-display font-stretch-condensed mt-3 text-[clamp(2.25rem,11vw,3.25rem)] leading-[0.9] font-extrabold">
            {title}
          </h1>
          <div className="mt-4 font-sans text-base leading-snug font-medium normal-case">
            {children}
          </div>
          <hr className="border-ink/35 mt-8 border-t-2 border-dashed" />
          <Barcode seed={seed} className="mt-6 h-12 w-full sm:h-14" />
          <p className="mt-3 text-center tracking-[0.15em] opacity-70">Moevius · Mar del Plata</p>
        </div>
        <div aria-hidden className="torn-edge absolute inset-x-0 top-full h-3.5" />
      </article>
    </div>
  );
}

/** Campo para escribir sobre el papel: la etiqueta arriba, la caja y, si hay, la ayuda abajo. */
export function PaperField({
  label,
  id,
  hint,
  ...props
}: React.ComponentProps<"input"> & { label: string; id: string; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold tracking-[0.1em] sm:text-sm">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...props}
        className="border-ink/30 text-ink placeholder:text-ink/35 focus:border-ink focus-visible:ring-ink/15 mt-1.5 h-12 w-full rounded-lg border-2 bg-white/50 px-3 font-sans text-base font-medium normal-case outline-none focus-visible:ring-4"
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 font-sans text-xs normal-case opacity-70 sm:text-sm">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Código de barras decorativo: anchos de barra que salen del seed con un LCG, así es
 * siempre el mismo para el mismo seed (y no rompe la hidratación).
 */
export function Barcode({ seed, className }: { seed: string; className?: string }) {
  let state = [...seed].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);
  const bars: { x: number; width: number }[] = [];
  let x = 0;
  while (x < 240) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const width = 1 + (state % 3);
    if (state % 3 !== 0) bars.push({ x, width });
    x += width + 1 + ((state >> 4) % 2);
  }
  return (
    <svg
      aria-hidden
      viewBox="0 0 240 40"
      preserveAspectRatio="none"
      className={cn("fill-current", className)}
    >
      {bars.map((bar) => (
        <rect key={bar.x} x={bar.x} y={0} width={bar.width} height={40} />
      ))}
    </svg>
  );
}
