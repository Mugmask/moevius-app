import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { AvailabilityBadge, Pill, Star } from "@/components/brand";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { SubscribeForm } from "@/components/subscribe-form";
import { FakeQr, TicketCard } from "@/components/ticket-card";
import { getUpcomingEvents, type EventListing } from "@/lib/events";
import { PRICE_FORMAT } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Lo que hace la productora, para la sección de respaldo. */
const PRODUCTION_COMPANY = {
  description:
    "Moevius es una productora audiovisual. Hacemos videoclips, aftermovies y contenido para artistas y marcas. La fiesta nació de ahí: el mismo equipo que filma los shows arma la noche.",
  stats: [
    { value: "+60", label: "Piezas producidas" },
    { value: "+12", label: "Fiestas hechas" },
    { value: "2019", label: "Desde" },
  ],
};

export default async function Home() {
  const events = await getUpcomingEvents();
  // La próxima que se pueda comprar; si están todas agotadas, la más cercana igual.
  const nextEvent = events.find((event) => event.availability !== "sold-out") ?? events[0];

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero nextEvent={nextEvent} />
        <Marquee />
        <Schedule events={events} />
        <ProductionCompany />
        <HowToGetIn />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}

function buyHref(event: EventListing) {
  return `/events/${event.slug}`;
}

/* -------------------------------------------------------------------------- */

function Hero({ nextEvent }: { nextEvent?: EventListing }) {
  return (
    <section className="relative px-6 pt-16 pb-20">
      <div className="relative mx-auto max-w-6xl">
        <p className="border-foreground bg-card inline-flex items-center gap-2 rounded-full border-2 px-4 py-1.5 text-xs font-bold">
          <span className="bg-primary size-2 rounded-full" />
          {nextEvent
            ? `Próxima fecha · ${nextEvent.day} de ${nextEvent.month.toLowerCase()}`
            : "Próxima fecha a confirmar"}
        </p>

        {/* 15vw y no más: "MOEVIUS" mide ~5em de ancho en Archivo Black, y el vw no
            descuenta ni el padding de la sección ni la barra de scroll. */}
        <h1 className="font-display relative mt-6 text-[15vw] leading-[0.82] tracking-tight uppercase lg:text-[11rem]">
          Moevius
          <Star
            aria-hidden
            className="absolute -top-2 -right-1 size-12 rotate-12 md:-top-6 md:right-4 md:size-20"
          />
        </h1>

        <p className="font-display mt-4 max-w-2xl text-2xl leading-tight uppercase sm:text-4xl">
          La fiesta de los <span className="highlight">trivilines</span>
        </p>

        <div className="mt-12 flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-md">
            <p className="text-lg leading-relaxed font-medium">
              Una noche por mes en {nextEvent?.venue ?? "Roddy Club"}. La arma el mismo equipo que
              filma los shows: luces, cámaras y música hasta que cierra.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {nextEvent && nextEvent.availability !== "sold-out" && (
                <Pill nativeButton={false} render={<Link href={buyHref(nextEvent)} />}>
                  Comprar entrada
                  <ArrowUpRight data-icon="inline-end" className="size-5" />
                </Pill>
              )}
              {/* nativeButton={false}: este pill es un ancla, no un <button>. */}
              <Pill tone="paper" nativeButton={false} render={<a href="#events" />}>
                Ver todas las fechas
              </Pill>
            </div>
          </div>

          {nextEvent && (
            <TicketCard
              className="-rotate-2"
              label={nextEvent.tiers[0]?.name ? `Entrada ${nextEvent.tiers[0].name}` : "Entrada"}
              badge={<AvailabilityBadge availability={nextEvent.availability} />}
              day={nextEvent.day}
              month={nextEvent.month}
              time={nextEvent.time}
              venue={nextEvent.venue}
              neighborhood={nextEvent.neighborhood}
              detailLabel="PRECIO"
              detail={PRICE_FORMAT.format(nextEvent.price)}
              qr={<FakeQr />}
              code={nextEvent.slug}
            />
          )}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Marquee() {
  const items = [
    "Roddy Club",
    "Una vez por mes",
    "Hasta las 6",
    "+18",
    "Entrada con QR",
    "Mar del Plata",
  ];

  return (
    <div className="border-foreground bg-primary overflow-hidden border-y-2 py-4">
      <div className="animate-marquee flex w-max">
        {[0, 1].map((copy) => (
          <div key={copy} aria-hidden={copy === 1} className="flex shrink-0">
            {items.map((item) => (
              <span
                key={item}
                className="font-display text-primary-foreground flex items-center gap-10 px-5 text-xl tracking-tight uppercase"
              >
                {item}
                <Star className="fill-primary-foreground size-4 shrink-0" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Schedule({ events }: { events: EventListing[] }) {
  return (
    <section id="events" className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="font-display text-5xl leading-[0.95] tracking-tight uppercase sm:text-6xl">
        Próximas <span className="highlight">fechas</span>
      </h2>

      {events.length === 0 ? (
        <p className="border-foreground mt-14 border-y-2 py-10 text-lg font-medium">
          Todavía no anunciamos la próxima. Dejanos tu mail más abajo y te avisamos.
        </p>
      ) : (
        <ul className="border-foreground mt-14 border-t-2">
          {events.map((event) => (
            <li
              key={event.id}
              className={cn(
                "border-foreground border-b-2 py-7",
                event.availability === "sold-out" && "opacity-55",
              )}
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-baseline gap-4">
                  <span className="font-display text-4xl tracking-tight uppercase sm:text-5xl">
                    {event.day}
                  </span>
                  <span className="font-display text-xl tracking-tight uppercase">
                    {event.month} {event.year}
                  </span>
                </div>

                <div className="lg:flex-1 lg:px-10">
                  <p className="font-bold">
                    {event.venue} · {event.neighborhood}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm font-medium">
                    {event.lineup.join(" · ")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="sm:text-right">
                    <p className="font-display text-2xl tracking-tight">
                      {PRICE_FORMAT.format(event.price)}
                    </p>
                    <AvailabilityBadge availability={event.availability} />
                  </div>
                  {event.availability === "sold-out" ? (
                    <Pill tone="paper" disabled>
                      Agotado
                    </Pill>
                  ) : (
                    <Pill nativeButton={false} render={<Link href={buyHref(event)} />}>
                      Comprar
                    </Pill>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function ProductionCompany() {
  return (
    <section id="production" className="border-foreground border-t-2">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="font-display text-5xl leading-[0.95] tracking-tight uppercase sm:text-6xl">
              También <span className="highlight">filmamos</span>
            </h2>
            <p className="mt-8 text-lg leading-relaxed font-medium">
              {PRODUCTION_COMPANY.description}
            </p>
            <Pill tone="paper" className="mt-8">
              Ver los trabajos
              <ArrowUpRight data-icon="inline-end" className="size-5" />
            </Pill>
          </div>

          <dl className="grid grid-cols-3 gap-4 self-start lg:gap-6">
            {PRODUCTION_COMPANY.stats.map(({ value, label }) => (
              <div
                key={label}
                className="border-foreground bg-card shadow-hard-sm rounded-2xl border-2 p-5"
              >
                <dt className="sr-only">{label}</dt>
                <dd className="font-display text-3xl tracking-tight sm:text-4xl">{value}</dd>
                <p className="text-muted-foreground mt-2 text-xs font-bold">{label}</p>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

const STEPS = [
  {
    title: "Comprás online",
    body: "Elegís la fecha y pagás con Mercado Pago: tarjeta, dinero en cuenta o transferencia. No hace falta crear una cuenta.",
  },
  {
    title: "Te llega el QR",
    body: "La entrada sale a tu mail en el momento, con un QR único. Guardala o mostrala desde el celular.",
  },
  {
    title: "Entrás",
    body: "En la puerta escaneamos el QR y pasás. Llevá DNI: la fiesta es +18.",
  },
];

function HowToGetIn() {
  return (
    <section id="how-it-works" className="border-foreground border-t-2">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="font-display text-5xl leading-[0.95] tracking-tight uppercase sm:text-6xl">
          Cómo entrás con tu <span className="highlight">entrada</span>
        </h2>

        <ol className="mt-16 grid gap-12 md:grid-cols-3">
          {STEPS.map(({ title, body }, i) => (
            <li key={title}>
              <span className="border-foreground bg-primary text-primary-foreground font-display flex size-16 items-center justify-center rounded-full border-2 text-2xl">
                {i + 1}
              </span>
              <h3 className="font-display mt-6 text-3xl tracking-tight">{title}</h3>
              <p className="mt-3 leading-relaxed font-medium">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function FinalCta() {
  return (
    <section className="px-6 py-24">
      <div className="border-foreground bg-primary shadow-hard relative mx-auto max-w-4xl overflow-hidden rounded-3xl border-2 px-8 py-16 text-center">
        <Star
          aria-hidden
          className="fill-primary-foreground absolute -top-6 -left-6 size-24 opacity-15"
        />

        <h2 className="font-display text-primary-foreground relative text-4xl leading-[0.95] tracking-tight text-balance uppercase sm:text-6xl">
          Enterate de la próxima antes que se agote
        </h2>
        <p className="text-primary-foreground relative mx-auto mt-5 max-w-md font-medium text-balance">
          Dejanos tu mail y te avisamos apenas abrimos la venta. Sin spam, solo las fechas.
        </p>

        <SubscribeForm />
      </div>
    </section>
  );
}
