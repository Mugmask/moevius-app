"use client";

import { useEffect, useRef } from "react";

/**
 * Px de ticket que salen por cada px de scroll mientras la máquina está fija. Menos de
 * 1: el ticket baja más lento que el dedo, así se lee mientras sale.
 */
const PULL_RATE = 0.8;
/** Resorte del papel (unidades por segundo): rígido pero con un rebote al soltar. */
const STIFFNESS = 140;
const DAMPING = 13;
/** Balanceo máximo (grados) y cuánto balancea por px/s de velocidad. */
const MAX_SWING = 4;
const SWING_PER_VELOCITY = 0.004;
/**
 * Cuánto del balanceo del papel sigue la sombra de la ranura: la sombra del labio casi no
 * se mueve en una máquina real; girando lo mismo que el papel se notaba raro.
 */
const SHADOW_SWING = 0.5;
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
/**
 * Tope al terminar de salir: el scroll frena justo ahí aunque vengas con envión (en el
 * celu, un solo gesto cruzaba la pausa entera sin que se note). Mientras sigan llegando
 * eventos del envión (cada menos de STOP_MS) sigue frenado, hasta STOP_MAX_MS; el próximo
 * gesto sigue de largo.
 *
 * Solo frena el scroll de la rueda o del trackpad (WHEEL_MS desde el último `wheel`) y el
 * envión después de soltar el dedo (FLING_MS desde el `touchend`). Cualquier otro scroll
 * (arrastrar la barra, el autoscroll de la ruedita apretada, el teclado, el dedo apoyado)
 * lo maneja la persona y va continuo: si se lo frena, el tope y el scroll se pelean y el
 * ticket titila.
 */
const STOP_MS = 250;
const STOP_MAX_MS = 1200;
const WHEEL_MS = 200;
const FLING_MS = 2000;
/** Aviso de que terminó de salir: tirón del papel (px/s). */
const END_KICK = 300;

type Props = {
  /**
   * La máquina (con la ranura abajo de todo). Queda fija mientras sale el ticket. Si tiene
   * un `[data-slot-shadow]`, acompaña el balanceo del papel (ver SHADOW_SWING).
   */
  machine: React.ReactNode;
  /**
   * El ticket: un `[data-ticket]` con un `[data-ticket-stub]` adentro. Con un scroll rápido
   * el resorte lo saca un poco más que su largo y rebota: arriba tiene que seguir el papel
   * (ver la cola en Ticket), si no se ve un hueco entre la ranura y el ticket.
   */
  children: React.ReactNode;
};

/**
 * La máquina queda fija arriba de la pantalla y, mientras scrolleás, el ticket sale de
 * la ranura hasta salir entero; recién ahí la página sigue. El tramo de scroll fijo se
 * calcula con el largo del ticket, así siempre alcanza para leerlo completo. Al terminar
 * de salir, el scroll frena ahí (aunque vengas con envión), el papel da un tirón y queda
 * todo quieto un tramo más (la pausa).
 *
 * Cuánto salió depende solo del scroll: nada lo traba afuera. Si completaste el talón y
 * volvés a subir, el ticket entra con lo escrito y vuelve a salir igual.
 *
 * El largo que salió sigue al scroll con un resorte (inercia y rebote) y el ticket se
 * balancea colgado de la ranura según la velocidad. Las medidas se toman solo cuando algo
 * cambia de tamaño: en cada frame se lee `scrollY` y se escribe el transform, sin forzar
 * layout ni re-renderizar. Al cargar asoma el pie (precio y código de barras). Si recibe
 * foco algo que todavía está adentro de la máquina, o la URL trae un ancla del ticket, la
 * página baja hasta que el ticket sale entero. Con animaciones reducidas no se mueve.
 */
export function TicketPull({ machine, children }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const sticky = stickyRef.current;
    const spacer = spacerRef.current;
    const ticket = track?.querySelector<HTMLElement>("[data-ticket]");
    const stub = track?.querySelector<HTMLElement>("[data-ticket-stub]");
    const shadow = track?.querySelector<HTMLElement>("[data-slot-shadow]");
    if (!track || !sticky || !spacer || !ticket) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Medidas cacheadas (ver `measure`): leerlas en cada frame fuerza layout y traba el scroll.
    let height = 0;
    let peek = 0;
    let pullDistance = 0;
    /** scrollY donde el ticket empieza a salir. */
    let pullStart = 0;
    /** Largo de la pausa al final, en px de scroll. */
    let hold = 0;

    let out = 0;
    let velocity = 0;
    let last = performance.now();
    let frame = 0;
    /** Si en el último frame el ticket ya estaba entero afuera (para avisar al llegar). */
    let wasOut = false;
    /**
     * Para el tope (ver STOP_MS): último scrollY visto, hasta cuándo frena, si hay un dedo
     * apoyado y cuándo fue la última rueda y el último dedo que se soltó.
     */
    let lastY = window.scrollY;
    let stopUntil = 0;
    let stopLimit = 0;
    let touching = false;
    let lastWheel = -Infinity;
    let lastTouchEnd = -Infinity;

    const measure = () => {
      height = ticket.offsetHeight;
      peek = Math.min((stub?.offsetHeight ?? 0) + PEEK_EXTRA, height);
      pullDistance = (height - peek) / PULL_RATE;
      const stickyTop = parseFloat(getComputedStyle(sticky).top) || 0;
      pullStart = track.getBoundingClientRect().top + window.scrollY - stickyTop;
      hold = window.innerHeight * HOLD_VIEWPORTS;
      // El tramo fijo es un espaciador después del sticky: un padding no sirve, el sticky
      // solo se desplaza dentro del contenido de su contenedor.
      spacer.style.height = `${pullDistance + hold}px`;
    };

    /** Cuánto del tirón se scrolleó: 0 al empezar, 1 (o más, en la pausa) con el ticket entero. */
    const progress = () => (pullDistance > 0 ? (window.scrollY - pullStart) / pullDistance : 1);

    const target = () => peek + (height - peek) * Math.min(Math.max(progress(), 0), 1);

    const apply = () => {
      const swing = Math.max(-MAX_SWING, Math.min(MAX_SWING, velocity * SWING_PER_VELOCITY));
      // El pivote es la ranura: el punto del papel que está justo en la rendija.
      ticket.style.transformOrigin = `50% ${height - out}px`;
      ticket.style.transform = `translate3d(0, ${out - height}px, 0) rotate(${swing}deg)`;
      // La sombra de la ranura acompaña el balanceo del papel, más quieta.
      if (shadow) shadow.style.transform = `rotate(${swing * SHADOW_SWING}deg)`;
    };

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      // Llegó al final bajando: tirón del papel, para que se note que terminó.
      const isOut = progress() >= 1;
      if (isOut && !wasOut) velocity += END_KICK;
      wasOut = isOut;
      const goal = target();
      velocity += (STIFFNESS * (goal - out) - DAMPING * velocity) * dt;
      out += velocity * dt;
      if (Math.abs(goal - out) < 0.5 && Math.abs(velocity) < 4) {
        out = goal;
        velocity = 0;
        frame = 0;
        apply();
        return;
      }
      apply();
      frame = requestAnimationFrame(step);
    };

    const wake = () => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(step);
    };

    /** Lleva el papel a donde indica el scroll, sin resorte. */
    const snap = () => {
      out = target();
      velocity = 0;
      wasOut = progress() >= 1;
      apply();
    };

    const onResize = () => {
      measure();
      // Un cambio de alto (fuentes, errores del talón, la reserva) se acomoda de una: con
      // el resorte, el papel subía y bajaba solo.
      snap();
    };

    /** Baja la página hasta que el ticket salió entero (después de eso no se mueve más). */
    const scrollToFullyOut = () => {
      const fullyOut = pullStart + pullDistance;
      if (window.scrollY < fullyOut) {
        window.scrollTo({ top: fullyOut, behavior: "instant" });
        lastY = window.scrollY;
        snap();
      }
    };

    const onScroll = () => {
      const stopAt = pullStart + pullDistance;
      const y = window.scrollY;
      const now = performance.now();
      const coasting = now - lastWheel < WHEEL_MS || (!touching && now - lastTouchEnd < FLING_MS);
      if (!coasting) {
        // Lo está moviendo la persona (barra, autoscroll, teclado, dedo): no se frena.
        stopUntil = 0;
      } else if (lastY < stopAt && y > stopAt) {
        // Cruzó el final bajando: frena acá.
        stopUntil = now + STOP_MS;
        stopLimit = now + STOP_MAX_MS;
      } else if (now < stopUntil) {
        // Sigue el envión: sigue frenado (hasta el máximo).
        stopUntil = Math.min(now + STOP_MS, stopLimit);
      }
      if (now < stopUntil && y > stopAt) window.scrollTo({ top: stopAt, behavior: "instant" });
      lastY = window.scrollY;
      wake();
    };
    const onTouchStart = () => {
      touching = true;
    };
    const onTouchEnd = () => {
      touching = false;
      lastTouchEnd = performance.now();
    };
    const onWheel = () => {
      lastWheel = performance.now();
    };

    // Con el teclado se puede llegar a algo que sigue adentro de la máquina (arriba de la
    // ranura): se saca el ticket para que se vea. Lo que ya está a la vista no mueve nada.
    const onFocusIn = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      // La ranura está a `height - out` px del borde de arriba del papel.
      const slot = ticket.getBoundingClientRect().top + height - out;
      if (event.target.getBoundingClientRect().top < slot) {
        scrollToFullyOut();
        event.target.scrollIntoView({ block: "nearest" });
        lastY = window.scrollY;
      }
    };

    measure();
    snap();

    // `/#tickets` ("Volver a comprar"): el ancla está en el talón. Vino a comprar: la
    // página baja hasta pasar la pausa (ahí el ticket ya está entero y la página se mueve)
    // y después hasta el ancla.
    const anchor = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (anchor && ticket.contains(anchor)) {
      window.scrollTo({ top: pullStart + pullDistance + hold, behavior: "instant" });
      const below = anchor.getBoundingClientRect().top - FOCUS_MARGIN;
      if (below > 0) window.scrollBy(0, below);
      lastY = window.scrollY;
      snap();
    }

    // Cualquier cambio de alto del ticket o de lo que está arriba mueve el tramo fijo.
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(ticket);
    resizeObserver.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("resize", onResize);
    ticket.addEventListener("focusin", onFocusIn);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      ticket.removeEventListener("focusin", onFocusIn);
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
        <div className="ticket-pull relative z-10 -mt-[50px]">{children}</div>
      </div>
      <div ref={spacerRef} aria-hidden />
    </div>
  );
}
