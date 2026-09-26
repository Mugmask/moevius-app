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

/** La entrada como objeto físico. La usa el hero de la landing y la entrada real. */
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
        "border-foreground bg-card shadow-hard w-full max-w-xs shrink-0 rounded-2xl border-2",
        className,
      )}
    >
      <header className="border-foreground flex items-center justify-between gap-3 border-b-2 px-5 py-3">
        <span className="text-xs font-bold tracking-wide uppercase">{label}</span>
        {badge}
      </header>

      <div className="px-5 py-6">
        <p className="text-muted-foreground text-xs font-bold">
          {day} {month} · {time}
        </p>
        <h2 className="font-display mt-1 text-3xl leading-none tracking-tight uppercase">
          Moevius
          <br />
          {month}
        </h2>
        <p className="mt-2 text-sm font-bold">
          {venue} · {neighborhood}
        </p>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-bold">{detailLabel}</p>
            <p className="font-display truncate text-2xl tracking-tight">{detail}</p>
          </div>
          {qr}
        </div>
      </div>

      {/* Perforación de entrada: muescas laterales y línea de corte. */}
      <div className="relative">
        <span className="bg-background border-foreground absolute -top-3 -left-3 size-5 rounded-full border-2" />
        <span className="bg-background border-foreground absolute -top-3 -right-3 size-5 rounded-full border-2" />
        <div className="border-foreground border-t-2 border-dashed" />
      </div>

      <footer className="flex items-center justify-between gap-3 px-5 py-3 text-[0.65rem] font-bold">
        <span className="truncate uppercase">{code}</span>
        <span className="text-muted-foreground shrink-0">moevius.app</span>
      </footer>
    </article>
  );
}

const QR_SIZE = 13;

/**
 * Patrón de QR decorativo, calculado una sola vez al cargar el módulo con un LCG
 * de semilla fija: mismos bits en servidor y cliente, así que no rompe la hidratación.
 */
const QR_CELLS = (() => {
  let seed = 0x4d4f45;
  return Array.from({ length: QR_SIZE * QR_SIZE }, (_, i) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const row = Math.floor(i / QR_SIZE);
    const col = i % QR_SIZE;
    // Los tres ojos de posicionamiento van sólidos, como en un QR de verdad.
    const inEye =
      (row < 4 && col < 4) || (row < 4 && col >= QR_SIZE - 4) || (row >= QR_SIZE - 4 && col < 4);
    if (inEye) {
      const r = row < 4 ? row : QR_SIZE - 1 - row;
      const c = col < 4 ? col : QR_SIZE - 1 - col;
      return r === 1 || c === 1 ? false : r < 3 && c < 3;
    }
    return seed % 100 > 52;
  });
})();

export function FakeQr() {
  return (
    <div
      aria-hidden
      className="border-foreground grid shrink-0 gap-px rounded-md border-2 p-1.5"
      style={{ gridTemplateColumns: `repeat(${QR_SIZE}, 1fr)` }}
    >
      {QR_CELLS.map((on, i) => (
        <span key={i} className={cn("size-0.75", on ? "bg-foreground" : "bg-transparent")} />
      ))}
    </div>
  );
}
