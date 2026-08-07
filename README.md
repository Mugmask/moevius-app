# Moevius

Ticketera para eventos: venta de entradas online, envío del ticket por mail con
QR y un panel interno para administrar eventos y validar entradas en la puerta.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
shadcn/ui.

## Requisitos

- Node 24 (ver `.nvmrc`)
- pnpm (`corepack enable pnpm`)

## Instalación

```bash
git clone git@github.com:Mugmask/moevius-app.git
cd moevius-app
pnpm install
pnpm dev
```

Disponible en http://localhost:3000. Por ahora no requiere variables de entorno.

## Scripts

| Comando          | Qué hace               |
| ---------------- | ---------------------- |
| `pnpm dev`       | Servidor de desarrollo |
| `pnpm build`     | Build de producción    |
| `pnpm start`     | Sirve el build         |
| `pnpm lint`      | ESLint                 |
| `pnpm format`    | Prettier               |
| `pnpm typecheck` | Chequeo de tipos       |

## Estructura

```
src/
  app/           Rutas (App Router)
  components/    Componentes (ui/ = shadcn)
  lib/           Utilidades compartidas
```

## Contribuir

Las features salen de `develop` y vuelven por PR (`feature/<descripcion>`).
`main` es producción. El CI corre format, lint, typecheck y build en cada PR.
