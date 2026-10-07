import { ArrowUpRight } from "lucide-react";

import { Pill } from "@/components/brand";

/**
 * Lleva al checkout de Mercado Pago (API de Orders: no hay Brick, es un redirect).
 * En el celu MP abre su app si está instalada, con la cuenta ya logueada.
 */
export function MpPayButton({ checkoutUrl }: { checkoutUrl: string }) {
  return (
    <Pill className="w-full justify-center" nativeButton={false} render={<a href={checkoutUrl} />}>
      Pagar con Mercado Pago
      <ArrowUpRight data-icon="inline-end" className="size-5" />
    </Pill>
  );
}
