import "server-only";

import nodemailer from "nodemailer";

import { serverEnv } from "@/lib/env.server";

type Mail = {
  to: string;
  subject: string;
  html: string;
  /** Imágenes inline: el HTML las referencia como `cid:<cid>`. */
  inlineImages?: { cid: string; filename: string; content: Buffer }[];
};

/**
 * Manda un mail por SMTP. El proveedor sale de las variables `SMTP_*` (hoy Gmail
 * con contraseña de aplicación); cambiarlo por Resend, Brevo o SES es cambiar solo
 * las variables, porque todos exponen SMTP.
 */
export async function sendMail({ to, subject, html, inlineImages = [] }: Mail) {
  const port = serverEnv.smtpPort;
  const transport = nodemailer.createTransport({
    host: serverEnv.smtpHost,
    port,
    // 465 es TLS directo; 587 arranca en claro y sube a TLS (STARTTLS).
    secure: port === 465,
    auth: { user: serverEnv.smtpUser, pass: serverEnv.smtpPass },
  });

  await transport.sendMail({
    from: serverEnv.emailFrom,
    to,
    subject,
    html,
    attachments: inlineImages.map(({ cid, filename, content }) => ({ cid, filename, content })),
  });
}
