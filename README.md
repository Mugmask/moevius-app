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
