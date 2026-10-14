"use server";

import { randomBytes } from "node:crypto";

import { z } from "zod";

import { getClientIp, verifyTurnstile } from "@/lib/abuse";
import { TIMEZONE } from "@/lib/format";
import { LEGAL } from "@/lib/legal";
import { sendMail } from "@/lib/mailer";

type WithdrawalValues = { name: string; email: string; dni: string; order: string };

export type WithdrawalState = {
  error?: string;
  values?: WithdrawalValues;
  /** Código del trámite: se muestra en pantalla y va en el mail de constancia. */
  code?: string;
};

const schema = z.object({
  name: z.string().trim().min(3, "Poné tu nombre y apellido.").max(80),
  email: z.email("Ese mail no parece válido.").trim().toLowerCase(),
  dni: z
    .string()
    .transform((dni) => dni.replace(/\D/g, ""))
    .pipe(z.string().regex(/^\d{7,8}$/, "El DNI tiene que tener 7 u 8 números.")),
  order: z.string().trim().max(80),
});

/**
 * Botón de arrepentimiento (Res. SCI 424/2020): cualquiera lo pide sin registrarse y
 * recibe en el momento un código de trámite. El pedido llega por mail al organizador,
 * que lo resuelve a mano (devolución por MP y anulación de las entradas); el comprador
 * recibe la constancia con el código. No se guarda en la base: el registro son los mails.
 */
export async function requestWithdrawal(
  _prev: WithdrawalState,
  formData: FormData,
): Promise<WithdrawalState> {
  const values: WithdrawalValues = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    dni: String(formData.get("dni") ?? ""),
    order: String(formData.get("order") ?? ""),
  };

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos.", values };
  }
  const input = parsed.data;

  const ip = await getClientIp();
  const token = formData.get("cf-turnstile-response");
  if (!(await verifyTurnstile(typeof token === "string" ? token : null, ip))) {
    return { error: "No pudimos verificar que no seas un bot. Probá de nuevo.", values };
  }

  const code = `ARR-${randomBytes(4).toString("hex").toUpperCase()}`;
  const requestedAt = new Intl.DateTimeFormat("es-AR", {
    timeZone: TIMEZONE,
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  const rows = [
    ["Código", code],
    ["Fecha del pedido", requestedAt],
    ["Nombre", input.name],
    ["Email de la compra", input.email],
    ["DNI", input.dni],
    ["Compra", input.order || "(no la indicó)"],
  ];
  const table = `<table cellpadding="6" style="border-collapse:collapse">${rows
    .map(
      ([label, value]) =>
        `<tr><td><strong>${label}</strong></td><td>${escapeHtml(value)}</td></tr>`,
    )
    .join("")}</table>`;

  try {
    await sendMail({
      to: LEGAL.email,
      subject: `Botón de arrepentimiento · ${code}`,
      html: `<p>Llegó un pedido de arrepentimiento. Hay que responderlo, devolver el pago por Mercado Pago y anular las entradas.</p>${table}`,
    });
    await sendMail({
      to: input.email,
      subject: `Recibimos tu pedido de arrepentimiento · ${code}`,
      html: `<p>Hola ${escapeHtml(input.name)}:</p><p>Recibimos tu pedido para revocar tu compra de entradas de Moevius. Tu código de trámite es <strong>${code}</strong>. Te escribimos a este mail para confirmarte la devolución del total al mismo medio de pago; las entradas de esa compra quedan anuladas.</p>${table}<p>Moevius · ${escapeHtml(LEGAL.holder)}</p>`,
    });
  } catch (err) {
    console.error("arrepentimiento: sendMail", err);
    return {
      error: `No pudimos registrar el pedido. Probá de nuevo en un rato o escribinos a ${LEGAL.email}.`,
      values,
    };
  }

  return { code };
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Lo que escribe la persona va adentro del HTML de los mails. */
function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}
