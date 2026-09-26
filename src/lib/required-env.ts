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
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "EMAIL_FROM",
] as const;

/**
 * En los previews de Vercel la URL sale de `VERCEL_BRANCH_URL`. Todo lo demás es
 * obligatorio también en preview: tiene que poder hacer lo mismo que producción.
 */
const OPTIONAL_IN_PREVIEW: readonly string[] = ["NEXT_PUBLIC_SITE_URL"];

export function missingRequiredEnv({
  env = process.env,
  preview = false,
}: { env?: NodeJS.ProcessEnv; preview?: boolean } = {}) {
  return REQUIRED_ENV.filter(
    (name) => !env[name] && !(preview && OPTIONAL_IN_PREVIEW.includes(name)),
  );
}
