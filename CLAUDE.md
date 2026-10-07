@AGENTS.md

# moevius-app

Ticketing de eventos: se publica el evento, la gente compra online (Mercado Pago), le llega el
ticket por mail con QR y el staff lo valida en la puerta desde el celular.

## Stack

- **Next.js 16** (App Router, `src/app/`) — ver AGENTS.md: leer `node_modules/next/dist/docs/` antes de usar APIs de Next.
- **Supabase** (auth + DB). Cliente en `src/lib/supabase/`; tipos generados en `src/lib/supabase/database.types.ts` (no editar a mano).
- Tailwind v4 + shadcn/ui (`src/components/ui/`), zod, Mercado Pago (Checkout Pro vía **API de Orders** + webhook), mails con nodemailer (SMTP) + react-email (`src/emails/`).
- Deploy en Vercel (previews por PR; staging fijo en `staging-moevius-app.vercel.app`, que es a donde
  apunta el webhook de la app de test de MP). Gotchas de cupo y de MP: `exploracion/ARQUITECTURA.md`.

## Mapa

- `src/app/events`, `orders`, `tickets` — flujo público de compra y ticket.
- `src/app/door` — validación del QR en la puerta (staff).
- `src/app/admin` — gestión; login de staff con email + password (magic link como fallback).
- `src/app/api` — endpoints (incluye el webhook de Mercado Pago).
- `supabase/` — migraciones. `scripts/` — scripts de staff (`pnpm staff:set`).

## Verificación

`pnpm typecheck`, `pnpm lint`, `pnpm format:check`. Cambios visuales: verificar con Playwright (`pnpm dev`).

## Cuidado (preguntar antes)

- `pnpm db:push` aplica migraciones al Supabase **remoto**: nunca correrlo sin que Fran lo pida.
- `pnpm staff:set` escribe en la DB real con `.env.local`.
- `.env.local` tiene secretos (Supabase, MP, SMTP): no imprimir sus valores.

## Convenciones

- Commits: conventional commits en **inglés** con scope (`feat(staff): …`, `fix(webhook): …`).
- Ramas: `feature/<descripcion>`. Las crea Fran.
- Repo personal (GitHub `Mugmask`): no aplica el flujo de Educabot (ODD/Jira/pub).
