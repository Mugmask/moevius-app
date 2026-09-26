"use client";

import { ArrowUpRight } from "lucide-react";
import { useActionState, useState } from "react";

import { Field, Pill } from "@/components/brand";
import { MpWallet } from "@/components/mp-wallet";
import { Turnstile } from "@/components/turnstile";
import type { TicketTier } from "@/lib/events";
import { TIME_FORMAT, PRICE_FORMAT } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { CheckoutReservation, CheckoutState } from "./actions";

type Props = {
  tiers: TicketTier[];
  action: (prev: CheckoutState, formData: FormData) => Promise<CheckoutState>;
};

export function CheckoutForm({ tiers, action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const inStock = tiers.filter((tier) => tier.available > 0);

  const [tierId, setTierId] = useState(state.values?.ticketTypeId || inStock[0]?.id || "");
  const [quantity, setQuantity] = useState(Number(state.values?.quantity) || 1);

  const tier = tiers.find((t) => t.id === tierId) ?? inStock[0];
  const maxQuantity = tier ? Math.min(tier.maxPerOrder, tier.available) : 1;
  const validQuantity = Math.min(quantity, maxQuantity);

  if (state.reservation) return <PaymentStep reservation={state.reservation} />;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <h2 className="font-display text-3xl tracking-tight uppercase">Tus entradas</h2>

      {/* Con un solo lote no hay nada que elegir: va oculto. */}
      {tiers.length > 1 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-bold tracking-wide uppercase">Lote</legend>
          {tiers.map((t) => (
            <label
              key={t.id}
              className={cn(
                "border-foreground flex cursor-pointer items-center justify-between rounded-2xl border-2 px-4 py-3 font-bold",
                t.id === tier?.id && "bg-primary text-primary-foreground",
                t.available === 0 && "cursor-not-allowed opacity-50",
              )}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="ticketTypeId"
                  value={t.id}
                  checked={t.id === tier?.id}
                  disabled={t.available === 0}
                  onChange={() => setTierId(t.id)}
                  className="accent-foreground"
                />
                {t.name}
              </span>
              <span>{t.available === 0 ? "Agotado" : PRICE_FORMAT.format(t.price)}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <input type="hidden" name="ticketTypeId" value={tier?.id ?? ""} />
      )}

      <div>
        <label htmlFor="quantity" className="text-xs font-bold tracking-wide uppercase">
          Cantidad
        </label>
        <select
          id="quantity"
          name="quantity"
          value={validQuantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="border-foreground bg-card mt-2 h-12 w-full rounded-full border-2 px-5 font-bold"
        >
          {Array.from({ length: maxQuantity }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "entrada" : "entradas"}
            </option>
          ))}
        </select>
      </div>

      <Field
        id="name"
        name="name"
        label="Nombre y apellido"
        autoComplete="name"
        required
        defaultValue={state.values?.name}
      />
      <Field
        id="email"
        name="email"
        type="email"
        label="Email (acá te llegan las entradas)"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
      />
      <Field
        id="dni"
        name="dni"
        label="DNI"
        inputMode="numeric"
        required
        defaultValue={state.values?.dni}
      />

      <div className="border-foreground flex items-baseline justify-between border-t-2 pt-5">
        <span className="text-sm font-bold uppercase">Total</span>
        <span className="font-display text-3xl tracking-tight">
          {PRICE_FORMAT.format((tier?.price ?? 0) * validQuantity)}
        </span>
      </div>

      {/* Token nuevo por intento: cada respuesta del server (state) resetea el widget. */}
      <Turnstile resetKey={state} />

      {state.error && (
        <p role="alert" className="bg-muted rounded-2xl px-4 py-3 text-sm font-bold">
          {state.error}
        </p>
      )}

      <Pill type="submit" disabled={pending || !tier} className="justify-center">
        {pending ? "Reservando…" : "Continuar al pago"}
        {!pending && <ArrowUpRight data-icon="inline-end" className="size-5" />}
      </Pill>
    </form>
  );
}

/** Segundo paso: la reserva ya está hecha y se paga con el Wallet Brick de MP. */
function PaymentStep({ reservation }: { reservation: CheckoutReservation }) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-3xl tracking-tight uppercase">Pagá tu reserva</h2>

      <dl className="border-foreground flex flex-col gap-2 border-y-2 py-4 text-sm font-bold">
        <div className="flex justify-between">
          <dt>
            {reservation.quantity} × {reservation.tierName}
          </dt>
          <dd>{PRICE_FORMAT.format(reservation.total)}</dd>
        </div>
      </dl>

      <p className="text-sm font-medium">
        Te guardamos {reservation.quantity === 1 ? "la entrada" : "las entradas"} hasta las{" "}
        <strong>{TIME_FORMAT.format(new Date(reservation.expiresAt))}</strong>. Pagá con tarjeta,
        dinero en cuenta o transferencia desde Mercado Pago.
      </p>

      <MpWallet preferenceId={reservation.preferenceId} />
    </div>
  );
}
