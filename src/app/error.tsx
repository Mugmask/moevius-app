"use client"; // Los error boundaries tienen que ser Client Components.

import Link from "next/link";
import { useEffect } from "react";

import { Pill } from "@/components/brand";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

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
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center px-6 py-24">
        <h1 className="font-display text-6xl leading-[0.9] tracking-tight uppercase sm:text-7xl">
          Algo se <span className="highlight">cortó</span>
        </h1>
        <p className="mt-6 max-w-md text-lg font-medium">
          Tuvimos un problema para cargar esta página. Probá de nuevo en unos segundos. Si ya
          pagaste, tranqui: tu compra no se pierde y la entrada te llega igual por mail.
        </p>
        {error.digest && (
          <p className="text-muted-foreground mt-4 text-xs font-bold">Código: {error.digest}</p>
        )}
        <div className="mt-10 flex flex-wrap gap-3">
          <Pill onClick={() => retry()}>Probar de nuevo</Pill>
          <Pill tone="paper" nativeButton={false} render={<Link href="/" />}>
            Ir al inicio
          </Pill>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
