import { RealQr } from "@/components/real-qr";
import { TicketCard } from "@/components/ticket-card";
import type { Tables } from "@/lib/supabase/database.types";
import { formatEventDates } from "@/lib/events";
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

/** Una entrada real, con su QR. La usan la página de la compra y la de la entrada. */
export function TicketView({ event, ticket, ticketType, holder, className }: Props) {
  const { day, month, time } = formatEventDates(event);

  return (
    <TicketCard
      className={className}
      label={`Entrada ${ticketType}`}
      badge={
        <span
          className={cn(
            "border-foreground inline-flex shrink-0 items-center rounded-full border-2 px-3 py-1 text-xs font-bold",
            ticket.status === "valid"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {STATUS_LABEL[ticket.status]}
        </span>
      }
      day={day}
      month={month}
      time={time}
      venue={event.venue}
      neighborhood={event.neighborhood}
      detailLabel="TITULAR"
      detail={holder}
      qr={<RealQr code={ticket.code} className="size-28" />}
      code={ticket.code.slice(0, 10)}
    />
  );
}
