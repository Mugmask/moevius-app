import Link from "next/link";

import { Pill, Wordmark } from "@/components/brand";

const SOCIAL_LINKS = [{ name: "Instagram", url: "https://www.instagram.com/moevius_" }];

/**
 * El header de las páginas internas (orden, 404, error) es un ticket: el cuerpo
 * translúcido lleva la marca y el talón lima es el botón para ir a comprar (`/#tickets`
 * saca el ticket de la home y baja hasta el talón), separado por el troquel. Al pasar por
 * encima, el talón se inclina como si lo arrancaras.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <div className="mx-auto flex h-14 max-w-6xl drop-shadow-[0_10px_24px_oklch(0_0_0/0.45)]">
        <div className="border-border bg-background/60 notch-right relative flex min-w-0 flex-1 items-center gap-5 overflow-hidden rounded-l-full border border-r-0 pr-4 pl-5 backdrop-blur-xl">
          <Link href="/" aria-label="Moevius, inicio" className="shrink-0">
            <Wordmark spin />
          </Link>
          {/* Cuánto bajaste: se llena con el scroll (solo donde hay scroll-driven animations). */}
          <span
            aria-hidden
            className="scroll-progress bg-primary absolute inset-x-0 bottom-0 h-0.5"
          />
        </div>

        <div className="notch-left relative shrink-0 origin-bottom-left transition-transform duration-300 ease-out hover:translate-x-0.5 hover:translate-y-1 hover:rotate-[5deg] motion-reduce:transition-none motion-reduce:hover:transform-none">
          {/* El troquel: línea punteada entre las dos muescas. */}
          <span
            aria-hidden
            className="border-primary-foreground/35 pointer-events-none absolute inset-y-2.5 left-0 z-10 border-l-2 border-dashed"
          />
          <Pill
            className="h-14 rounded-none rounded-r-full pr-6 pl-5"
            nativeButton={false}
            render={<Link href="/#tickets" />}
          >
            Entradas
          </Pill>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-border border-t">
      <div className="label-mono text-muted-foreground mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="space-y-1">
          <p className="text-foreground">¿Dudas? Escribinos por Instagram.</p>
          <p>© Moevius · Mar del Plata</p>
        </div>
        <ul className="flex gap-2">
          {SOCIAL_LINKS.map(({ name, url }) => (
            <li key={name}>
              <a
                href={url}
                className="border-input hover:bg-foreground hover:text-background text-foreground rounded-full border px-4 py-2"
              >
                {name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
