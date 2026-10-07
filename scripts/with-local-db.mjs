// Corre un comando apuntando al Supabase local (Docker) en vez del remoto:
//   node scripts/with-local-db.mjs next dev
//   node scripts/with-local-db.mjs node --env-file=.env.local scripts/staff-set.mjs …
//
// Toma la URL y las claves de `supabase status` (el stack tiene que estar levantado:
// `pnpm db:local`). Lo demás (Mercado Pago de prueba, SMTP) sale de .env.local: las
// variables que setea este script tienen prioridad sobre las de ese archivo, tanto en
// Next como en `node --env-file`.
import { execFileSync, spawn } from "node:child_process";

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error("Uso: node scripts/with-local-db.mjs <comando> [args…]");
  process.exit(1);
}

let status;
try {
  status = execFileSync("npx", ["supabase", "status", "-o", "env"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    shell: process.platform === "win32",
  });
} catch {
  console.error("El Supabase local no está levantado. Corré `pnpm db:local` primero.");
  process.exit(1);
}

const local = Object.fromEntries(
  status
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2]]),
);

const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: local.SECRET_KEY,
  // Claves de prueba de Turnstile: siempre pasan.
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
  TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
};

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
  console.error("`supabase status` no devolvió API_URL / SECRET_KEY.");
  process.exit(1);
}
console.log(`→ Supabase local: ${env.NEXT_PUBLIC_SUPABASE_URL}`);

const child = spawn(cmd, args, { env, stdio: "inherit", shell: process.platform === "win32" });
child.on("exit", (code) => process.exit(code ?? 1));
