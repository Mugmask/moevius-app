import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";

import { startCheckout } from "@/components/checkout/actions";
import { TicketCheckout } from "@/components/checkout/ticket-checkout";
import { MarkerFilter, Star } from "@/components/doodles";
import { LiquidLogo, MoeviusLogo } from "@/components/logo";
import { PageLoader } from "@/components/page-loader";
import { PullHint } from "@/components/pull-hint";
import { Barcode } from "@/components/paper-slip";
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
          <PullHint soldOut={event.availability === "sold-out"} />
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

/**
 * Encabezado de la página, centrado sobre la máquina, como la cabeza de un flyer: el logo
 * grande, la fecha, la edición y el lugar con el horario. La seña de bajar va abajo (PullHint).
 */
function TicketHeading({ event }: { event: EventListing }) {
  const soldOut = event.availability === "sold-out";
  // "VIE 13" + "NOVIEMBRE" → "VIE 13 NOV".
  const date = `${event.day} ${event.month.slice(0, 3)}`;
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h1>
        <span className="sr-only">
          Entradas {event.title}, {event.day} de {event.month}
        </span>
        <LogoFx className="mx-auto w-[min(88vw,36rem)]" />
      </h1>
      <p
        aria-hidden
        className="font-display font-stretch-condensed mt-5 flex items-baseline justify-center gap-3 text-[clamp(2.25rem,11vw,4.5rem)] leading-[0.85] font-extrabold uppercase"
      >
        {date}
      </p>
      <p className="label-mono text-foreground mt-3">
        {event.title.replace(/^moevius\s*/i, "") || event.title}
      </p>
      <p className="label-mono text-muted-foreground mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span>{event.venue}</span>
        <span aria-hidden>·</span>
        <span>{event.neighborhood}</span>
        <span aria-hidden>·</span>
        <span className="tabular-nums">{event.time.replace(" — ", " → ")}</span>
      </p>
      {soldOut && (
        <p className="text-muted-foreground mx-auto mt-6 max-w-md text-lg text-pretty">
          Esta edición se agotó. Igual te dejamos el ticket con toda la info.
        </p>
      )}
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
 * El logo grande de la noche, líquido y psicodélico (LiquidLogo), con una luz naranja atrás.
 * Con animaciones reducidas, las manchas de color quedan quietas.
 */
function LogoFx({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("relative isolate block", className)}>
      <span className="glow pointer-events-none absolute inset-[-25%_-10%] -z-10 rounded-full text-[#ff5a1f] opacity-30" />
      <LiquidLogo />
    </span>
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
  // "VIE 13" → el número va enorme y el día de la semana, en una esquina.
  const [weekday, dayNumber] = event.day.split(" ");
  // "20:59 — 03:00" → abre y cierra en las esquinas de abajo.
  const [opensAt, closesAt] = event.time.split(" — ");

  return (
    <article data-ticket className="text-ink relative isolate mx-3 sm:mx-10">
      <MarkerFilter />

      {/* Sombra del papel: un box-shadow que se pinta una vez y viaja con el ticket. Con
          `filter: drop-shadow` la GPU recalculaba el desenfoque en cada frame del tirón
          (el ticket mide miles de px a densidad 3x) y trababa el scroll en el celu. */}
      <div aria-hidden className="absolute inset-0 -z-10 shadow-[0_24px_30px_oklch(0_0_0/0.55)]" />

      {/* Arriba del título queda papel en blanco: es lo último que sale, y así la cabecera no
          termina pegada a la ranura (y queda un tramo más para scrollear). */}
      <div className={cn(RECEIPT_PAPER, "ticket-notch-bottom pt-20 pb-9 lg:pt-24")}>
        <header className="relative">
          {/* Fila de entrada: edición y año a los costados, la estrella en el medio. Va
              adentro del papel: lo que se pasa del borde se vería salir por fuera de la
              ranura. */}
          <div
            aria-hidden
            className="flex items-center gap-3 font-bold tracking-[0.2em] whitespace-nowrap"
          >
            <span>{edition || "Moevius"}</span>
            <span className="border-ink h-0 flex-1 border-t-2" />
            <Star seed={3} className="text-accent size-9 shrink-0 rotate-12 sm:size-11" />
            <span className="border-ink h-0 flex-1 border-t-2" />
            <span>{event.year}</span>
          </div>
          <h2 className="mt-4">
            <MoeviusLogo className="mx-auto w-full" />
            <span className="sr-only">{event.title}</span>
          </h2>
        </header>

        {/* La fecha como un afiche chico: el día enorme con la tinta corrida y ondas de
            sonido atrás; en las esquinas, día, mes y horario. */}
        <section className="border-ink relative mt-6 border-y-2 py-3" aria-label="Fecha y horario">
          <p className="sr-only">
            {event.day} de {event.month} de {event.year}, de {event.time}
          </p>
          <div aria-hidden className="relative isolate grid h-[min(78vw,26rem)] place-items-center">
            <div className="sound-rings absolute top-1/2 left-1/2 -z-10 aspect-square w-[118%] -translate-1/2" />
            <span className="ink-bleed font-display font-stretch-condensed text-[clamp(10rem,62vw,20rem)] leading-none font-extrabold tracking-[-0.05em] tabular-nums">
              {dayNumber}
            </span>
            {[
              ["top-0 left-0", weekday],
              ["top-0 right-0 text-right", event.month],
              ["bottom-0 left-0", `Abre ${opensAt}`],
              ["bottom-0 right-0 text-right", `Cierra ${closesAt}`],
            ].map(([position, text]) => (
              <span
                key={position}
                className={cn("absolute font-bold tracking-[0.2em] whitespace-nowrap", position)}
              >
                {text}
              </span>
            ))}
          </div>
        </section>

        {/* Una fila del mismo estilo que el lineup, toda clickeable: el lugar grande, la
            dirección abajo y la flecha a Maps. */}
        <section className="mt-8" aria-labelledby="ticket-venue">
          <p id="ticket-venue" className="tracking-[0.15em] opacity-60">
            Dónde
          </p>
          <a
            href={event.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="group border-ink focus-visible:outline-ink mt-2 flex items-center justify-between gap-4 border-y-2 py-3 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <span className="min-w-0">
              <span className="font-display font-stretch-condensed block text-[clamp(2rem,10vw,3rem)] leading-[0.9] font-extrabold">
                {event.venue}
              </span>
              <span className="mt-2 block opacity-60">
                {event.address && <span className="block">{event.address}</span>}
                <span className="block">{event.neighborhood}</span>
              </span>
            </span>
            <span className="border-ink group-hover:bg-ink group-hover:text-paper grid size-11 shrink-0 place-items-center rounded-full border-2 transition-colors">
              <ArrowUpRight className="size-5" />
            </span>
            <span className="sr-only">Cómo llegar (abre Google Maps)</span>
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

/* -------------------------------------------------------------------------- */

function ComingSoon() {
  return (
    <section className="relative isolate min-h-svh overflow-hidden">
      <Aura />
      <div className="mx-auto flex min-h-svh max-w-6xl flex-col justify-end px-5 pt-16 pb-16 lg:pb-24">
        <p className="label-mono">Próxima edición · A confirmar</p>
        <h1 className="mt-6">
          <span className="sr-only">Moevius</span>
          <LogoFx className="w-[min(92vw,56rem)]" />
        </h1>
        <p className="mt-6 max-w-md text-lg text-balance">
          Estamos armando la próxima. Dejanos tu mail y te avisamos apenas abrimos la venta.
        </p>
        <SubscribeForm />
      </div>
    </section>
  );
}
