import { cn } from "@/lib/utils";

type TicketCardProps = {
  label: string;
  badge?: React.ReactNode;
  day: string;
  month: string;
  time: string;
  venue: string;
  neighborhood: string;
  /** Texto chico arriba del número grande (ej. "PRECIO", "TITULAR"). */
  detailLabel: string;
  detail: string;
  qr: React.ReactNode;
  code: string;
  className?: string;
};

/** La entrada como objeto físico. La usan la página de la compra y la entrada suelta. */
export function TicketCard({
  label,
  badge,
  day,
  month,
  time,
  venue,
  neighborhood,
  detailLabel,
  detail,
  qr,
  code,
  className,
}: TicketCardProps) {
  return (
    <article
      className={cn(
        "border-border bg-card shadow-hard relative w-full max-w-xs shrink-0 overflow-hidden rounded-3xl border",
        className,
      )}
    >
      <header className="border-border flex items-center justify-between gap-3 border-b px-5 py-3">
        <span className="label-mono text-muted-foreground">{label}</span>
        {badge}
      </header>

      <div className="px-5 py-6">
        <p className="label-mono text-muted-foreground">
          {day} {month} · {time}
        </p>
        <h2 className="font-display font-stretch-expanded mt-2 text-3xl leading-[0.9] font-extrabold tracking-tight uppercase">
          Moevius
          <br />
          <span className="highlight">{month}</span>
        </h2>
        <p className="mt-3 text-sm font-medium">
          {venue} · {neighborhood}
        </p>

        {/* En el celu el titular va arriba a todo el ancho: al lado del QR no entraba y se
            cortaba, y en la puerta se compara con el DNI. */}
        <div className="mt-6 flex flex-col items-start gap-4 min-[420px]:flex-row min-[420px]:items-end min-[420px]:justify-between">
          <div className="min-w-0">
            <p className="label-mono text-muted-foreground">{detailLabel}</p>
            <p className="font-display mt-1 text-2xl leading-tight font-bold tracking-tight break-words">
              {detail}
            </p>
          </div>
          {qr}
        </div>
      </div>

      {/* Perforación de entrada: muescas laterales y línea de corte. */}
      <div className="relative">
        <span className="bg-background border-border absolute -top-3 -left-3 size-6 rounded-full border" />
        <span className="bg-background border-border absolute -top-3 -right-3 size-6 rounded-full border" />
        <div className="border-border mx-4 border-t border-dashed" />
      </div>

      <footer className="label-mono text-muted-foreground flex items-center justify-between gap-3 px-5 py-3">
        <span className="truncate">{code}</span>
        <span className="shrink-0">moevius.app</span>
      </footer>
    </article>
  );
}
