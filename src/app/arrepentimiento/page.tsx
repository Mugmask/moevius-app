import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "@/components/legal-document";
import { WITHDRAWAL_DAYS } from "@/lib/legal";

import { WithdrawalForm } from "./withdrawal-form";

export const metadata: Metadata = {
  title: "Botón de arrepentimiento · Moevius",
  description: "Revocá tu compra de entradas dentro de los 10 días.",
};

/** Botón de arrepentimiento (Res. SCI 424/2020): sin registrarse, con código en el momento. */
export default function WithdrawalPage() {
  return (
    <LegalDocument label="Legal" title="Botón de arrepentimiento" showUpdatedAt={false}>
      <p>
        Podés revocar tu compra sin costo ni explicación dentro de los{" "}
        <strong>{WITHDRAWAL_DAYS} días corridos</strong> desde que la hiciste, siempre que la fiesta
        no haya ocurrido. Completá tus datos y te damos un código de trámite en el momento.
      </p>
      <ul>
        <li>Te devolvemos el total al mismo medio de pago con el que pagaste en Mercado Pago.</li>
        <li>Las entradas de esa compra quedan anuladas y no sirven para entrar.</li>
        <li>
          Más detalles en los <Link href="/terminos">Términos y condiciones</Link>.
        </li>
      </ul>
      <WithdrawalForm />
    </LegalDocument>
  );
}
