import "server-only";

import { required } from "@/lib/supabase/env";

/** Secretos. `server-only` hace fallar el build si algún componente cliente lo importa. */
export const serverEnv = {
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
  },
  get mpAccessToken() {
    return required("MP_ACCESS_TOKEN", process.env.MP_ACCESS_TOKEN);
  },
  get mpWebhookSecret() {
    return required("MP_WEBHOOK_SECRET", process.env.MP_WEBHOOK_SECRET);
  },
  /** SMTP para los mails de entradas. Con Gmail: smtp.gmail.com, 465 y contraseña de aplicación. */
  get smtpHost() {
    return required("SMTP_HOST", process.env.SMTP_HOST);
  },
  get smtpPort() {
    return Number(required("SMTP_PORT", process.env.SMTP_PORT));
  },
  get smtpUser() {
    return required("SMTP_USER", process.env.SMTP_USER);
  },
  get smtpPass() {
    return required("SMTP_PASS", process.env.SMTP_PASS);
  },
  /** Ej: "Moevius <moevius.entradas@gmail.com>". Con Gmail tiene que ser la misma cuenta que SMTP_USER. */
  get emailFrom() {
    return required("EMAIL_FROM", process.env.EMAIL_FROM);
  },
};
