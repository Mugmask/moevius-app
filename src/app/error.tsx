"use client"; // Los error boundaries tienen que ser Client Components.

import { ArrowUpRight, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { INK_BUTTON, INK_BUTTON_OUTLINE, PaperSlip } from "@/components/paper-slip";
import { SiteFooter } from "@/components/site-chrome";

/** Error inesperado en cualquier página (ej. la DB no responde). */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <main className="flex flex-1 flex-col">
        <PaperSlip label="Error · Se cortó la música" title="Algo se cortó" seed="error">
          <p>Tuvimos un problema para cargar esta página. Probá de nuevo en unos segundos.</p>
          <p className="mt-3">
            Si ya pagaste, tranqui: tu compra no se pierde y la entrada te llega igual por mail.
          </p>
          {error.digest && (
            <p className="mt-4 font-mono text-xs tracking-[0.15em] uppercase opacity-60">
              Código: {error.digest}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-3">
            <button type="button" onClick={() => retry()} className={INK_BUTTON}>
              Probar de nuevo
              <RotateCw aria-hidden className="text-primary size-5" />
            </button>
            <Link href="/" className={INK_BUTTON_OUTLINE}>
              Ir al inicio
              <ArrowUpRight aria-hidden className="size-5" />
            </Link>
          </div>
        </PaperSlip>
      </main>
      <SiteFooter />
    </>
  );
}
