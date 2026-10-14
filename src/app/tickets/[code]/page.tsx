import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AuraBackdrop } from "@/components/aura-backdrop";
import { MarkerFilter } from "@/components/doodles";
import { RememberTicket } from "@/components/saved-tickets";
import { TicketView } from "@/components/ticket-view";
import { savedTicketLabel } from "@/lib/events";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Tu entrada · Moevius",
  robots: { index: false },
};

/** La entrada suelta, para abrir desde el mail y mostrar en la puerta. */
export default async function TicketPage({ params }: PageProps<"/tickets/[code]">) {
  const { code } = await params;
  if (!/^[\w-]{16,32}$/.test(code)) notFound();

  const { data: ticket, error } = await createAdminClient()
    .from("tickets")
    .select(
      "code, status, event:events(*), order:orders(buyer_name), ticket_type:ticket_types(name)",
    )
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  if (!ticket) notFound();

  return (
    <main className="relative isolate flex flex-1 flex-col items-center px-4 pt-6 pb-16">
      <RememberTicket
        href={`/tickets/${ticket.code}`}
        label={savedTicketLabel(ticket.event)}
        endsAt={ticket.event.ends_at}
      />
      <MarkerFilter />
      <AuraBackdrop />

      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="label-mono text-muted-foreground hover:text-foreground mb-4 inline-flex min-h-11 items-center gap-2 transition-colors"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Volver a la fiesta
        </Link>
        <TicketView
          event={ticket.event}
          ticket={ticket}
          ticketType={ticket.ticket_type.name}
          holder={ticket.order.buyer_name}
        />
      </div>
      <p className="text-muted-foreground mt-10 max-w-xs text-center text-sm font-medium">
        Mostrá este QR en la puerta con el brillo al máximo. Deja pasar a una persona, una sola vez.
      </p>
    </main>
  );
}
