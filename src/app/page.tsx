import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Fecha = {
  id: string;
  /** Día en dos letras + número, para el bloque grande. Ej: "SÁB 12". */
  dia: string;
  mes: string;
  anio: string;
  hora: string;
  lugar: string;
  barrio: string;
  lineup: string[];
  /** En pesos, sin puntos. */
  precio: number;
  estado: "en-venta" | "ultimas" | "agotado";
};

export const PROXIMA: Fecha = {
  id: "mvs-012",
  dia: "SÁB 12",
  mes: "ABRIL",
  anio: "2026",
  hora: "23:59 — 06:00",
  lugar: "Roddy Club",
  barrio: "Chacarita, CABA",
  lineup: ["LORD GOBLIN", "FISTORM", "KCHE", "TYNKA"],
  precio: 12000,
  estado: "ultimas",
};

export const AGENDA: Fecha[] = [
  PROXIMA,
  {
    id: "mvs-013",
    dia: "SÁB 17",
    mes: "MAYO",
    anio: "2026",
    hora: "23:59 — 06:00",
    lugar: "Roddy Club",
    barrio: "Villa Crespo, CABA",
    lineup: ["TBA", "TBA", "MOEVIUS DJS"],
    precio: 10000,
    estado: "en-venta",
  },
  {
    id: "mvs-011",
    dia: "SÁB 08",
    mes: "MARZO",
    anio: "2026",
    hora: "23:59 — 06:00",
    lugar: "Roddy Club",
    barrio: "Chacarita, CABA",
    lineup: ["DOBLE V", "LA PIBA DEL SUR", "MOEVIUS DJS"],
    precio: 9000,
    estado: "agotado",
  },
];

/** Lo que hace la productora, para la sección de respaldo. */
export const PRODUCTORA = {
  descripcion:
    "Moevius es una productora audiovisual. Hacemos videoclips, aftermovies y contenido para artistas y marcas. La fiesta nació de ahí: el mismo equipo que filma los shows arma la noche.",
  stats: [
    { valor: "+60", label: "Piezas producidas" },
    { valor: "+12", label: "Fiestas hechas" },
    { valor: "2019", label: "Desde" },
  ],
};

export const REDES = [{ nombre: "Instagram", url: "https://www.instagram.com/moevius_" }];

export const PRECIO_FORMATO = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Marquee />
        <Agenda />
        <Productora />
        <ComoEntras />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Piezas compartidas                                                          */
/* -------------------------------------------------------------------------- */

/** Botón pill grande. `tone="ink"` es el negro sólido; `"paper"` el de contorno. */
function Pill({
  tone = "ink",
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { tone?: "ink" | "paper" | "brand" }) {
  return (
    <Button
      {...props}
      className={cn(
        "h-12 rounded-full border-2 px-6 text-sm font-bold tracking-tight",
        tone === "ink" && "border-foreground bg-foreground text-background hover:bg-foreground/85",
        tone === "paper" && "border-foreground bg-card text-foreground hover:bg-muted",
        tone === "brand" && "border-foreground bg-primary text-primary-foreground hover:bg-primary",
        className,
      )}
    >
      {children}
    </Button>
  );
}

/** Asterisco de sticker. Se usa suelto, como una calcomanía pegada al azar. */
function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={cn("fill-primary", className)}>
      <path d="M50 0 L59 34 L88 15 L69 44 L100 50 L69 56 L88 85 L59 66 L50 100 L41 66 L12 85 L31 56 L0 50 L31 44 L12 15 L41 34 Z" />
    </svg>
  );
}

function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="border-foreground bg-primary size-5 rounded-full border-2" />
      <span className="font-display text-lg tracking-tight">MOEVIUS</span>
    </div>
  );
}

const ESTADO_LABEL: Record<Fecha["estado"], string> = {
  "en-venta": "En venta",
  ultimas: "Últimas entradas",
  agotado: "Agotado",
};

function EstadoBadge({ estado }: { estado: Fecha["estado"] }) {
  return (
    <span
      className={cn(
        "border-foreground inline-flex shrink-0 items-center rounded-full border-2 px-3 py-1 text-xs font-bold",
        estado === "agotado"
          ? "bg-muted text-muted-foreground"
          : "bg-primary text-primary-foreground",
      )}
    >
      {ESTADO_LABEL[estado]}
    </span>
  );
}

/* -------------------------------------------------------------------------- */

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <div className="border-foreground bg-card mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 rounded-full border-2 pr-2 pl-6">
        <Wordmark />
        <nav className="hidden items-center gap-1 text-sm font-semibold md:flex">
          <a className="hover:bg-muted rounded-full px-4 py-2 transition-colors" href="#fechas">
            Fechas
          </a>
          <a className="hover:bg-muted rounded-full px-4 py-2 transition-colors" href="#productora">
            Productora
          </a>
          <a className="hover:bg-muted rounded-full px-4 py-2 transition-colors" href="#entrada">
            Tu entrada
          </a>
        </nav>
        <Pill className="h-12">Comprar entrada</Pill>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative px-6 pt-16 pb-20">
      <div className="relative mx-auto max-w-6xl">
        <p className="border-foreground bg-card inline-flex items-center gap-2 rounded-full border-2 px-4 py-1.5 text-xs font-bold">
          <span className="bg-primary size-2 rounded-full" />
          Próxima fecha · {PROXIMA.dia} de {PROXIMA.mes.toLowerCase()}
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
              Una noche por mes en {PROXIMA.lugar}. La arma el mismo equipo que filma los shows:
              luces, cámaras y música hasta que cierra.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Pill>
                Comprar entrada
                <ArrowUpRight data-icon="inline-end" className="size-5" />
              </Pill>
              {/* nativeButton={false}: este pill es un ancla, no un <button>. */}
              <Pill tone="paper" nativeButton={false} render={<a href="#fechas" />}>
                Ver todas las fechas
              </Pill>
            </div>
          </div>

          <TicketCard />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/** La entrada a la próxima fecha, como objeto físico. */
function TicketCard() {
  return (
    <article className="border-foreground bg-card shadow-hard w-full max-w-xs shrink-0 -rotate-2 rounded-2xl border-2">
      <header className="border-foreground flex items-center justify-between border-b-2 px-5 py-3">
        <span className="text-xs font-bold tracking-wide uppercase">Entrada general</span>
        <EstadoBadge estado={PROXIMA.estado} />
      </header>

      <div className="px-5 py-6">
        <p className="text-muted-foreground text-xs font-bold">
          {PROXIMA.dia} {PROXIMA.mes} · {PROXIMA.hora}
        </p>
        <h2 className="font-display mt-1 text-3xl leading-none tracking-tight uppercase">
          Moevius
          <br />
          {PROXIMA.mes}
        </h2>
        <p className="mt-2 text-sm font-bold">
          {PROXIMA.lugar} · {PROXIMA.barrio}
        </p>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-xs font-bold">PRECIO</p>
            <p className="font-display text-2xl tracking-tight">
              {PRECIO_FORMATO.format(PROXIMA.precio)}
            </p>
          </div>
          <FakeQr />
        </div>
      </div>

      {/* Perforación de entrada: muescas laterales y línea de corte. */}
      <div className="relative">
        <span className="bg-background border-foreground absolute -top-3 -left-3 size-5 rounded-full border-2" />
        <span className="bg-background border-foreground absolute -top-3 -right-3 size-5 rounded-full border-2" />
        <div className="border-foreground border-t-2 border-dashed" />
      </div>

      <footer className="flex items-center justify-between px-5 py-3 text-[0.65rem] font-bold">
        <span className="uppercase">{PROXIMA.id}</span>
        <span className="text-muted-foreground">moevius.app</span>
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

function FakeQr() {
  return (
    <div
      aria-hidden
      className="border-foreground grid shrink-0 gap-px rounded-md border-2 p-1.5"
      style={{ gridTemplateColumns: `repeat(${QR_SIZE}, 1fr)` }}
    >
      {QR_CELLS.map((on, i) => (
        <span key={i} className={cn("size-[3px]", on ? "bg-foreground" : "bg-transparent")} />
      ))}
    </div>
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

function Agenda() {
  return (
    <section id="fechas" className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="font-display text-5xl leading-[0.95] tracking-tight uppercase sm:text-6xl">
        Próximas <span className="highlight">fechas</span>
      </h2>

      <ul className="border-foreground mt-14 border-t-2">
        {AGENDA.map((fecha) => (
          <li
            key={fecha.id}
            className={cn(
              "border-foreground border-b-2 py-7",
              fecha.estado === "agotado" && "opacity-55",
            )}
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-baseline gap-4">
                <span className="font-display text-4xl tracking-tight uppercase sm:text-5xl">
                  {fecha.dia}
                </span>
                <span className="font-display text-xl tracking-tight uppercase">
                  {fecha.mes} {fecha.anio}
                </span>
              </div>

              <div className="lg:flex-1 lg:px-10">
                <p className="font-bold">
                  {fecha.lugar} · {fecha.barrio}
                </p>
                <p className="text-muted-foreground mt-1 text-sm font-medium">
                  {fecha.lineup.join(" · ")}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="sm:text-right">
                  <p className="font-display text-2xl tracking-tight">
                    {PRECIO_FORMATO.format(fecha.precio)}
                  </p>
                  <EstadoBadge estado={fecha.estado} />
                </div>
                <Pill
                  tone={fecha.estado === "agotado" ? "paper" : "ink"}
                  disabled={fecha.estado === "agotado"}
                >
                  {fecha.estado === "agotado" ? "Agotado" : "Comprar"}
                </Pill>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Productora() {
  return (
    <section id="productora" className="border-foreground border-t-2">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="font-display text-5xl leading-[0.95] tracking-tight uppercase sm:text-6xl">
              También <span className="highlight">filmamos</span>
            </h2>
            <p className="mt-8 text-lg leading-relaxed font-medium">{PRODUCTORA.descripcion}</p>
            <Pill tone="paper" className="mt-8">
              Ver los trabajos
              <ArrowUpRight data-icon="inline-end" className="size-5" />
            </Pill>
          </div>

          <dl className="grid grid-cols-3 gap-4 self-start lg:gap-6">
            {PRODUCTORA.stats.map(({ valor, label }) => (
              <div
                key={label}
                className="border-foreground bg-card shadow-hard-sm rounded-2xl border-2 p-5"
              >
                <dt className="sr-only">{label}</dt>
                <dd className="font-display text-3xl tracking-tight sm:text-4xl">{valor}</dd>
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

const pasos = [
  {
    title: "Comprás online",
    body: "Elegís la fecha y pagás con tarjeta o transferencia. No hace falta crear una cuenta.",
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

function ComoEntras() {
  return (
    <section id="entrada" className="border-foreground border-t-2">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="font-display text-5xl leading-[0.95] tracking-tight uppercase sm:text-6xl">
          Cómo entrás con tu <span className="highlight">entrada</span>
        </h2>

        <ol className="mt-16 grid gap-12 md:grid-cols-3">
          {pasos.map(({ title, body }, i) => (
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

        <h2 className="font-display text-primary-foreground relative text-4xl leading-[0.95] tracking-tight uppercase text-balance sm:text-6xl">
          Enterate de la próxima antes que se agote
        </h2>
        <p className="text-primary-foreground relative mx-auto mt-5 max-w-md font-medium text-balance">
          Dejanos tu mail y te avisamos apenas abrimos la venta. Sin spam, solo las fechas.
        </p>

        <form className="relative mx-auto mt-10 flex max-w-lg flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="email">
            Tu email
          </label>
          <input
            id="email"
            type="email"
            required
            placeholder="tumail@ejemplo.com"
            className="border-foreground bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-foreground h-12 flex-1 rounded-full border-2 px-5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          />
          <Pill type="submit" className="justify-center">
            Avisame
          </Pill>
        </form>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function SiteFooter() {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-12 flex-row justify-between">
        <p className="text-sm font-medium opacity-70">Mar del Plata, Argentina</p>
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <ul className="flex flex-wrap gap-2">
            {REDES.map(({ nombre, url }) => (
              <li key={nombre}>
                <a
                  href={url}
                  className="border-background hover:bg-background hover:text-foreground rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors"
                >
                  {nombre}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
