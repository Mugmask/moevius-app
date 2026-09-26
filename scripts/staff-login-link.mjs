// Genera un link de login para un usuario de staff sin mandar mail, con la API admin
// de Supabase. Sirve para probar con usuarios de test (el SMTP por defecto de
// Supabase solo entrega a mails del equipo). El link es de un solo uso y vence en 1 h.
//
// Uso: pnpm staff:link <email> [url-del-sitio]
//   pnpm staff:link admin@moevius.test
//   pnpm staff:link puerta@moevius.test https://mi-preview.vercel.app

import { createClient } from "@supabase/supabase-js";

const [email, siteArg] = process.argv.slice(2);
if (!email) {
  console.error("Uso: pnpm staff:link <email> [url-del-sitio]");
  process.exit(1);
}

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SECRET_KEY: secret } = process.env;
if (!url || !secret) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  process.exit(1);
}

const site = (siteArg ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
const supabase = createClient(url, secret, { auth: { persistSession: false } });

const { data, error } = await supabase.auth.admin.generateLink({ type: "magiclink", email });
if (error) {
  console.error(`No se pudo generar el link: ${error.message}`);
  process.exit(1);
}

const link = new URL(`${site}/auth/callback`);
link.searchParams.set("token_hash", data.properties.hashed_token);
link.searchParams.set("type", "email");
link.searchParams.set("next", "/admin");
console.log(link.toString());
