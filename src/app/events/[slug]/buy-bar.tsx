"use client";

import { ArrowDown } from "lucide-react";
import { useEffect, useState } from "react";

import { Pill } from "@/components/brand";
import { PRICE_FORMAT } from "@/lib/format";

/**
 * Barra fija abajo en mobile: en el celu la tarjeta de compra queda debajo de la info
 * del evento. Se esconde cuando la tarjeta ya está en pantalla y en desktop (lg), donde
 * la tarjeta va al costado.
 */
export function BuyBar({ targetId, fromPrice }: { targetId: string; fromPrice: number }) {
  const [targetVisible, setTargetVisible] = useState(true);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    // Que asome el borde de la tarjeta abajo de todo no alcanza: cuenta como visible
    // recién cuando entra en el 60% de arriba de la pantalla.
    const observer = new IntersectionObserver(([entry]) => setTargetVisible(entry.isIntersecting), {
      rootMargin: "0px 0px -40% 0px",
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  return (
    <div
      aria-hidden={targetVisible}
      className="border-foreground bg-background fixed inset-x-0 bottom-0 z-40 border-t-2 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-200 data-[hidden=true]:translate-y-full lg:hidden"
      data-hidden={targetVisible}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="leading-tight">
          <p className="text-muted-foreground text-xs font-bold uppercase">Desde</p>
          <p className="font-display text-2xl tracking-tight">{PRICE_FORMAT.format(fromPrice)}</p>
        </div>
        <Pill
          className="justify-center"
          tabIndex={targetVisible ? -1 : undefined}
          onClick={() =>
            document
              .getElementById(targetId)
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          Comprar
          <ArrowDown data-icon="inline-end" className="size-5" />
        </Pill>
      </div>
    </div>
  );
}
