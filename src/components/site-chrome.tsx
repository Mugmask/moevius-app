import Link from "next/link";

import { Pill, Wordmark } from "@/components/brand";

const SOCIAL_LINKS = [{ name: "Instagram", url: "https://www.instagram.com/moevius_" }];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <div className="border-foreground bg-card mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 rounded-full border-2 pr-2 pl-6">
        <Link href="/">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-semibold md:flex">
          <Link className="hover:bg-muted rounded-full px-4 py-2 transition-colors" href="/#events">
            Fechas
          </Link>
          <Link
            className="hover:bg-muted rounded-full px-4 py-2 transition-colors"
            href="/#production"
          >
            Productora
          </Link>
          <Link
            className="hover:bg-muted rounded-full px-4 py-2 transition-colors"
            href="/#how-it-works"
          >
            Tu entrada
          </Link>
        </nav>
        <Pill className="h-12" nativeButton={false} render={<Link href="/#events" />}>
          Comprar entrada
        </Pill>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto flex max-w-6xl flex-row justify-between gap-8 px-6 py-12">
        <p className="text-sm font-medium opacity-70">Mar del Plata, Argentina</p>
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <ul className="flex flex-wrap gap-2">
            {SOCIAL_LINKS.map(({ name, url }) => (
              <li key={name}>
                <a
                  href={url}
                  className="border-background hover:bg-background hover:text-foreground rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors"
                >
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
