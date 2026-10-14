# Moevius app

Publicás el evento, la gente compra online, le llega el ticket por mail con su QR y lo validás en la puerta desde el celular.

## 👨‍💻 Tech stack

- **[Next.js 16](https://nextjs.org)**
- **[Supabase](https://supabase.com)**
- **[TypeScript](https://www.typescriptlang.org)**
- **[Tailwind v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)**

## ⚡ Quick Start

- Para instalar el proyecto se necesita Node 24.x
- Los valores de `.env.local` salen del dashboard de Supabase, en **Settings → API Keys**.

```bash
# Instalar las dependencias necesarias
pnpm install

# Copiar las variables de entorno y completarlas
cp .env.example .env.local

# Levantar la app en modo dev
pnpm dev
```

### ▶️ Comandos

| Comando               | Qué hace                                          |
| --------------------- | ------------------------------------------------- |
| `pnpm dev`            | Servidor de desarrollo                            |
| `pnpm build`          | Build de producción                               |
| `pnpm start`          | Sirve el build                                    |
| `pnpm lint`           | ESLint                                            |
| `pnpm format`         | Prettier                                          |
| `pnpm typecheck`      | Chequeo de tipos                                  |
| `pnpm db:new`         | Crea una migración vacía                          |
| `pnpm db:push`        | Aplica migraciones pendientes + regen tipos       |
| `pnpm db:types`       | Regenera los tipos desde el esquema remoto        |
| `pnpm db:local`       | Levanta Supabase local en Docker (puertos 544xx)  |
| `pnpm db:local:reset` | Aplica migraciones + `supabase/seed.sql` en local |
| `pnpm db:local:stop`  | Apaga el Supabase local                           |
| `pnpm dev:local`      | Servidor de desarrollo contra el Supabase local   |

## 🗄️ Workflow con Supabase

El esquema vive en `supabase/migrations/` y se aplica al proyecto remoto con la CLI. Hay **una sola base remota** para staging y producción: se separan por `events.is_test` (ver [Fechas de prueba](#-fechas-de-prueba)).

### 🐳 Base local (Docker)

Para desarrollar y probar migraciones sin tocar la nube:

```bash
pnpm db:local        # levanta Supabase en Docker (puertos 544xx)
pnpm db:local:reset  # aplica migraciones + supabase/seed.sql
pnpm dev:local       # corre la app contra esa base
pnpm staff:set:local persona@mail.com admin <contraseña>
```

Toda migración nueva se prueba primero con `pnpm db:local:reset`.

### 🔑 Vincular el proyecto

El link se guarda en `supabase/.temp/`, que es cache local y no viaja en el repo. Hay que hacerlo una vez por máquina:

```bash
pnpm supabase login
pnpm supabase link --project-ref ubtndfeztbeeoyajsnnx
```

### 🧱 Cambiar el esquema

```bash
# Crea supabase/migrations/<timestamp>_agregar_cupones.sql
pnpm db:new agregar_cupones

# Escribís el SQL en ese archivo, y después:
pnpm db:push
```

`db:push` aplica lo que esté pendiente y regenera `src/lib/supabase/database.types.ts`, que es lo que le da tipos a las queries. Ese archivo **va commiteado**: el CI no tiene link para generarlo.

## 🎟️ Venta de entradas

```
/ (home, #tickets) ──► create_order (reserva cupo 15 min) ──► orden de MP ──► Checkout Pro
                                                                  │
            /orders/[orderId] ◄── vuelve el comprador ◄───────────┤
                                                                  ▼
                          /api/webhooks/mercadopago ──► fulfill_order (emite entradas) ──► mail con QR (SMTP)
                                                                                                │
                                        /door/[slug] ──► check_in ◄── escanea ◄── /tickets/[code]
```

- **Una fiesta a la vez**: la home es la próxima edición publicada (la más cercana, si hubiera varias), presentada como una entrada que sale de una máquina expendedora al scrollear. La compra se completa en el talón del ticket (lote, cantidad y datos) y después se paga en Mercado Pago. `/#tickets` saca el ticket entero y baja hasta el talón. Sin ninguna publicada, la home muestra "próxima edición a confirmar" y el form de mail. `/events/[slug]` redirige a la home para no romper links viejos.
- **La edición** se carga desde el dashboard de Supabase:
  - Una fila en `events`: `title` (nombre de la edición, ej. "Moevius Vol. 13"), fechas, `venue`, `neighborhood`, `status = 'published'` para que aparezca e `is_test = false` si es real. Opcionales: `description` (cada línea es un párrafo) y `address` (para el link a Google Maps).
  - **Lineup**: una fila por set en `event_sets` (`artist`, `starts_at` opcional para mostrar el horario, `sort_order`).
  - Al menos una fila en `ticket_types` (precio en pesos, cupo). Varios lotes por fecha (Preventa 1, General…) ya están soportados.
- **El cupo** se descuenta al crear la orden y se libera solo si no se paga en 15 minutos (un `pg_cron` vence las reservas cada minuto). Si alguien paga con la reserva vencida y ya no hay lugar, se le reembolsa solo.
- Todo pasa por funciones de Postgres (`create_order`, `fulfill_order`, `check_in`) que bloquean filas, así no hay sobreventa ni doble ingreso.
- **Antiabuso**: una reserva pendiente por mail y fecha (la nueva reemplaza a la anterior), máximo 3 pendientes por IP y fecha, y [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) en el form si están `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY`.
- **Reembolsos y contracargos**: cuando MP notifica un pago `refunded` o `charged_back`, la orden pasa a reembolsada y sus entradas quedan anuladas (en la puerta dan "Entrada anulada"). Un reembolso **parcial** no anula nada: queda logueado para resolverlo a mano.
- **Órdenes y entradas** no se leen desde el cliente: el server usa la secret key y el staff logueado las ve por RLS.

### 💳 Mercado Pago

El checkout usa la **API de Orders** de MP: el server crea la orden y el comprador va al `checkout_url` que devuelve MP.

1. En [Tus integraciones](https://www.mercadopago.com.ar/developers/panel/app) creá una app de Checkout Pro y copiá el **Access Token** a `MP_ACCESS_TOKEN`. En desarrollo usá las credenciales `APP_USR-` del vendedor de [cuentas de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/accounts) (tarjeta aprobada: titular `APRO`).
2. En **Webhooks** de esa app configurá la URL `https://<tu-dominio>/api/webhooks/mercadopago`, evento **Order** (así llegan pagos, reembolsos y contracargos), y copiá la clave secreta a `MP_WEBHOOK_SECRET`. El webhook se configura por app, no por orden: la app de prueba apunta a staging (con `?x-vercel-protection-bypass=…`, porque tiene protección de Vercel) y la real a producción.

En los demás previews y en local la compra se completa igual: la página `/orders/[orderId]` consulta la orden a MP mientras espera el pago.

### 🧪 Fechas de prueba

Producción (`VERCEL_ENV=production`) solo muestra y vende fechas con `is_test = false`; staging, previews y local, solo las de `is_test = true`. `create_order` también lo exige, así que una compra de prueba nunca ocupa cupo real.

### ✉️ Mails

Los mails de entradas salen por **SMTP** (`nodemailer`), así que el proveedor se cambia solo con variables. Hoy es Gmail:

1. Una cuenta de Gmail para el sitio, con **verificación en 2 pasos** activada.
2. Una [contraseña de aplicación](https://myaccount.google.com/apppasswords) → `SMTP_PASS`.
3. `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER` y `EMAIL_FROM` con esa misma cuenta.

Gmail permite unos 500 destinatarios por día. Para pasar a Resend, Brevo o SES con dominio propio alcanza con cambiar las `SMTP_*`.

### 🚪 Staff

El staff entra en `/admin/login` con **mail y contraseña**. No hay registro ni recuperación por mail: las cuentas las damos de alta nosotros.

```bash
# Crea la cuenta (o le cambia la contraseña) y le asigna el rol
pnpm staff:set persona@mail.com admin <contraseña>
pnpm staff:set puerta@mail.com door <contraseña>

# Le saca el acceso
pnpm staff:set persona@mail.com remove
```

- `admin` ve `/admin` (ventas, órdenes, reenvío de mails) y la puerta; `door` solo `/door`.
- El script usa las credenciales de `.env.local`: actúa sobre la DB a la que apunta ese archivo.
- Conviene apagar **Authentication → Sign In / Providers → Allow new users to sign up** en Supabase: nadie necesita registrarse solo.

## 🔍 Linting de código y formateo

- Utilizamos Prettier y ESLint para mantener orden y clean code, consistente y libre de malas prácticas.
- Lista completa de las reglas habilitadas en **[.prettierrc](.prettierrc)** y **[eslint.config.mjs](eslint.config.mjs)**.
- Además, un hook de pre-commit con [husky](https://typicode.github.io/husky/) y [lint-staged](https://github.com/lint-staged/lint-staged) corre el lint y el formateo sobre los archivos staged, así nada mal formateado llega al repo.

```bash
# Lint
pnpm lint

# Lint con autofix
pnpm lint:fix

# Formatear todo el proyecto
pnpm format
```

## 🐙 GitHub Actions

El proyecto utiliza **GitHub Actions** para automatizar algunas tareas aburridas pero importantes.

En cada PR corre **[checks.yml](.github/workflows/checks.yml)**: formato, lint, typecheck y build. Si algo falla, el PR no se mergea.

Las features salen de `develop` y vuelven por PR (`feature/<descripcion>`). `main` es producción.
