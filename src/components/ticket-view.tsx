import { Blob, Highlight, Scribble, Star } from "@/components/doodles";
import { MoeviusLogo } from "@/components/logo";
import { RealQr } from "@/components/real-qr";
import { editionOf, formatEventDates } from "@/lib/events";
import type { Tables } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<Tables<"tickets">["status"], string> = {
  valid: "Válida",
  used: "Usada",
  void: "Anulada",
};

type Props = {
  event: Tables<"events">;
  ticket: Pick<Tables<"tickets">, "code" | "status">;
  ticketType: string;
  holder: string;
  className?: string;
};

/** Papel térmico del ticket, como el de la home: mono, mayúsculas, arrugado. */
const PAPER = "bg-paper paper-crumple relative px-5 font-mono text-[0.8125rem] uppercase sm:px-7";

/**
 * Una entrada real, impresa en el mismo papel que el ticket de la home: arriba la fiesta
 * (logo, fecha con resaltador, lugar y titular) y, después del troquel, el talón con el QR
 * grande. Los dibujos van en los márgenes, nunca sobre el QR (tiene que escanear en la
 * puerta). Si ya se usó o se anuló, el QR se apaga y lleva un sello rojo encima. La usan
 * la página de la compra y la de la entrada; el filtro de los dibujos (`MarkerFilter`) lo
 * pone la página.
 */
export function TicketView({ event, ticket, ticketType, holder, className }: Props) {
  const { day, month, year, time } = formatEventDates(event);
  const edition = editionOf(event.title);
  const valid = ticket.status === "valid";

  return (
    <article className={cn("text-ink relative isolate w-full max-w-sm", className)}>
      <div aria-hidden className="absolute inset-0 -z-10 shadow-[0_24px_30px_oklch(0_0_0/0.55)]" />

      <div className={cn(PAPER, "ticket-notch-bottom pt-11 pb-7")}>
        <Blob seed={21} className="text-aura absolute top-1 -left-3 size-10 opacity-70" />
        <Scribble shape="sparkle" className="text-accent absolute top-2 right-4 size-6 rotate-12" />

        <div className="flex items-center gap-3 font-bold tracking-[0.2em] whitespace-nowrap">
          <span>{edition}</span>
          <span aria-hidden className="border-ink h-0 flex-1 border-t-2" />
          <span>{year}</span>
        </div>
        <h2 className="mt-3">
          <MoeviusLogo className="mx-auto w-full" />
          <span className="sr-only">{event.title}</span>
        </h2>

        <p className="font-display font-stretch-condensed mt-5 text-[2.25rem] leading-[0.9] font-extrabold">
          <Highlight seed={5}>
            {day} {month.slice(0, 3)}
          </Highlight>
        </p>
        <p className="mt-2 tabular-nums opacity-70">{time.replace(" — ", " → ")}</p>
        <p className="mt-1 font-bold tracking-[0.1em]">
          {event.venue} · {event.neighborhood}
        </p>

        <div className="border-ink mt-5 flex items-end justify-between gap-4 border-t-2 pt-3">
          <div className="min-w-0">
            <p className="tracking-[0.15em] opacity-60">Titular</p>
            <p className="font-display font-stretch-condensed mt-1 text-2xl leading-[0.95] font-extrabold break-words normal-case">
              {holder}
            </p>
          </div>
          <p className="shrink-0 text-right font-bold tracking-[0.1em]">{ticketType}</p>
        </div>
      </div>

      {/* Talón: el QR grande, separado por el troquel. */}
      <div className={cn(PAPER, "ticket-notch-top pt-7 pb-6")}>
        <div
          aria-hidden
          className="border-ink/30 absolute inset-x-4 top-0 border-t-2 border-dashed"
        />
        <Star seed={11} className="text-accent absolute top-4 -left-1 size-7 -rotate-12" />
        <Scribble shape="spiral" className="text-aura absolute right-1 bottom-12 size-8" />

        <div className="relative mx-auto w-fit">
          <RealQr code={ticket.code} className={cn("size-56", !valid && "opacity-30")} />
          {!valid && (
            <p className="border-accent text-accent font-display font-stretch-expanded absolute top-1/2 left-1/2 -translate-1/2 -rotate-12 rounded-md border-[3px] px-3 py-1 text-3xl font-extrabold tracking-tight mix-blend-multiply">
              {STATUS_LABEL[ticket.status]}
            </p>
          )}
        </div>
        <p className="mt-4 flex items-center justify-between gap-3 tracking-[0.15em]">
          <span className="truncate opacity-60">{ticket.code.slice(0, 10)}</span>
          <span className={cn("shrink-0 font-bold", !valid && "text-accent")}>
            {valid && <span aria-hidden>✓ </span>}
            {STATUS_LABEL[ticket.status]}
          </span>
        </p>
      </div>

      <div aria-hidden className="torn-edge absolute inset-x-0 top-full h-3.5" />
    </article>
  );
}
