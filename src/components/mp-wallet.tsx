"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import { publicEnv } from "@/lib/supabase/env";

/**
 * Wallet Brick de Mercado Pago (SDK MercadoPago.js v2 vía `@mercadopago/sdk-react`),
 * como indica la guía de Checkout Pro. El SDK usa `window`, así que se carga solo
 * en el cliente, e inicializa con la Public Key la primera vez.
 */
const Wallet = dynamic(
  () =>
    import("@mercadopago/sdk-react").then(({ initMercadoPago, Wallet }) => {
      initMercadoPago(publicEnv.mpPublicKey, { locale: "es-AR" });
      return Wallet;
    }),
  { ssr: false, loading: () => <Skeleton className="h-12 w-full rounded-full" /> },
);

export function MpWallet({ preferenceId }: { preferenceId: string }) {
  return (
    <Wallet
      // key: si cambia la preferencia (reintento), el Brick se vuelve a montar.
      key={preferenceId}
      locale="es-AR"
      initialization={{ preferenceId, redirectMode: "self" }}
    />
  );
}
