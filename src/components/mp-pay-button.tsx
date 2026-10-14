import { ArrowUpRight } from "lucide-react";

import { INK_BUTTON } from "@/components/paper-slip";
import { cn } from "@/lib/utils";

/**
 * Lleva al checkout de Mercado Pago (API de Orders: no hay Brick, es un redirect). Es la
 * única forma de pagar, así que el botón lo nombra. En el celu MP abre su app si está
 * instalada, con la cuenta ya logueada.
 */
export function MpPayButton({
  checkoutUrl,
  className,
}: {
  checkoutUrl: string;
  className?: string;
}) {
  return (
    <a href={checkoutUrl} className={cn(INK_BUTTON, className)}>
      Pagar con Mercado Pago
      <ArrowUpRight aria-hidden className="text-primary size-5" />
    </a>
  );
}
