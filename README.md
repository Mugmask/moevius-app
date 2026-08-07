# Moevius

Ticketera para eventos: venta de entradas online, envío del ticket por mail con
QR y un panel interno para administrar eventos y validar entradas en la puerta.

## Stack

| Pieza           | Qué usamos                           |
| --------------- | ------------------------------------ |
| Framework       | Next.js 16.3 (App Router, Turbopack) |
| UI              | React 19                             |
| Lenguaje        | TypeScript 5.9 (`strict: true`)      |
| Estilos         | Tailwind CSS v4                      |
| Componentes     | shadcn/ui                            |
| Runtime         | Node 24 (LTS)                        |
| Package manager | pnpm                                 |
| CI              | GitHub Actions                       |
| Deploy          | Vercel                               |

## Requisitos

- **Node 24**. La versión está fijada en `.nvmrc`:

  ```bash
  nvm use        # si tu nvm no lee .nvmrc (pasa en nvm-windows): nvm use 24
  ```

- **pnpm**. Sale de corepack, con la versión que declara el `package.json`:

  ```bash
  corepack enable pnpm
  ```

## Levantar el proyecto

```bash
git clone git@github.com:Mugmask/moevius-app.git
cd moevius-app
pnpm install
pnpm dev
```

http://localhost:3000

No hace falta configurar variables de entorno todavía: el proyecto no depende de
ningún servicio externo por ahora.

`pnpm install` deja los git hooks activos solos (script `prepare`).

## Comandos

| Comando             | Qué hace                              |
| ------------------- | ------------------------------------- |
| `pnpm dev`          | Servidor de desarrollo                |
| `pnpm build`        | Build de producción                   |
| `pnpm start`        | Sirve el build                        |
| `pnpm lint`         | ESLint                                |
| `pnpm lint:fix`     | ESLint con `--fix`                    |
| `pnpm format`       | Prettier sobre todo el repo           |
| `pnpm format:check` | Prettier en modo chequeo (no escribe) |
| `pnpm typecheck`    | `next typegen` + `tsc --noEmit`       |

## Estructura

```
src/
  app/           Rutas (App Router)
  components/
    ui/          Componentes de shadcn/ui
  lib/           Utilidades compartidas
```

Para agregar un componente de shadcn:

```bash
npx shadcn@latest add <componente>
```

## Calidad de código

Los hooks corren solos, no hay que acordarse de nada:

- **pre-commit** → ESLint `--fix` + Prettier sobre los archivos staged.
- **pre-push** → `pnpm typecheck`.

El CI (`.github/workflows/checks.yml`) corre en cada PR y en cada push a `main` o
`develop`: format, lint, typecheck y build. Si algo falla, el check `verify`
queda en rojo.

## Flujo de trabajo

```
feature/*  →  PR a develop  →  probar  →  PR de develop a main  →  release
```

- `main` — producción. Protegida: sólo se toca por PR.
- `develop` — rama de integración y default del repo. Es de donde salen y a donde
  vuelven las features.
- `feature/*` — el día a día. Formato: `feature/<descripcion-en-kebab>`.
