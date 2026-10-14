import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { INK_BUTTON, PaperSlip } from "@/components/paper-slip";
import { SiteFooter } from "@/components/site-chrome";
import { cn } from "@/lib/utils";

/** 404 de toda la app: links vencidos, entradas o fechas que no existen. */
export default function NotFound() {
  return (
    <>
      <main className="flex flex-1 flex-col">
        <PaperSlip label="Error 404 · Sin ticket" title="Acá no hay fiesta" seed="404">
          <p>
            La página que buscás no existe o el link ya no funciona. Si venías a buscar tu entrada,
            abrila desde el mail de la compra o pedila de nuevo en{" "}
            <Link href="/mis-entradas" className="font-semibold underline underline-offset-4">
              Mis entradas
            </Link>
            .
          </p>
          <Link href="/" className={cn(INK_BUTTON, "mt-6")}>
            Ir a la fiesta
            <ArrowUpRight aria-hidden className="text-primary size-5" />
          </Link>
        </PaperSlip>
      </main>
      <SiteFooter />
    </>
  );
}
