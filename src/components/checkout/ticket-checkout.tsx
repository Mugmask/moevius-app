"use client";

import { ArrowUpRight, Minus, Plus } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { useSecondsLeft } from "@/components/countdown";
import { Arrow, Note } from "@/components/doodles";
import { ReceiptRule } from "@/components/receipt";
import { Turnstile } from "@/components/turnstile";
import { RESERVATION_MINUTES } from "@/lib/config";
import type { TicketTier } from "@/lib/events";
import { PRICE_FORMAT, TIME_FORMAT } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { CheckoutReservation, CheckoutState } from "./actions";

type Action = (prev: CheckoutState, formData: FormData) => Promise<CheckoutState>;

/** Ancla de la compra: `/#tickets` (links viejos, "Volver a comprar") baja hasta acá. */
export const CHECKOUT_ANCHOR = "tickets";

const INK_BUTTON =
  "bg-ink text-paper hover:bg-ink/85 focus-visible:ring-ink/30 flex h-14 w-full items-center justify-between gap-3 rounded-full px-6 font-mono text-sm font-bold tracking-wider uppercase outline-none focus-visible:ring-4 active:scale-[0.98] disabled:opacity-50 sm:h-16 sm:px-8 sm:text-base";

/**
 * La compra escrita en el talón del ticket, como un recibo: lote, cantidad, total y los
 * datos del titular. Al reservar, el talón queda sellado con la cuenta regresiva y el
 * botón para pagar en Mercado Pago. Si la reserva vence, "Empezar de nuevo" remonta el
 * form. Va dentro del talón del ticket, que pone el mono y las mayúsculas.
 */
export function TicketCheckout({ tiers, action }: { tiers: TicketTier[]; action: Action }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <div id={CHECKOUT_ANCHOR} className="scroll-mt-6">
      <CheckoutStub
        key={attempt}
        tiers={tiers}
        action={action}
        onRestart={() => setAttempt((n) => n + 1)}
      />
    </div>
  );
}

function CheckoutStub({
  tiers,
  action,
  onRestart,
}: {
  tiers: TicketTier[];
  action: Action;
  onRestart: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const inStock = tiers.filter((tier) => tier.available > 0);

  const [tierId, setTierId] = useState(inStock[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);

  const tier = inStock.find((t) => t.id === tierId) ?? inStock[0];
  const maxQuantity = tier ? Math.min(tier.maxPerOrder, tier.available) : 1;
  const validQuantity = Math.min(quantity, maxQuantity);
  const total = (tier?.price ?? 0) * validQuantity;

  if (state.reservation) {
    return <ReservedStub reservation={state.reservation} onRestart={onRestart} />;
  }

  return (
    <form action={formAction} className="relative">
      <input type="hidden" name="ticketTypeId" value={tier?.id ?? ""} />
      <input type="hidden" name="quantity" value={validQuantity} />

      <div className="relative">
        <h3 className="font-bold tracking-[0.2em]">Tu entrada</h3>
        <Note className="absolute -top-4 right-0 rotate-[-5deg] text-xl sm:-top-6 sm:text-3xl">
          ¡completá acá!
        </Note>
        <Arrow className="text-accent absolute top-4 right-28 size-9 rotate-[20deg] sm:top-6 sm:right-44 sm:size-11" />
      </div>

      <fieldset className="mt-6">
        <legend className="sr-only">Lote</legend>
        <div aria-hidden className="flex justify-between opacity-60">
          <span>Lote</span>
          <span>Precio</span>
        </div>
        <div className="mt-2 flex flex-col">
          {tiers.map((t) => {
            const soldOut = t.available === 0;
            const selected = t.id === tier?.id;
            return (
              <label
                key={t.id}
                className={cn(
                  "has-focus-visible:outline-ink relative -mx-2 flex min-h-12 cursor-pointer items-center gap-3 rounded-sm px-2 has-focus-visible:outline-2",
                  soldOut && "cursor-not-allowed opacity-40",
                )}
              >
                <input
                  type="radio"
                  name="tier"
                  value={t.id}
                  checked={selected}
                  disabled={soldOut}
                  onChange={() => setTierId(t.id)}
                  className="sr-only"
                />
                {/* La casilla impresa: se rellena con tinta al marcarla. */}
                <span
                  aria-hidden
                  className="border-ink grid size-5 shrink-0 place-items-center border-2"
                >
                  <span className={cn("bg-ink size-2.5", !selected && "invisible")} />
                </span>
                <span className={cn("font-bold", soldOut && "line-through")}>{t.name}</span>
                <span
                  aria-hidden
                  className="border-ink/30 flex-1 translate-y-1 border-b-2 border-dotted"
                />
                <span className="font-bold tabular-nums">
                  {soldOut ? "Agotado" : PRICE_FORMAT.format(t.price)}
                </span>
                {/* Lo elegido, marcado con resaltador. */}
                {selected && (
                  <span
                    aria-hidden
                    className="bg-primary pointer-events-none absolute inset-x-0 inset-y-1.5 -rotate-[0.6deg] rounded-sm opacity-75 mix-blend-multiply"
                  />
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      <Quantity value={validQuantity} max={maxQuantity} onChange={setQuantity} />

      <ReceiptRule />

      <div className="flex items-end justify-between gap-4">
        <span className="font-bold tracking-[0.2em]">Total</span>
        <output
          aria-live="polite"
          className="font-display font-stretch-expanded text-4xl leading-none font-extrabold tracking-tight tabular-nums sm:text-5xl"
        >
          {PRICE_FORMAT.format(total)}
        </output>
      </div>

      <ReceiptRule />

      <fieldset className="relative">
        <legend className="font-bold tracking-[0.2em]">Titular</legend>
        <div className="mt-4 flex flex-col gap-5">
          <PaperField
            id="name"
            name="name"
            label="Nombre y apellido"
            autoComplete="name"
            required
            defaultValue={state.values?.name}
          />
          <PaperField
            id="email"
            name="email"
            type="email"
            label="Email"
            hint="Acá te llega la entrada con el QR."
            note="¡acá te llega el QR!"
            autoComplete="email"
            required
            defaultValue={state.values?.email}
          />
          <PaperField
            id="dni"
            name="dni"
            label="DNI"
            hint="Lo piden en la puerta."
            inputMode="numeric"
            autoComplete="off"
            // Lo mismo que acepta el server: 7 u 8 números, con o sin puntos.
            pattern="[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}"
            maxLength={10}
            title="7 u 8 números, con o sin puntos."
            required
            defaultValue={state.values?.dni}
          />
        </div>
      </fieldset>

      {/* Token nuevo por intento: cada respuesta del server (state) resetea el widget. */}
      <div className="mt-5 empty:hidden">
        <Turnstile resetKey={state} theme="light" compact />
      </div>

      {state.error && (
        <p
          role="alert"
          className="border-accent bg-accent/10 mt-5 border-l-4 px-3 py-2 font-sans text-sm font-semibold normal-case"
        >
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending || !tier} className={cn(INK_BUTTON, "mt-7")}>
        {pending ? "Reservando…" : `Reservar · ${PRICE_FORMAT.format(total)}`}
        {!pending && <ArrowUpRight aria-hidden className="text-primary size-5" />}
      </button>
      <p className="mt-3 text-center font-sans text-xs leading-snug normal-case opacity-70 sm:text-sm">
        Te guardamos {validQuantity === 1 ? "la entrada" : "las entradas"} {RESERVATION_MINUTES}{" "}
        minutos mientras pagás en Mercado Pago.
      </p>
    </form>
  );
}

/**
 * Renglón del recibo para escribir: etiqueta a la izquierda (arriba en el celu) y la
 * línea a la derecha. `note`: lo mismo que `hint`, escrito a mano al costado.
 */
function PaperField({
  label,
  id,
  hint,
  note,
  ...props
}: React.ComponentProps<"input"> & { label: string; id: string; hint?: string; note?: string }) {
  return (
    <div className="relative sm:grid sm:grid-cols-[11rem_1fr] sm:items-end sm:gap-4">
      <label htmlFor={id} className="block pb-1 opacity-60 sm:pb-2.5">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...props}
        className="border-ink/35 text-ink focus:border-ink focus-visible:bg-ink/5 h-11 w-full rounded-none border-0 border-b-2 bg-transparent px-1 font-mono text-base font-semibold normal-case outline-none sm:h-12 sm:text-lg"
      />
      {hint && (
        <span id={`${id}-hint`} className="sr-only">
          {hint}
        </span>
      )}
      {note && (
        <Note className="absolute -top-3 right-0 rotate-[-3deg] text-sm sm:-top-4 sm:text-lg">
          {note}
        </Note>
      )}
    </div>
  );
}

function Quantity({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const buttonClass =
    "border-ink hover:bg-ink hover:text-paper focus-visible:ring-ink/30 flex size-11 items-center justify-center rounded-full border-2 outline-none focus-visible:ring-4 active:scale-95 disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <p id="quantity-label">
        <span className="font-bold">Cantidad</span>{" "}
        <span className="whitespace-nowrap opacity-60">· hasta {max}</span>
      </p>
      <div role="group" aria-labelledby="quantity-label" className="flex items-center gap-3">
        <button
          type="button"
          className={buttonClass}
          onClick={() => onChange(value - 1)}
          disabled={value <= 1}
          aria-label="Una entrada menos"
        >
          <Minus className="size-5" />
        </button>
        <output aria-live="polite" className="w-10 text-center text-2xl font-bold tabular-nums">
          {String(value).padStart(2, "0")}
        </output>
        <button
          type="button"
          className={buttonClass}
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          aria-label="Una entrada más"
        >
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}

/** El talón sellado: la reserva está hecha y falta pagarla en Mercado Pago. */
function ReservedStub({
  reservation,
  onRestart,
}: {
  reservation: CheckoutReservation;
  onRestart: () => void;
}) {
  const secondsLeft = useSecondsLeft(reservation.expiresAt);
  const expired = secondsLeft === 0;
  const tickets = reservation.quantity === 1 ? "la entrada" : "las entradas";

  // El form que tenía el foco ya no existe: el foco pasa al título del talón nuevo.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [expired]);

  return (
    <div className="relative">
      {/* El sello de goma, torcido sobre el papel. */}
      <p
        aria-hidden
        className={cn(
          "font-display font-stretch-expanded pointer-events-none absolute -top-2 right-0 rotate-[-6deg] rounded-md border-[3px] px-2 text-base font-extrabold tracking-tight mix-blend-multiply sm:text-xl",
          expired ? "border-ink/40 text-ink/40" : "border-accent text-accent",
        )}
      >
        {expired ? "Vencida" : "Reservada"}
      </p>

      <h3 ref={headingRef} tabIndex={-1} className="font-bold tracking-[0.2em] outline-none">
        {expired ? "Se venció la reserva" : "Pagá tu reserva"}
      </h3>
      <p className="mt-5 flex items-baseline gap-3 font-bold">
        {reservation.quantity} × {reservation.tierName}
        <span aria-hidden className="border-ink/30 flex-1 border-b-2 border-dotted" />
        <span className="tabular-nums">{PRICE_FORMAT.format(reservation.total)}</span>
      </p>

      <ReceiptRule />

      {expired ? (
        <>
          <p className="font-sans leading-snug normal-case opacity-80">
            Liberamos {tickets} para que las pueda comprar otra persona. Si querés, empezá de nuevo:
            si queda lugar, te las volvemos a guardar.
          </p>
          <button type="button" onClick={onRestart} className={cn(INK_BUTTON, "mt-6")}>
            Empezar de nuevo
            <ArrowUpRight aria-hidden className="text-primary size-5" />
          </button>
        </>
      ) : (
        <>
          <div className="text-center">
            {/* aria-hidden: un número que cambia cada segundo no se anuncia; la hora
                límite está escrita abajo. */}
            <p
              aria-hidden
              className="text-6xl leading-none font-bold tracking-tight tabular-nums sm:text-7xl"
            >
              {secondsLeft === null ? "--:--" : formatMinutes(secondsLeft)}
            </p>
            <p className="mt-3 opacity-60">
              Te la guardamos hasta las {TIME_FORMAT.format(new Date(reservation.expiresAt))}
            </p>
          </div>
          {/* MP abre su app en el celu si está instalada, con la cuenta ya logueada. */}
          <a href={reservation.checkoutUrl} className={cn(INK_BUTTON, "mt-7")}>
            Ir a pagar
            <ArrowUpRight aria-hidden className="text-primary size-5" />
          </a>
          <p className="mt-3 text-center font-sans text-xs leading-snug normal-case opacity-70 sm:text-sm">
            En Mercado Pago, con tarjeta, dinero en cuenta o transferencia. Apenas se acredita, te{" "}
            {reservation.quantity === 1 ? "llega" : "llegan"} {tickets} por mail.
          </p>
        </>
      )}
    </div>
  );
}

function formatMinutes(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
