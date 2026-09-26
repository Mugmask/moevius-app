import Link from "next/link";

import { Pill, Star } from "@/components/brand";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

/** 404 de toda la app: links vencidos, entradas o fechas que no existen. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center px-6 py-24">
        <p className="border-foreground bg-card inline-flex items-center gap-2 rounded-full border-2 px-4 py-1.5 text-xs font-bold">
          <span className="bg-primary size-2 rounded-full" />
          Error 404
        </p>
        <h1 className="font-display relative mt-6 text-6xl leading-[0.9] tracking-tight uppercase sm:text-7xl">
          Acá no hay <span className="highlight">fiesta</span>
          <Star aria-hidden className="absolute -top-6 -right-10 size-12 rotate-12" />
        </h1>
        <p className="mt-6 max-w-md text-lg font-medium">
          La página que buscás no existe o el link ya no funciona. Si venías a buscar tu entrada,
          abrila desde el mail de la compra.
        </p>
        <Pill className="mt-10" nativeButton={false} render={<Link href="/#events" />}>
          Ver las próximas fechas
        </Pill>
      </main>
      <SiteFooter />
    </>
  );
}
