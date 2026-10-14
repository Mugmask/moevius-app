"use client";

import { ChevronsDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * La franja de abajo de la pantalla donde va la seña (fracción del alto, desde arriba):
 * cuando el borde de abajo del papel entra ahí, la seña se apaga.
 */
const ZONE_TOP = 0.86;

/**
 * La seña de que hay que bajar, fija abajo de la pantalla en el hueco que queda debajo
 * del ticket al entrar. Se apaga cuando el papel llega hasta ella y vuelve si subís: lo
 * miran IntersectionObserver (avisan solo al cruzar, nada por frame). Va adentro de la
 * sección del ticket, que arranca arriba de todo (la franja de "cerca del principio").
 * Con animaciones reducidas o sin JS el ticket se ve entero y la seña no aparece
 * (`pull-hint` en globals.css).
 */
export function PullHint({ soldOut }: { soldOut: boolean }) {
  // Dos cosas que avisan dos IntersectionObserver: si el papel ya llegó a la franja (o
  // pasó para abajo) y si seguís cerca del principio de la página. Al final de la página
  // el borde del papel vuelve a quedar arriba de la franja: ahí tampoco va la seña.
  const [paperReached, setPaperReached] = useState(false);
  const [nearTop, setNearTop] = useState(true);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ticket = document.querySelector("[data-ticket]");
    const top = topRef.current;
    if (!ticket || !top) return;
    const paper = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.rootBounds) return;
        setPaperReached(
          entry.isIntersecting || entry.boundingClientRect.top > entry.rootBounds.bottom,
        );
      },
      { rootMargin: `-${ZONE_TOP * 100}% 0px 0px 0px` },
    );
    const start = new IntersectionObserver(([entry]) => setNearTop(entry?.isIntersecting ?? true));
    paper.observe(ticket);
    start.observe(top);
    return () => {
      paper.disconnect();
      start.disconnect();
    };
  }, []);

  const hidden = paperReached || !nearTop;

  return (
    <>
      {/* "Cerca del principio": la primera pantalla de la página. */}
      <div
        ref={topRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-svh"
      />
      <div
        aria-hidden
        data-hidden={hidden || undefined}
        className="pull-hint label-mono text-foreground pointer-events-none fixed inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-30 flex-col items-center gap-2 transition-[opacity,translate,visibility] duration-300 data-hidden:invisible data-hidden:translate-y-3 data-hidden:opacity-0"
      >
        {soldOut ? "Bajá para ver el ticket" : "Bajá para sacar tu ticket"}
        <ChevronsDown className="text-primary size-5 animate-bounce" />
      </div>
    </>
  );
}
