import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal-document";
import { LEGAL, legalIdentity } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de privacidad · Moevius",
  description: "Qué datos personales usa Moevius, para qué y cómo ejercer tus derechos.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument label="Legal" title="Política de privacidad">
      <p>
        Esta política explica qué datos personales usamos cuando comprás una entrada o te anotás
        para enterarte de las próximas fechas, para qué los usamos y cómo ejercer tus derechos,
        según la Ley 25.326 de Protección de los Datos Personales.
      </p>

      <h2>1. Responsable</h2>
      <p>
        El responsable de los datos es <strong>{LEGAL.holder}</strong>
        {legalIdentity()}. Para cualquier consulta sobre tus datos:{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <h2>2. Qué datos usamos</h2>
      <ul>
        <li>
          <strong>Al comprar:</strong> nombre y apellido, email y DNI, la cantidad de entradas y el
          estado del pago.
        </li>
        <li>
          <strong>En la puerta:</strong> el registro de cuándo se escaneó cada entrada.
        </li>
        <li>
          <strong>Si te anotás para las próximas fechas:</strong> tu email.
        </li>
        <li>
          <strong>Datos técnicos:</strong> la dirección IP desde la que reservás, para evitar abusos
          y fraudes.
        </li>
      </ul>
      <p>
        <strong>No vemos ni guardamos los datos de tu tarjeta o cuenta de pago:</strong> el pago lo
        hacés directamente en Mercado Pago.
      </p>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Emitir tus entradas, mandártelas por mail y mostrarte el estado de tu compra.</li>
        <li>Controlar el ingreso: en la puerta comparamos la entrada con tu DNI.</li>
        <li>Atender consultas, devoluciones, arrepentimientos y reclamos.</li>
        <li>Prevenir fraudes, reventa y abusos del sistema de reservas.</li>
        <li>
          Si te anotaste, avisarte de las próximas fechas. Te podés dar de baja cuando quieras
          escribiéndonos.
        </li>
        <li>Cumplir obligaciones legales, contables e impositivas.</li>
      </ul>
      <p>No vendemos ni alquilamos tus datos, ni los usamos para publicidad de terceros.</p>

      <h2>4. Con quién los compartimos</h2>
      <p>Solo con los proveedores que necesitamos para que la compra funcione:</p>
      <ul>
        <li>
          <strong>Mercado Pago</strong>, para procesar el pago (le pasamos tu nombre, email y el
          detalle de la compra).
        </li>
        <li>
          <strong>Supabase</strong> (base de datos) y <strong>Vercel</strong> (servidores del
          sitio), donde se guardan y procesan los datos.
        </li>
        <li>El proveedor de email con el que te mandamos las entradas.</li>
        <li>
          <strong>Cloudflare Turnstile</strong>, que verifica que quien compra no sea un bot.
        </li>
        <li>Autoridades, cuando una ley o una orden judicial lo exija.</li>
      </ul>
      <p>
        Algunos de estos proveedores tienen servidores fuera de la Argentina. Al comprar, consentís
        esa transferencia, que se hace con proveedores que protegen los datos con estándares
        adecuados.
      </p>

      <h2>5. Cuánto tiempo los guardamos</h2>
      <p>
        Los datos de las compras, mientras sean necesarios para la fiesta, las devoluciones y los
        reclamos, y después por el plazo que exigen las normas contables e impositivas. El email
        para las próximas fechas, hasta que te des de baja.
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Podés pedir <strong>acceso</strong> a tus datos, su <strong>rectificación</strong>,{" "}
        <strong>actualización</strong> o <strong>supresión</strong>, escribiendo a{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> desde el mail de la compra. Respondemos
        los pedidos de acceso dentro de los 10 días corridos y los de rectificación o supresión
        dentro de los 5 días hábiles. Darnos tus datos es voluntario, pero sin nombre, email y DNI
        no podemos emitir la entrada.
      </p>
      <p>
        El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los
        mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un
        interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley N°
        25.326. La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control
        de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan
        quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en
        materia de protección de datos personales.
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Usamos conexiones cifradas y accesos restringidos: solo el equipo de Moevius que lo necesita
        puede ver los datos de las compras.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Este sitio no usa cookies de publicidad ni de seguimiento. Solo usa las cookies técnicas
        necesarias para que funcione (por ejemplo, el ingreso del staff) y las de Cloudflare
        Turnstile al momento de reservar.
      </p>

      <h2>9. Cambios</h2>
      <p>
        Si cambiamos esta política, actualizamos la fecha de arriba. Si el cambio es importante, te
        avisamos por mail.
      </p>
    </LegalDocument>
  );
}
