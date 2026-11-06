# 01 — Setup del proyecto + contrato de tipos

**Track:** Común · **Depende de:** — · **Estimado:** 15 min · **Bloquea:** todas las demás

## Objetivo

Dejar un proyecto Next.js corriendo, con las dependencias instaladas y el contrato de tipos (`lib/types.ts`, `lib/schema.ts`) creado, para que los tracks A y B arranquen en paralelo.

## Pasos

1. En el fork, en la rama `submission/<nombre>`:
   ```bash
   npx create-next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*"
   ```
   (Si el directorio no está vacío por `README.md`, créalo en una carpeta temporal y mueve los archivos. **Conserva el README original** hasta la tarea 08.)
2. Dependencias:
   ```bash
   npm i better-sqlite3 server-only zod ai @ai-sdk/react @ai-sdk/openai @ai-sdk/anthropic react-markdown remark-gfm
   npm i -D @types/better-sqlite3 vitest @vitest/coverage-v8 jsdom @vitejs/plugin-react \
     @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom msw
   ```
   Requisito: **Node 22+** (AI SDK 7 lo exige y es solo ESM). `create-next-app@latest` instala Next.js 16.
   Configura Vitest (`vitest.config.mts`, `test/setup-frontend.ts`, `test/server-only-stub.ts` y los scripts `test`, `test:back`, `test:front`, `typecheck`) siguiendo las skills `run-backend-tests` y `run-frontend-tests`.
3. Crea `.env.example`:
   ```
   AI_PROVIDER=anthropic
   ANTHROPIC_API_KEY=
   # ANTHROPIC_API_KEY=
   # AI_MODEL=
   # DATABASE_PATH=
   ```
   y `.env.local` con la key real (ya está en `.gitignore`).
4. Agrega `data/` a `.gitignore` si la base de datos vivirá ahí (ya están ignorados `*.db` y `*.sqlite`).
5. Crea `lib/types.ts` copiando el contrato de `00-OVERVIEW.md`.
6. Crea `lib/schema.ts`:
   ```ts
   import { z } from 'zod';

   export const gameInputSchema = z.object({
     title: z.string().trim().min(1).max(120),
     developer: z.string().trim().min(1).max(120),
     genre: z.string().trim().min(1).max(60),
     monthly_revenue_usd: z.number().nonnegative(),
     monthly_downloads: z.number().int().nonnegative(),
     average_rating: z.number().min(0).max(5),
   });
   export const gameUpdateSchema = gameInputSchema
     .partial()
     .refine((update) => Object.keys(update).length > 0, { message: 'Provide at least one field to update' });
   ```
   Números estrictos a propósito: `z.coerce` convertiría `null` y `""` en `0`. También incluye `idParamSchema` y `gameFiltersSchema`, compartidos por los tracks A y B.
7. Crea `AI_LOG.md` vacío usando la plantilla de la tarea 08.
8. Crea un `app/layout.tsx` mínimo con una navegación **Dashboard | Chat**.
9. Configura `next.config` para que `better-sqlite3` no se empaquete:
   `serverExternalPackages: ['better-sqlite3']`. Quita `cacheComponents` y `partialPrefetching` que agrega el scaffold: prohíben el export `runtime` de las rutas.
10. Crea `lib/games.ts` como stub con los tipos y firmas del contrato, para que el track B compile antes de que el track A lo implemente.

## Criterios de aceptación

- [ ] `npm run dev` levanta la app en `localhost:3000` con la navegación visible
- [ ] `lib/types.ts` y `lib/schema.ts` existen y compilan
- [ ] `.env.example` está commiteado y `.env.local` no
- [ ] `npm test` corre (aunque sea sin tests todavía) y `npm run typecheck` pasa
- [ ] Commit `chore: scaffold next.js app and shared contract` pusheado, para que los tracks A y B partan de aquí

## Prompt sugerido para el agente de IA

> "Scaffold a Next.js App Router + TypeScript + Tailwind project in the current directory. Install the dependencies listed in tasks/01-setup.md and configure Vitest following the run-backend-tests and run-frontend-tests skills. Create lib/types.ts and lib/schema.ts exactly following the contract in tasks/00-OVERVIEW.md. Add a root layout with a top nav linking to / (Dashboard) and /chat. Don't implement features yet."

📝 Registra en `AI_LOG.md` el prompt y lo que tuviste que corregir.
