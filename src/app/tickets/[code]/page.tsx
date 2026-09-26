import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Wordmark } from "@/components/brand";
import { TicketView } from "@/components/ticket-view";
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
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-12">
      <Wordmark />
      <TicketView
        className="max-w-sm [&_[role=img]]:size-40"
        event={ticket.event}
        ticket={ticket}
        ticketType={ticket.ticket_type.name}
        holder={ticket.order.buyer_name}
      />
      <p className="text-muted-foreground max-w-xs text-center text-sm font-medium">
        Mostrá este QR en la puerta con el brillo al máximo. Deja pasar a una persona, una sola vez.
      </p>
    </main>
  );
}
