import Image from "next/image";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Botón pill grande. `tone="solid"` es la acción principal (naranja: solo para lo que
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

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* El isotipo: la M de Moevius como blob, donde el logo entero no se lee. */}
      <Image src="/brand/m-blob-64.png" alt="" width={24} height={24} className="rounded-md" />
      <span className="font-display font-stretch-expanded text-base font-extrabold tracking-tight">
        MOEVIUS
      </span>
    </div>
  );
}
