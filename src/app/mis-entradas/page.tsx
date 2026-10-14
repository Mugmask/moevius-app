import type { Metadata } from "next";

import { PaperSlip } from "@/components/paper-slip";
import { SavedTicketsList } from "@/components/saved-tickets";
import { SiteFooter } from "@/components/site-chrome";

import { ResendForm } from "./resend-form";

export const metadata: Metadata = {
  title: "Mis entradas · Moevius",
  description: "Recuperá tus entradas de Moevius: te las reenviamos al mail de la compra.",
};

/**
 * Sin login: las entradas de este dispositivo (si se abrieron acá) y, si no están, el
 * reenvío al mail de la compra. Nunca se muestran por pantalla a partir del mail.
 */
export default function MyTicketsPage() {
  return (
    <>
      <main className="flex flex-1 flex-col">
        <PaperSlip label="Mis entradas" title="¿Perdiste tu entrada?" seed="mis-entradas" back>
          <SavedTicketsList />
          <p className="mb-6">
            Poné el mail con el que compraste y te reenviamos las entradas ahí, con el QR para la
            puerta.
          </p>
          <ResendForm />
        </PaperSlip>
      </main>
      <SiteFooter />
    </>
  );
}
