"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/** Tope de espera: si las fuentes tardan más, se muestra igual (nunca bloquea). */
const MAX_WAIT_MS = 3000;

/**
 * Tapa la página hasta que está lista para el tirón: hidratada (TicketPull ya midió y
 * acomodó el papel) y con las fuentes cargadas, que cambian el alto del ticket. Así no
 * se ve el ticket saltar ni el primer scroll trabado. Sin JS no aparece (ver
 * `.page-loader` en globals.css) y con animaciones reducidas se va sin fundido.
 */
export function PageLoader() {
  const [state, setState] = useState<"loading" | "leaving" | "gone">("loading");

  useEffect(() => {
    let cancelled = false;
    const timeout = new Promise((resolve) => setTimeout(resolve, MAX_WAIT_MS));
    void Promise.race([document.fonts.ready, timeout]).then(() => {
      // Un frame más: que el navegador pinte el ticket ya acomodado antes de destaparlo.
      requestAnimationFrame(() => {
        if (cancelled) return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        setState(reduced ? "gone" : "leaving");
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "gone") return null;
  return (
    <div
      aria-hidden
      onTransitionEnd={() => setState("gone")}
      className={cn(
        "page-loader bg-background fixed inset-0 z-50 flex-col items-center justify-center gap-4 transition-opacity duration-500",
        state === "leaving" && "pointer-events-none opacity-0",
      )}
    >
      <span className="font-display font-stretch-expanded text-3xl font-extrabold tracking-tight">
        MOEVIUS
      </span>
      <span className="label-mono text-muted-foreground flex items-center gap-2">
        <span className="bg-primary size-2 animate-pulse rounded-full motion-reduce:animate-none" />
        Imprimiendo tu ticket
      </span>
    </div>
  );
}
