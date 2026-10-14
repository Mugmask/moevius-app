"use client";

import { ArrowUpRight, Ticket } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { saveTicket, useSavedTickets, type SavedTicket } from "@/lib/saved-tickets";
import { cn } from "@/lib/utils";

/** Guarda en este dispositivo la compra o la entrada que se está mirando. No muestra nada. */
export function RememberTicket({ href, label, endsAt }: SavedTicket) {
  useEffect(() => {
    saveTicket({ href, label, endsAt });
  }, [href, label, endsAt]);
  return null;
}

/**
 * Acceso a las entradas desde el home, siempre visible: un botón redondo con el ícono de
 * entrada. Sin nada guardado lleva a /mis-entradas (para pedirlas al mail); con una
 * entrada guardada en este dispositivo va directo a ella (y lleva un punto naranja); con
 * varias, a /mis-entradas, que las lista.
 */
export function SavedTicketsLink({ className }: { className?: string }) {
  const tickets = useSavedTickets();
  const href = tickets.length === 1 ? tickets[0].href : "/mis-entradas";
  const label = tickets.length === 1 ? "Tu entrada" : "Mis entradas";
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        "border-foreground/50 text-foreground hover:border-foreground hover:bg-foreground/10 focus-visible:ring-foreground/30 relative grid size-11 place-items-center rounded-full border-2 bg-transparent transition-colors outline-none focus-visible:ring-4",
        className,
      )}
    >
      <Ticket aria-hidden className="size-5 -rotate-12" />
      <span className="sr-only">{label}</span>
      {tickets.length > 0 && (
        <span
          aria-hidden
          className="bg-primary ring-background absolute -top-0.5 -right-0.5 size-3 rounded-full ring-2"
        />
      )}
    </Link>
  );
}

/** La lista de /mis-entradas: lo guardado en este dispositivo, sobre el papel. */
export function SavedTicketsList() {
  const tickets = useSavedTickets();
  if (tickets.length === 0) return null;
  return (
    <section aria-labelledby="saved-tickets" className="mb-8">
      <h2 id="saved-tickets" className="font-mono text-xs font-bold tracking-[0.15em] uppercase">
        En este dispositivo
      </h2>
      <ul className="border-ink mt-2 divide-ink/20 divide-y-2 border-y-2">
        {tickets.map((ticket) => (
          <li key={ticket.href}>
            <Link
              href={ticket.href}
              className="focus-visible:outline-ink flex min-h-12 items-center justify-between gap-4 py-3 font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {ticket.label}
              <ArrowUpRight aria-hidden className="size-5 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
