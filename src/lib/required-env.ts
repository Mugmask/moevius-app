/**
 * Variables sin las que la app no puede vender. `next.config.ts` las exige en el
 * build de deploy, así una que falta frena el deploy en vez de aparecer cuando llega
 * el primer pago. Si agregás una variable obligatoria en `env.ts` o `env.server.ts`,
 * sumala acá.
 *
 * Turnstile no está: es opcional (sin sus claves el widget no se muestra).
 */
export const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_MP_PUBLIC_KEY",
  "SUPABASE_SECRET_KEY",
  "MP_ACCESS_TOKEN",
  "MP_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
] as const;

export function missingRequiredEnv(env: NodeJS.ProcessEnv = process.env) {
  return REQUIRED_ENV.filter((name) => !env[name]);
}
