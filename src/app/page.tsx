import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";

import { startCheckout } from "@/components/checkout/actions";
import { TicketCheckout } from "@/components/checkout/ticket-checkout";
import { MarkerFilter, Star } from "@/components/doodles";
import { PageLoader } from "@/components/page-loader";
import { ReceiptRow, ReceiptRule } from "@/components/receipt";
import { SiteFooter } from "@/components/site-chrome";
import { SubscribeForm } from "@/components/subscribe-form";
import { TicketPull } from "@/components/ticket-pull";
import { getFeaturedEvent, type EventListing } from "@/lib/events";
import { PRICE_FORMAT } from "@/lib/format";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const event = await getFeaturedEvent();
  if (!event) return { title: "Moevius" };

  const title = `Entradas ${event.title} · ${event.day} ${event.month}`;
  const description =
    event.description[0] ?? `${event.venue}, ${event.neighborhood}. Entradas con QR al mail.`;
  return { title, description, openGraph: { title, description } };
}

export default async function Home() {
  const event = await getFeaturedEvent();

  if (!event) {
    return (
      <>
        <main className="flex-1">
          <ComingSoon />
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <PageLoader />
      {/* La home es el ticket: la máquina arriba y se tira para leerlo y comprar. Sin
          navbar ni portada. Las luces y el grano van en una capa fija del tamaño de la
          pantalla: al scrollear no se repintan (una del alto de la página, con blend
          encima, se recalculaba en cada frame del tirón). */}
      <main className="relative isolate flex-1">
        <div aria-hidden className="grain pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <Lights placement="ticket" />
        </div>
        <section id="ticket" className="relative px-3 pt-12 pb-24 sm:px-5 sm:pt-16">
          <TicketHeading event={event} />
          <div className="mx-auto mt-10 max-w-[28rem] sm:mt-12 sm:max-w-[34rem] lg:max-w-[40rem]">
            <TicketPull machine={<Machine />}>
              <Ticket event={event} action={startCheckout.bind(null, event.slug)} />
            </TicketPull>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

/* -------------------------------------------------------------------------- */

/** Luz de la pista de fondo para "próxima edición": manchas rojas difuminadas con grano. */
function Aura() {
  return (
    <div aria-hidden className="grain pointer-events-none absolute inset-0 -z-10">
      <Lights placement="coming-soon" />
      <div className="from-background absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t to-transparent" />
    </div>
  );
}

/**
 * Las manchas de luz, por debajo del grano (`-z-20`). Son degradados (`glow`), no
 * círculos con `blur`: un blur grande animado se re-rasteriza en cada frame y traba el
 * scroll en el celu. Las del ticket van quietas: animadas, el fondo (con el grano
 * mezclado encima) se recomponía entero en cada frame mientras se scrollea.
 */
function Lights({ placement }: { placement: "coming-soon" | "ticket" }) {
  const blob = "glow pointer-events-none absolute -z-20 rounded-full";
  if (placement === "coming-soon") {
    return (
      <div aria-hidden>
        <div
          className={cn(
            blob,
            "animate-drift text-accent -top-[10%] -left-[30%] size-[110vw] max-w-[52rem] opacity-55 lg:left-[5%]",
          )}
        />
        <div
          className={cn(
            blob,
            "animate-drift text-accent top-[30%] -right-[35%] size-[80vw] max-w-[36rem] opacity-45 [animation-delay:-6s] lg:right-0",
          )}
        />
        <div
          className={cn(
            blob,
            "animate-drift text-primary top-[60%] left-[10%] size-[45vw] max-w-[20rem] opacity-15 [animation-delay:-12s]",
          )}
        />
      </div>
    );
  }
  return (
    <div aria-hidden>
      <div
        className={cn(
          blob,
          "text-accent top-[5%] -left-[35%] size-[110vw] max-w-[48rem] opacity-25 [animation-delay:-3s] lg:left-[-5%]",
        )}
      />
      <div
        className={cn(
          blob,
          "text-accent top-[50%] -right-[40%] size-[110vw] max-w-[48rem] opacity-25 [animation-delay:-9s] lg:right-[-5%]",
        )}
      />
    </div>
  );
}

/** Encabezado de la página, centrado sobre la máquina: qué fiesta es y cómo se compra. */
function TicketHeading({ event }: { event: EventListing }) {
  const soldOut = event.availability === "sold-out";
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="label-mono text-foreground flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span>{event.title}</span>
        <span aria-hidden>·</span>
        <span>
          {event.day} {event.month}
        </span>
        <span aria-hidden>·</span>
        <span>{event.venue}</span>
      </p>
      <h1 className="font-display font-stretch-expanded mt-4 text-[clamp(2.5rem,11vw,5.5rem)] leading-[0.86] font-extrabold tracking-[-0.03em] uppercase">
        Sacá tu <span className="highlight">ticket</span>
      </h1>
      <p className="text-muted-foreground mx-auto mt-5 max-w-md text-lg text-pretty">
        {soldOut
          ? "Esta edición se agotó. Igual te dejamos el ticket con toda la info."
          : "Bajá y tirá del ticket: tiene toda la info y, en el talón, lo completás y vas a pagar."}
      </p>
      {soldOut && (
        <div className="mx-auto mt-6 max-w-md">
          <p className="text-muted-foreground">Dejanos tu mail y te avisamos de la próxima.</p>
          <SubscribeForm />
        </div>
      )}
    </div>
  );
}

/**
 * La máquina: solo la chapa de acero cepillado (con un brillo que la cruza cada tanto) y
 * la ranura hundida de donde sale el papel. Todo CSS: no suma imágenes ni JS a la carga.
 *
 * Medidas atadas a TicketPull y a Ticket:
 * - La rendija empieza a 53.5px del borde de abajo de la máquina (borde 1.5 + pb-6 + py-2
 *   del nicho + h-5 de la rendija). El papel nace 3.5px más abajo, adentro de lo negro
 *   (si nace justo en el borde se ve una línea blanca): es el `-mt-[50px]` de TicketPull.
 *   Abajo de la ranura sigue el cuerpo de la máquina y el papel le pasa por delante,
 *   como en una máquina real.
 * - La rendija tiene que ser bastante más ancha que el papel, como en una máquina real:
 *   en el celu la máquina se sale 8px de la columna (-mx-2) y la rendija empieza a 5.5px de
 *   la columna (borde 1.5 + px-2 + px-1 del nicho); el papel, a 12px (mx-3). Desde sm,
 *   25.5px contra 40px (sm:mx-10). La sombra de la ranura (`inset-x`) es esa diferencia. En
 *   el celu la rendija tiene puntas menos redondas: con `rounded-full` las curvas caían
 *   encima de las esquinas del papel.
 * - La sombra de la ranura baja apenas 3px: el gris queda pegado al labio de la rendija.
 *   Si se pasa, se ve más grande que la ranura de donde sale el ticket.
 */
function Machine() {
  return (
    <div
      aria-hidden
      className="chassis relative -mx-2 rounded-[1.75rem] px-2 pt-6 pb-6 sm:mx-0 sm:px-4"
    >
      <div className="chassis-sheen" />

      {/* Ranura: nicho hundido con la rendija adentro. La sombra va arriba del papel:
          z-20, el papel es z-10 (ver TicketPull). */}
      <div className="slot-bezel rounded-2xl px-1 py-2 sm:px-2">
        <div className="slot-opening relative h-5 rounded-lg sm:rounded-full">
          {/* Sombra sobre el papel: su mismo ancho, negra adentro de la rendija y con el gris
              pegado al labio (baja 3px). */}
          <div className="slot-depth pointer-events-none absolute inset-x-[6.5px] top-0 z-20 h-[calc(100%+3px)] sm:inset-x-[14.5px]" />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/** Papel del ticket: recibo térmico arrugado, en mono y mayúsculas; crece en desktop. */
const RECEIPT_PAPER =
  "bg-paper paper-crumple relative px-4 font-mono text-[0.8125rem] leading-relaxed uppercase sm:px-10 sm:text-sm lg:px-12 lg:text-[0.9375rem]";

/**
 * La entrada que sale de la máquina, armada como un afiche: arriba la fiesta con tipografía
 * grande (la fecha es la protagonista, después el lugar y el lineup); abajo, separado por
 * el troquel, el talón donde se completa la compra (ver TicketCheckout). Al pie, el precio y el código de barras: es lo primero
 * que asoma (`data-ticket-stub`, ver TicketPull).
 */
function Ticket({
  event,
  action,
}: {
  event: EventListing;
  action: React.ComponentProps<typeof TicketCheckout>["action"];
}) {
  const soldOut = event.availability === "sold-out";
  // "Moevius Vol. 13" → "Vol. 13": el nombre va gigante arriba.
  const edition = event.title.replace(/^moevius\s*/i, "");
  // "VIE 13" → el número va enorme y el día de la semana, chico al lado.
  const [weekday, dayNumber] = event.day.split(" ");

  return (
    <article data-ticket className="text-ink relative isolate mx-3 sm:mx-10">
      <MarkerFilter />

      {/* Sombra del papel: un box-shadow que se pinta una vez y viaja con el ticket. Con
          `filter: drop-shadow` la GPU recalculaba el desenfoque en cada frame del tirón
          (el ticket mide miles de px a densidad 3x) y trababa el scroll en el celu. */}
      <div aria-hidden className="absolute inset-0 -z-10 shadow-[0_24px_30px_oklch(0_0_0/0.55)]" />

      {/* Arriba del título queda papel en blanco: es lo último que sale, y así "MOEVIUS" no
          termina pegado a la ranura (y queda un tramo más para scrollear). */}
      <div className={cn(RECEIPT_PAPER, "ticket-notch-bottom pt-24 pb-9 lg:pt-28")}>
        {/* La estrella va adentro del papel (lo que se pasa del borde se vería salir por
            fuera de la ranura), debajo del título (`relative` en el header) y pegada a su
            esquina: el `top` sigue al padding de arriba. */}
        <Star
          seed={3}
          className="text-accent absolute top-16 right-1 size-16 rotate-12 sm:top-[4.25rem] sm:right-2 sm:size-24 lg:top-[4.5rem]"
        />
        <header className="relative">
          <h2 className="font-display font-stretch-expanded text-center text-[clamp(2.75rem,12vw,4.75rem)] leading-[0.85] font-extrabold tracking-[-0.02em]">
            <span aria-hidden>Moevius</span>
            <span className="sr-only">{event.title}</span>
          </h2>
          {edition && (
            <p
              aria-hidden
              className="border-ink font-display font-stretch-condensed mt-5 border-t-2 pt-2 text-center text-3xl leading-none font-extrabold tracking-tight sm:text-4xl"
            >
              {edition}
            </p>
          )}
        </header>

        {/* La fecha es la protagonista: el número enorme y al lado mes, día y horario. */}
        <section className="border-ink mt-8 border-y-2 py-5" aria-label="Fecha y horario">
          <p className="sr-only">
            {event.day} de {event.month} de {event.year}, de {event.time}
          </p>
          <div aria-hidden className="grid grid-cols-[auto_1fr] items-center gap-x-4 sm:gap-x-6">
            <span className="font-display font-stretch-condensed text-[clamp(6rem,32vw,9.5rem)] leading-[0.75] font-extrabold tracking-[-0.04em] tabular-nums">
              {dayNumber}
            </span>
            <div className="min-w-0">
              <p className="font-display font-stretch-extra-condensed text-[clamp(1.5rem,7.5vw,2.75rem)] leading-[0.9] font-extrabold whitespace-nowrap">
                {event.month}
              </p>
              <p className="mt-1 tracking-[0.15em]">
                {weekday} · {event.year}
              </p>
              <p className="font-display font-stretch-condensed mt-3 text-2xl leading-none font-bold tabular-nums sm:text-3xl">
                {event.time.replace("—", "→")}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="ticket-venue">
          <p className="tracking-[0.15em] opacity-60">Dónde</p>
          <h3
            id="ticket-venue"
            className="font-display font-stretch-expanded mt-1 text-[clamp(1.75rem,9vw,2.75rem)] leading-[0.9] font-extrabold tracking-tight"
          >
            {event.venue}
          </h3>
          <p className="mt-2">{event.neighborhood}</p>
          <a
            href={event.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex min-h-11 items-center gap-1.5 font-semibold underline decoration-2 underline-offset-4"
          >
            {event.address ? `${event.address} · ` : ""}Cómo llegar
            <ArrowUpRight className="size-4" />
            <span className="sr-only">(abre Google Maps)</span>
          </a>
        </section>

        {event.lineup.length > 0 && (
          <section className="mt-8" aria-labelledby="ticket-lineup">
            <p id="ticket-lineup" className="tracking-[0.15em] opacity-60">
              Lineup
            </p>
            <ol className="divide-ink/20 border-ink mt-2 divide-y-2 border-t-2">
              {event.lineup.map((set, i) => (
                <li
                  key={`${set.artist}-${i}`}
                  className="flex items-baseline justify-between gap-4 py-3"
                >
                  <span className="font-display font-stretch-condensed text-2xl leading-[0.95] font-extrabold sm:text-3xl">
                    {set.artist}
                  </span>
                  {set.time && <span className="shrink-0 tabular-nums opacity-60">{set.time}</span>}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      {/* Talón: lo separa del cuerpo el troquel (línea punteada y muescas recortadas). */}
      <div className={cn(RECEIPT_PAPER, "ticket-notch-top pt-10 pb-8")}>
        <div
          aria-hidden
          className="border-ink/30 absolute inset-x-4 top-0 border-t-2 border-dashed"
        />
        {!soldOut && <TicketCheckout tiers={event.tiers} action={action} />}

        <div data-ticket-stub className={cn(!soldOut && "mt-8")}>
          {!soldOut && <ReceiptRule className="mt-0" />}
          <dl>
            {/* "Desde" solo si hay varios lotes con precios distintos. */}
            <ReceiptRow label={soldOut ? "Entradas" : event.tiers.length > 1 ? "Desde" : "Entrada"}>
              {soldOut ? "Agotado" : PRICE_FORMAT.format(event.price)}
            </ReceiptRow>
          </dl>
          <Barcode seed={event.slug} className="mt-4 h-14 w-full sm:h-16" />
          <p className="mt-3 text-center tracking-[0.15em] opacity-70">
            QR al mail · uno por persona · con DNI
          </p>
        </div>
      </div>

      <div aria-hidden className="torn-edge absolute inset-x-0 top-full h-3.5" />
    </article>
  );
}

/**
 * Código de barras decorativo: anchos de barra que salen del slug con un LCG, así es
 * siempre el mismo para la misma fecha (y no rompe la hidratación).
 */
function Barcode({ seed, className }: { seed: string; className?: string }) {
  let state = [...seed].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);
  const bars: { x: number; width: number }[] = [];
  let x = 0;
  while (x < 240) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const width = 1 + (state % 3);
    if (state % 3 !== 0) bars.push({ x, width });
    x += width + 1 + ((state >> 4) % 2);
  }
  return (
    <svg
      aria-hidden
      viewBox="0 0 240 40"
      preserveAspectRatio="none"
      className={cn("fill-current", className)}
    >
      {bars.map((bar) => (
        <rect key={bar.x} x={bar.x} y={0} width={bar.width} height={40} />
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */

function ComingSoon() {
  return (
    <section className="relative isolate min-h-svh overflow-hidden">
      <Aura />
      <div className="mx-auto flex min-h-svh max-w-6xl flex-col justify-end px-5 pt-16 pb-16 lg:pb-24">
        <p className="label-mono">Próxima edición · A confirmar</p>
        <h1 className="font-display font-stretch-expanded mt-6 text-[clamp(3rem,16vw,11rem)] leading-[0.86] font-extrabold tracking-[-0.03em] uppercase">
          Moevius
        </h1>
        <p className="mt-6 max-w-md text-lg text-balance">
          Estamos armando la próxima. Dejanos tu mail y te avisamos apenas abrimos la venta.
        </p>
        <SubscribeForm />
      </div>
    </section>
  );
}
