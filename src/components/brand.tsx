import { Button } from "@/components/ui/button";
import type { Availability } from "@/lib/events";
import { cn } from "@/lib/utils";

/** Botón pill grande. `tone="ink"` es el negro sólido; `"paper"` el de contorno. */
export function Pill({
  tone = "ink",
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { tone?: "ink" | "paper" | "brand" }) {
  return (
    <Button
      {...props}
      className={cn(
        "h-12 rounded-full border-2 px-6 text-sm font-bold tracking-tight",
        tone === "ink" && "border-foreground bg-foreground text-background hover:bg-foreground/85",
        tone === "paper" && "border-foreground bg-card text-foreground hover:bg-muted",
        tone === "brand" && "border-foreground bg-primary text-primary-foreground hover:bg-primary",
        className,
      )}
    >
      {children}
    </Button>
  );
}

/** Asterisco de sticker. Se usa suelto, como una calcomanía pegada al azar. */
export function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={cn("fill-primary", className)}>
      <path d="M50 0 L59 34 L88 15 L69 44 L100 50 L69 56 L88 85 L59 66 L50 100 L41 66 L12 85 L31 56 L0 50 L31 44 L12 15 L41 34 Z" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="border-foreground bg-primary size-5 rounded-full border-2" />
      <span className="font-display text-lg tracking-tight">MOEVIUS</span>
    </div>
  );
}

const AVAILABILITY_LABEL: Record<Availability, string> = {
  "on-sale": "En venta",
  "few-left": "Últimas entradas",
  "sold-out": "Agotado",
};

export function AvailabilityBadge({ availability }: { availability: Availability }) {
  return (
    <span
      className={cn(
        "border-foreground inline-flex shrink-0 items-center rounded-full border-2 px-3 py-1 text-xs font-bold",
        availability === "sold-out"
          ? "bg-muted text-muted-foreground"
          : "bg-primary text-primary-foreground",
      )}
    >
      {AVAILABILITY_LABEL[availability]}
    </span>
  );
}

/** Input de formulario con el mismo trazo que los pills. */
export function Field({
  label,
  id,
  className,
  ...props
}: React.ComponentProps<"input"> & { label: string; id: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-xs font-bold tracking-wide uppercase">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="border-foreground bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-foreground mt-2 h-12 w-full rounded-full border-2 px-5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      />
    </div>
  );
}
