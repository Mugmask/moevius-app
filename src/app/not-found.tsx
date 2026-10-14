import Link from "next/link";

import { Pill } from "@/components/brand";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

/** 404 de toda la app: links vencidos, entradas o fechas que no existen. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-24">
        <p className="label-mono text-accent">(404)</p>
        <h1 className="font-display font-stretch-expanded mt-4 text-[clamp(2.75rem,13vw,7rem)] leading-[0.88] font-extrabold tracking-[-0.03em] uppercase">
          Acá no hay <span className="highlight">fiesta</span>
        </h1>
        <p className="text-muted-foreground mt-6 max-w-md text-lg">
          La página que buscás no existe o el link ya no funciona. Si venías a buscar tu entrada,
          abrila desde el mail de la compra.
        </p>
        <Pill className="mt-10 self-start" nativeButton={false} render={<Link href="/" />}>
          Ir a la fiesta
        </Pill>
      </main>
      <SiteFooter />
    </>
  );
}
