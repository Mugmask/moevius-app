"use client";

import { ArrowUpRight, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { useSecondsLeft } from "@/components/countdown";
import { MpPayButton } from "@/components/mp-pay-button";
import { INK_BUTTON, PaperField } from "@/components/paper-slip";
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

/**
 * La compra escrita en el talón del ticket, como un recibo: los datos del titular, el lote
 * (si hay más de uno) y la cantidad, y al final el total y el botón. Al reservar, el talón
 * queda sellado con la cuenta regresiva y el botón para pagar en Mercado Pago. Si la reserva
 * vence, "Empezar de nuevo" remonta el form. Va dentro del talón del ticket, que pone el
 * mono y las mayúsculas.
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

      <h3 className="font-display font-stretch-condensed text-3xl leading-none font-extrabold sm:text-4xl">
        Comprá tu entrada
      </h3>
      <p className="mt-2 font-sans text-sm leading-snug normal-case opacity-70 sm:text-base">
        Completá tus datos, elegí cuántas y reservá. Pagás en Mercado Pago y la entrada te llega por
        mail.
      </p>

      <fieldset className="mt-8">
        <StepLegend step={1}>Tus datos</StepLegend>
        <div className="mt-4 flex flex-col gap-4">
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
            hint="Te mandamos la entrada con el QR a este mail."
            placeholder="vos@mail.com"
            autoComplete="email"
            required
            defaultValue={state.values?.email}
          />
          <PaperField
            id="dni"
            name="dni"
            label="DNI"
            hint="Te lo piden en la puerta junto con el QR."
            placeholder="12.345.678"
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

      <fieldset className="mt-8">
        <StepLegend step={2}>Cuántas entradas</StepLegend>
        {/* Con un solo tipo de entrada no hay nada que elegir: la lista de lotes aparece
          recién si la fecha tiene más de uno (ej. preventa y general). */}
        {tiers.length > 1 && (
          <div role="radiogroup" aria-label="Lote" className="mt-4">
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
          </div>
        )}

        <Quantity
          value={validQuantity}
          max={maxQuantity}
          price={tier?.price ?? 0}
          onChange={setQuantity}
          className="mt-4"
        />
      </fieldset>

      <div className="border-ink mt-8 flex items-end justify-between gap-4 border-t-2 pt-4">
        <div>
          <p className="font-bold tracking-[0.2em]">Total</p>
          <p className="mt-1 font-sans text-sm normal-case opacity-70">
            {validQuantity} {validQuantity === 1 ? "entrada" : "entradas"}
          </p>
        </div>
        <output
          aria-live="polite"
          className="font-display font-stretch-expanded text-4xl leading-none font-extrabold tracking-tight tabular-nums sm:text-5xl"
        >
          {PRICE_FORMAT.format(total)}
        </output>
      </div>

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

      <button type="submit" disabled={pending || !tier} className={cn(INK_BUTTON, "mt-6")}>
        {pending ? "Reservando…" : "Reservar y pagar"}
        {!pending && <ArrowUpRight aria-hidden className="text-primary size-5" />}
      </button>
      <p className="mt-3 text-center font-sans text-xs leading-snug normal-case opacity-70 sm:text-sm">
        Te guardamos {validQuantity === 1 ? "la entrada" : "las entradas"} {RESERVATION_MINUTES}{" "}
        minutos mientras pagás en Mercado Pago. Al reservar aceptás los{" "}
        <Link href="/terminos" className="font-semibold underline underline-offset-2">
          Términos y condiciones
        </Link>{" "}
        y la{" "}
        <Link href="/privacidad" className="font-semibold underline underline-offset-2">
          Política de privacidad
        </Link>
        .
      </p>
    </form>
  );
}

/** Título de cada paso del talón: el número en un círculo y qué se completa. */
function StepLegend({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <legend className="flex items-center gap-3 font-bold tracking-[0.15em]">
      <span
        aria-hidden
        className="bg-ink text-paper grid size-7 shrink-0 place-items-center rounded-full text-sm"
      >
        {step}
      </span>
      {children}
    </legend>
  );
}

function Quantity({
  value,
  max,
  price,
  onChange,
  className,
}: {
  value: number;
  max: number;
  price: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  const buttonClass =
    "border-ink hover:bg-ink hover:text-paper focus-visible:ring-ink/30 flex size-11 items-center justify-center rounded-full border-2 outline-none focus-visible:ring-4 active:scale-95 disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <p id="quantity-label" className="font-sans normal-case">
        <span className="block font-semibold tabular-nums">{PRICE_FORMAT.format(price)} c/u</span>
        <span className="block text-xs opacity-70 sm:text-sm">Hasta {max} por compra</span>
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
          <MpPayButton checkoutUrl={reservation.checkoutUrl} className="mt-7" />
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
