import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Botón pill grande. `tone="solid"` es la acción principal (lima: solo para lo que
 * compra o avanza); `"outline"` el secundario, con línea fina de hueso.
 */
export function Pill({
  tone = "solid",
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { tone?: "solid" | "outline" }) {
  return (
    <Button
      {...props}
      className={cn(
        "h-12 gap-2 rounded-full px-6 text-sm font-semibold tracking-tight transition-[background-color,transform] active:scale-[0.98]",
        tone === "solid" && "bg-primary text-primary-foreground hover:bg-primary/85",
        tone === "outline" &&
          "border-input text-foreground hover:bg-foreground/10 border bg-transparent",
        className,
      )}
    >
      {children}
    </Button>
  );
}

/**
 * Isotipo: un estallido de puntos, como un parlante visto de frente o una luz que
 * se abre. Hereda el color del texto (`fill-current`).
 */
export function Burst({ className }: { className?: string }) {
  const dots = Array.from({ length: 10 }, (_, i) => (i * 360) / 10);
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={cn("fill-current", className)}>
      <circle cx="50" cy="50" r="9" />
      {dots.map((angle) => (
        <g key={angle} transform={`rotate(${angle} 50 50)`}>
          <circle cx="50" cy="27" r="7" />
          <circle cx="50" cy="9" r="8.5" />
        </g>
      ))}
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Burst className="size-5" />
      <span className="font-display font-stretch-expanded text-base font-extrabold tracking-tight">
        MOEVIUS
      </span>
    </div>
  );
}

/** Input de formulario: fondo apenas más claro que la noche, línea fina y foco lima. */
export function Field({
  label,
  id,
  className,
  ...props
}: React.ComponentProps<"input"> & { label: string; id: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label-mono text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="border-input bg-foreground/5 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/30 mt-2 h-13 w-full rounded-2xl border px-4 text-base font-medium outline-none focus-visible:ring-4"
      />
    </div>
  );
}
