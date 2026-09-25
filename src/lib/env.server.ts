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
  get resendApiKey() {
    return required("RESEND_API_KEY", process.env.RESEND_API_KEY);
  },
  /** Ej: "Moevius <entradas@moevius.app>". El dominio tiene que estar verificado en Resend. */
  get emailFrom() {
    return required("EMAIL_FROM", process.env.EMAIL_FROM);
  },
};
