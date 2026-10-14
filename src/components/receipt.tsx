import { cn } from "@/lib/utils";

/**
 * Piezas del ticket con forma de recibo térmico: filas etiqueta/valor y separadores
 * punteados. El texto va en mono y mayúsculas (lo pone el contenedor).
 */

/** Fila del recibo: etiqueta a la izquierda, valor a la derecha. Va dentro de un `<dl>`. */
export function ReceiptRow({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", className)}>
      <dt className="shrink-0 opacity-60">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}

/** Separador de recibo: línea punteada de punta a punta. */
export function ReceiptRule({ className }: { className?: string }) {
  return <hr className={cn("border-ink/35 my-6 border-t-2 border-dashed", className)} />;
}
