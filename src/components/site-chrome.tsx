import Link from "next/link";

import { CONSUMER_DEFENSE_URL } from "@/lib/legal";

const LEGAL_LINKS = [
  { label: "Términos y condiciones", href: "/terminos" },
  { label: "Privacidad", href: "/privacidad" },
  { label: "Botón de arrepentimiento", href: "/arrepentimiento" },
];

const LINK =
  "hover:text-foreground inline-flex min-h-10 items-center justify-center transition-colors";

/**
 * El pie: una fila con los links legales. El Botón de arrepentimiento y el de
 * reclamos de Defensa del Consumidor tienen que estar a mano desde la home: van acá.
 */
export function SiteFooter() {
  return (
    <footer className="border-border border-t">
      <div className="label-mono text-muted-foreground mx-auto flex max-w-6xl flex-col items-center px-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
        <nav aria-label="Legal">
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-0 text-[0.6875rem] whitespace-nowrap sm:gap-x-6 sm:text-xs">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={LINK}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a href={CONSUMER_DEFENSE_URL} target="_blank" rel="noreferrer" className={LINK}>
                Defensa del consumidor
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
