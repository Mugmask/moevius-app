"use client";

import { useEffect, useRef } from "react";

/**
 * Px de ticket que salen por cada px de scroll mientras la máquina está fija. Menos de
 * 1: el ticket baja más lento que el dedo, así se lee mientras sale.
 */
const PULL_RATE = 0.8;
/** Lo que asoma del ticket al cargar, además del pie: el margen de abajo del papel y un poco de aire. */
const PEEK_EXTRA = 56;
/** Aire entre la ranura y algo que recibe foco, al sacar el ticket para mostrarlo. */
const FOCUS_MARGIN = 24;
/**
 * Pausa al final: tramo de scroll (en pantallas) en que el ticket ya salió entero y todo
 * queda quieto. Volviendo a subir desde abajo, ahí se lee la parte de arriba del ticket
 * (antes se metía en la máquina antes de poder leerla).
 */
const HOLD_VIEWPORTS = 0.15;

type Props = {
  /** La máquina (con la ranura abajo de todo). Queda fija mientras sale el ticket. */
  machine: React.ReactNode;
  /** El ticket: un `[data-ticket]` con un `[data-ticket-stub]` adentro. */
  children: React.ReactNode;
};

/**
 * La máquina queda fija arriba de la pantalla y, mientras scrolleás, el ticket sale de
 * la ranura hasta salir entero; después queda todo quieto un tramo (la pausa) y recién
 * ahí la página sigue. El tramo fijo se calcula con el largo del ticket, así siempre
 * alcanza para leerlo completo. Al cargar asoma el pie (precio y código de barras).
 *
 * El papel va 1:1 con el scroll, sin resorte ni rebote, y lo mueve el navegador: una
 * animación atada al scroll (`ticket-pull-driven` en globals.css) que corre en el mismo
 * hilo que el scroll. Movido desde JS frame a frame iba un paso atrás del dedo y en el
 * celu se sentía trabado. Donde no hay scroll-driven animations, lo mismo desde JS (sin
 * resorte). Este componente solo mide (cuando algo cambia de tamaño) y le pasa al CSS
 * dónde empieza y termina el tirón.
 *
 * No se frena ni se imanta el scroll al final: frenar el envión desde JS se peleaba con el
 * scroll del sistema, y un `scroll-snap` de proximidad tiraba la página para atrás desde
 * casi 700px (el talón, en pleno formulario). La pausa alcanza para notar el final.
 *
 * Dos toques de vida, también del navegador y sin JS por frame: mientras sale, el papel
 * se mece apenas colgado de la ranura y se va aquietando (`ticket-sway`, atado al mismo
 * tramo del scroll), y al cargar asoma con una caída corta (`ticket-drop`).
 *
 * Cuánto salió depende solo del scroll: nada lo traba afuera. Si completaste el talón y
 * volvés a subir, el ticket entra con lo escrito y vuelve a salir igual. Si recibe foco
 * algo que todavía está adentro de la máquina, o la URL trae un ancla del ticket, la
 * página baja hasta que el ticket sale entero. Con animaciones reducidas no se mueve.
 */
export function TicketPull({ machine, children }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const swingRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const sticky = stickyRef.current;
    const spacer = spacerRef.current;
    const swing = swingRef.current;
    const drop = dropRef.current;
    const ticket = track?.querySelector<HTMLElement>("[data-ticket]");
    const stub = track?.querySelector<HTMLElement>("[data-ticket-stub]");
    if (!track || !sticky || !spacer || !swing || !drop || !ticket) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const scrollDriven = CSS.supports("animation-timeline", "scroll()");

    // Medidas cacheadas: se toman solo cuando algo cambia de tamaño.
    let height = 0;
    let peek = 0;
    let pullDistance = 0;
    /** scrollY donde el ticket empieza a salir. */
    let pullStart = 0;
    /** Largo de la pausa al final, en px de scroll. */
    let hold = 0;
    /** Pantalla de referencia para la pausa (ver onResize). */
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    let frame = 0;
    /** Los keyframes del tirón, en px (ver `ticket-pull-driven` en globals.css). */
    const keyframes = document.createElement("style");
    document.head.append(keyframes);

    const measure = () => {
      height = ticket.offsetHeight;
      peek = Math.min((stub?.offsetHeight ?? 0) + PEEK_EXTRA, height);
      pullDistance = (height - peek) / PULL_RATE;
      const stickyTop = parseFloat(getComputedStyle(sticky).top) || 0;
      pullStart = track.getBoundingClientRect().top + window.scrollY - stickyTop;
      hold = viewportHeight * HOLD_VIEWPORTS;
      // El tramo fijo es un espaciador después del sticky: un padding no sirve, el sticky
      // solo se desplaza dentro del contenido de su contenedor.
      spacer.style.height = `${pullDistance + hold}px`;
      keyframes.textContent = `@keyframes ticket-pull { from { transform: translateY(${peek - height}px); } to { transform: translateY(0); } }`;
      if (scrollDriven) {
        const range = `${pullStart}px ${pullStart + pullDistance}px`;
        ticket.style.setProperty("animation-range", range);
        swing.style.setProperty("animation-range", range);
      }
    };

    /** Cuánto salió el papel para el scroll actual (de `peek` a `height`). */
    const outFor = (scrollY: number) => {
      const progress = pullDistance > 0 ? (scrollY - pullStart) / pullDistance : 1;
      return peek + (height - peek) * Math.min(Math.max(progress, 0), 1);
    };

    // Respaldo sin scroll-driven animations: el mismo cálculo desde JS, una vez por frame.
    const apply = () => {
      frame = 0;
      ticket.style.transform = `translate3d(0, ${outFor(window.scrollY) - height}px, 0)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onResize = () => {
      // La barra del navegador del celu aparece y se va al scrollear: eso no es un cambio de
      // pantalla. El alto de referencia solo cambia si cambia el ancho (rotar el celu); si
      // no, la pausa cambiaba de largo en pleno scroll.
      if (window.innerWidth !== viewportWidth) {
        viewportWidth = window.innerWidth;
        viewportHeight = window.innerHeight;
      }
      measure();
      if (!scrollDriven) apply();
    };

    /** Baja la página hasta que el ticket salió entero (después de eso no se mueve más). */
    const scrollToFullyOut = () => {
      const fullyOut = pullStart + pullDistance;
      if (window.scrollY < fullyOut) window.scrollTo({ top: fullyOut, behavior: "instant" });
    };

    // Con el teclado se puede llegar a algo que sigue adentro de la máquina (arriba de la
    // ranura): se saca el ticket para que se vea. Lo que ya está a la vista no mueve nada.
    const onFocusIn = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      // La ranura está a `height - out` px del borde de arriba del papel.
      const slot = ticket.getBoundingClientRect().top + height - outFor(window.scrollY);
      if (event.target.getBoundingClientRect().top < slot) {
        scrollToFullyOut();
        event.target.scrollIntoView({ block: "nearest" });
      }
    };

    measure();
    if (scrollDriven) {
      ticket.classList.add("ticket-pull-driven");
      swing.classList.add("ticket-sway");
    } else apply();

    // `/#tickets` ("Volver a comprar"): el ancla está en el talón. Vino a comprar: la
    // página baja hasta pasar la pausa (ahí el ticket ya está entero y la página se mueve)
    // y después hasta el ancla.
    const anchor = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (anchor && ticket.contains(anchor)) {
      window.scrollTo({ top: pullStart + pullDistance + hold, behavior: "instant" });
      if (!scrollDriven) apply();
      // La animación atada al scroll recién mueve el papel en el próximo frame: el ancla se
      // ubica descontando el desplazamiento que tiene ahora (entero afuera es 0).
      const shift = new DOMMatrix(getComputedStyle(ticket).transform).m42;
      const below = anchor.getBoundingClientRect().top - shift - FOCUS_MARGIN;
      if (below > 0) window.scrollBy(0, below);
    } else {
      // La caída arranca cuando cargan las fuentes, lo mismo que espera el loader para
      // irse. Con el ancla no hay caída: el papel ya está entero afuera.
      void document.fonts.ready.then(() => drop.classList.add("ticket-drop"));
    }

    // Cualquier cambio de alto del ticket o de lo que está arriba mueve el tramo fijo.
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(ticket);
    resizeObserver.observe(document.body);
    if (!scrollDriven) window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    ticket.addEventListener("focusin", onFocusIn);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ticket.removeEventListener("focusin", onFocusIn);
      ticket.classList.remove("ticket-pull-driven");
      swing.classList.remove("ticket-sway");
      keyframes.remove();
      spacer.style.height = "";
    };
  }, []);

  return (
    // Sin scroll anchoring: el espaciador cambia de alto y el navegador no tiene que
    // compensarlo moviendo la página.
    <div ref={trackRef} className="[overflow-anchor:none]">
      {/* top: un respiro arriba (la home no tiene header). */}
      <div ref={stickyRef} className="sticky top-6">
        {machine}
        {/* Arranca adentro de la rendija (50px sobre el borde de abajo de la
            máquina, ver Machine en la home) y va por encima de la máquina: el papel sale
            de adentro de la ranura, no del borde. */}
        <div className="ticket-pull relative z-10 -mt-[50px]">
          {/* El balanceo gira desde arriba de todo (la ranura); la caída va adentro. */}
          <div ref={swingRef} className="origin-top">
            <div ref={dropRef}>{children}</div>
          </div>
        </div>
      </div>
      <div ref={spacerRef} aria-hidden />
    </div>
  );
}
