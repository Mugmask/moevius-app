import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { SiteFooter } from "@/components/site-chrome";
import { LEGAL } from "@/lib/legal";

/**
 * Las páginas legales (términos, privacidad, arrepentimiento): una hoja de papel ancha
 * como el ticket, con texto corrido legible. Los títulos de sección van con `<h2>` y el
 * texto con `<p>`/`<ul>` adentro de `children`: los estilos los pone el contenedor.
 */
export function LegalDocument({
  label,
  title,
  showUpdatedAt = true,
  children,
}: {
  label: string;
  title: string;
  showUpdatedAt?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="relative isolate flex-1 px-3 pt-6 pb-12 sm:px-5 sm:pt-10 sm:pb-20">
        <div aria-hidden className="grain pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="glow text-accent absolute top-0 left-1/2 -z-20 size-[120vw] max-w-[56rem] -translate-x-1/2 rounded-full opacity-20" />
        </div>

        {/* Sin navbar: la vuelta al ticket va arriba de la hoja. */}
        <div className="mx-auto mb-4 max-w-3xl">
          <Link
            href="/"
            className="label-mono text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-2 transition-colors"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Volver a la fiesta
          </Link>
        </div>
        <article className="text-ink relative mx-auto max-w-3xl">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 shadow-[0_24px_30px_oklch(0_0_0/0.55)]"
          />
          <div className="bg-paper paper-crumple px-5 pt-10 pb-12 sm:px-12 sm:pt-14 sm:pb-16">
            <header className="border-ink border-b-2 pb-6">
              <p className="font-mono text-xs font-bold tracking-[0.2em] uppercase opacity-60 sm:text-sm">
                {label}
              </p>
              <h1 className="font-display font-stretch-condensed mt-3 text-[clamp(2rem,8.5vw,4rem)] break-words leading-[0.9] font-extrabold uppercase">
                {title}
              </h1>
              {showUpdatedAt && (
                <p className="mt-4 font-mono text-xs tracking-[0.15em] uppercase opacity-60">
                  Última actualización: {LEGAL.updatedAt}
                </p>
              )}
            </header>
            <div className="[&_a]:decoration-ink/40 hover:[&_a]:decoration-ink mt-8 font-sans text-[0.9375rem] leading-relaxed sm:text-base [&_a]:font-semibold [&_a]:underline [&_a]:decoration-2 [&_a]:underline-offset-4 [&_h2]:font-display [&_h2]:font-stretch-condensed [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:leading-tight [&_h2]:font-extrabold [&_h2]:uppercase [&_h2:first-child]:mt-0 [&_li]:mt-1.5 [&_p]:mt-3 [&_strong]:font-semibold [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
              {children}
            </div>
          </div>
          <div aria-hidden className="torn-edge absolute inset-x-0 top-full h-3.5" />
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
