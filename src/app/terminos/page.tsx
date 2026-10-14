import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "@/components/legal-document";
import { RESERVATION_MINUTES } from "@/lib/config";
import { CONSUMER_DEFENSE_URL, LEGAL, legalIdentity, WITHDRAWAL_DAYS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Términos y condiciones · Moevius",
  description: "Las condiciones de compra y de uso de las entradas de Moevius.",
};

export default function TermsPage() {
  return (
    <LegalDocument label="Legal" title="Términos y condiciones">
      <p>
        Estos términos rigen la compra de entradas en este sitio y el uso de esas entradas para
        entrar a las fiestas de Moevius. Al comprar, aceptás estos términos y la{" "}
        <Link href="/privacidad">Política de privacidad</Link>. Si no estás de acuerdo, no compres.
      </p>

      <h2>1. Quién vende</h2>
      <p>
        Las entradas las vende y la fiesta la organiza <strong>{LEGAL.holder}</strong>
        {legalIdentity()}
        {LEGAL.holder !== "Moevius" && <> (en adelante, &quot;Moevius&quot;)</>}. Contacto:{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> o{" "}
        <a href={LEGAL.instagram} target="_blank" rel="noreferrer">
          Instagram
        </a>
        .
      </p>

      <h2>2. La compra</h2>
      <ul>
        <li>
          El precio que ves en el ticket es el <strong>precio final</strong> en pesos argentinos,
          por entrada. El total de la compra se muestra antes de pagar.
        </li>
        <li>
          Para comprar tenés que ser mayor de 18 años y cargar datos verdaderos: nombre y apellido,
          email y DNI. Las entradas quedan a nombre de quien compra.
        </li>
        <li>
          Al reservar, te guardamos las entradas durante {RESERVATION_MINUTES} minutos para que
          pagues. Si no se acredita el pago en ese tiempo, la reserva vence y las entradas vuelven a
          la venta.
        </li>
        <li>
          El pago lo procesa <strong>Mercado Pago</strong>, con sus propias condiciones. Moevius no
          ve ni guarda los datos de tu tarjeta o cuenta.
        </li>
        <li>
          La compra queda confirmada cuando Mercado Pago acredita el pago. Si el pago llega con la
          reserva vencida y ya no quedan entradas, te devolvemos el total al mismo medio de pago.
        </li>
        <li>Hay un máximo de entradas por compra, que se indica al comprar.</li>
      </ul>

      <h2>3. Las entradas</h2>
      <ul>
        <li>
          Te llegan por mail, cada una con un <strong>código QR</strong>. También las ves en la
          página de tu compra. Revisá la carpeta de spam si no te llegan.
        </li>
        <li>
          Cada QR vale para <strong>una persona y un solo ingreso</strong>. En la puerta se escanea
          y queda usado: si alguien lo mostró antes, no vas a poder entrar con ese código.
        </li>
        <li>
          Cuidá tus QR como si fueran plata: no los publiques ni los compartas con quien no va a
          usarlos. Moevius no responde por entradas copiadas, compradas a terceros o usadas por otra
          persona.
        </li>
        <li>
          Está prohibida la reventa. Podemos anular entradas compradas para revender o con datos
          falsos, o con un pago desconocido o contracargado.
        </li>
      </ul>

      <h2>4. El ingreso a la fiesta</h2>
      <ul>
        <li>
          La fiesta es <strong>solo para mayores de 18 años</strong>. En la puerta te pedimos el QR
          y el DNI (físico o digital en Mi Argentina).
        </li>
        <li>
          Moevius y el lugar se reservan el derecho de admisión y permanencia, conforme a la
          normativa vigente y sin discriminar a nadie. Por ejemplo, no puede entrar o quedarse quien
          ponga en riesgo a otras personas, no cumpla las indicaciones del personal de seguridad o
          del lugar, o esté visiblemente alcoholizado.
        </li>
        <li>
          No se permite ingresar con armas, sustancias ilegales, bebidas de afuera ni objetos
          peligrosos. Puede haber controles en la entrada.
        </li>
        <li>
          Si te retirás de la fiesta, no está garantizado que puedas volver a entrar con la misma
          entrada.
        </li>
        <li>
          El horario publicado es de referencia. El lineup puede cambiar por causas ajenas a
          Moevius; eso no da derecho a reembolso si la fiesta se hace igual en la fecha y el lugar
          anunciados.
        </li>
      </ul>

      <h2>5. Cancelación, cambio de fecha y reembolsos</h2>
      <ul>
        <li>
          Si la fiesta se <strong>cancela</strong>, te devolvemos el total que pagaste al mismo
          medio de pago.
        </li>
        <li>
          Si cambia la <strong>fecha o el lugar</strong>, tu entrada sigue valiendo para la nueva
          fecha. Si no podés ir, podés pedir la devolución del total escribiéndonos dentro de los 10
          días de anunciado el cambio.
        </li>
        <li>
          Fuera de estos casos y del derecho de arrepentimiento (punto 6), no hacemos devoluciones
          por no poder asistir, llegar tarde o que no te dejen entrar por no cumplir estos términos.
        </li>
        <li>
          Las devoluciones se hacen por Mercado Pago. Según el medio de pago, pueden tardar unos
          días en verse en tu cuenta o resumen.
        </li>
      </ul>

      <h2>6. Derecho de arrepentimiento</h2>
      <p>
        Como la compra es online, podés revocarla sin costo ni explicación dentro de los{" "}
        <strong>{WITHDRAWAL_DAYS} días corridos</strong> desde que la hiciste (artículo 34 de la Ley
        24.240 y artículos 1110 y siguientes del Código Civil y Comercial), siempre que la fiesta no
        haya ocurrido. Lo pedís desde el{" "}
        <Link href="/arrepentimiento">Botón de arrepentimiento</Link>: te damos un código de trámite
        en el momento y te devolvemos el total al mismo medio de pago. Las entradas de esa compra
        quedan anuladas.
      </p>

      <h2>7. Fotos y videos</h2>
      <p>
        En la fiesta puede haber registro de fotos y videos para difundir Moevius en redes y en este
        sitio. Si no querés aparecer, avisale al equipo de fotos en el momento o escribinos después
        y sacamos el material donde se te reconozca.
      </p>

      <h2>8. Responsabilidad</h2>
      <p>
        Moevius no responde por objetos perdidos, olvidados o dañados durante la fiesta, ni por
        demoras o fallas de servicios de terceros (Mercado Pago, el proveedor de mail o tu conexión)
        fuera de su control. Nada de esto limita los derechos que te da la Ley de Defensa del
        Consumidor.
      </p>

      <h2>9. Datos personales</h2>
      <p>
        Usamos tus datos para emitir y controlar tus entradas, como se explica en la{" "}
        <Link href="/privacidad">Política de privacidad</Link>.
      </p>

      <h2>10. Cambios a estos términos</h2>
      <p>
        Podemos actualizar estos términos. La fecha de arriba indica la última versión. A cada
        compra se le aplican los términos vigentes al momento de hacerla.
      </p>

      <h2>11. Ley aplicable y reclamos</h2>
      <p>
        Estos términos se rigen por las leyes de la República Argentina. Si tenés un problema,
        escribinos primero a <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> y lo resolvemos.
        También podés hacer tu reclamo ante la autoridad de Defensa del Consumidor:{" "}
        <a href={CONSUMER_DEFENSE_URL} target="_blank" rel="noreferrer">
          Ventanilla Única Federal de reclamos
        </a>
        . Para cualquier controversia son competentes los tribunales del domicilio del consumidor.
      </p>
    </LegalDocument>
  );
}
