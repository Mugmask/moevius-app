import { redirect } from "next/navigation";

/**
 * La compra vive en la home (hay una sola fiesta a la vez). Esta ruta queda para que
 * no se rompan los links viejos: mails, órdenes y lo que se haya compartido.
 */
export default function EventPage() {
  redirect("/#tickets");
}
