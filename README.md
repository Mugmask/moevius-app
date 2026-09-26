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

| Comando          | Qué hace                                    |
| ---------------- | ------------------------------------------- |
| `pnpm dev`       | Servidor de desarrollo                      |
| `pnpm build`     | Build de producción                         |
| `pnpm start`     | Sirve el build                              |
| `pnpm lint`      | ESLint                                      |
| `pnpm format`    | Prettier                                    |
| `pnpm typecheck` | Chequeo de tipos                            |
| `pnpm db:new`    | Crea una migración vacía                    |
| `pnpm db:push`   | Aplica migraciones pendientes + regen tipos |
| `pnpm db:types`  | Regenera los tipos desde el esquema remoto  |

## 🗄️ Workflow con Supabase

El esquema vive en `supabase/migrations/` y se aplica al proyecto remoto con la CLI. **No hay stack local**, así que no hace falta Docker.

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
/events/[slug] ──► create_order (reserva cupo 15 min) ──► Wallet Brick ──► Checkout Pro
                                                                  │
            /orders/[orderId] ◄── vuelve el comprador ◄───────────┤
                                                                  ▼
                          /api/webhooks/mercadopago ──► fulfill_order (emite entradas) ──► mail con QR (Resend)
                                                                                                │
                                        /door/[slug] ──► check_in ◄── escanea ◄── /tickets/[code]
```

- **Fechas y lotes** se cargan desde el dashboard de Supabase: una fila en `events` (con `status = 'published'` para que aparezca) y al menos una en `ticket_types` (precio en pesos, cupo). Varios lotes por fecha (Preventa 1, General…) ya están soportados.
- **El cupo** se descuenta al crear la orden y se libera solo si no se paga en 15 minutos. Todo pasa por funciones de Postgres (`create_order`, `fulfill_order`, `check_in`) que bloquean filas, así no hay sobreventa ni doble ingreso.
- **Antiabuso**: una reserva pendiente por mail y fecha (la nueva reemplaza a la anterior), máximo 3 pendientes por IP y fecha, y [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) en el form si están `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY`.
- **Reembolsos y contracargos**: cuando MP notifica un pago `refunded` o `charged_back`, la orden pasa a reembolsada y sus entradas quedan anuladas (en la puerta dan "Entrada anulada"). Un reembolso **parcial** no anula nada: queda logueado para resolverlo a mano.
- **Órdenes y entradas** no se leen desde el cliente: el server usa la secret key y el staff logueado las ve por RLS.

### 💳 Mercado Pago

1. En [Tus integraciones](https://www.mercadopago.com.ar/developers/panel/app) creá una app de Checkout Pro y copiá el **Access Token** a `MP_ACCESS_TOKEN` y la **Public Key** a `NEXT_PUBLIC_MP_PUBLIC_KEY` (la usa el Wallet Brick del front). En desarrollo usá las credenciales de prueba y [cuentas de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/accounts) para pagar.
2. En **Webhooks** configurá la URL `https://<tu-dominio>/api/webhooks/mercadopago`, evento **Pagos** (cubre creación y actualización: así llegan también los reembolsos y contracargos), y copiá la clave secreta a `MP_WEBHOOK_SECRET`.

El webhook necesita una URL pública, así que el flujo completo se prueba en un deploy de preview. En local, al volver de MP la página `/orders/[orderId]` confirma el pago igual consultándolo a la API.

### ✉️ Resend

Creá una API key en [Resend](https://resend.com) (`RESEND_API_KEY`) y verificá el dominio del remitente que pongas en `EMAIL_FROM`.

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
