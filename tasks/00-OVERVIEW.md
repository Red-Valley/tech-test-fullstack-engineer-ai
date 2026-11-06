# 00 — Overview y contrato compartido

> Prueba técnica: **Indie Games Dashboard + AI Chat** (Red Valley).
> Tiempo total: **2–3 horas**. Lee este archivo antes de tomar cualquier tarea.

## Objetivo

Dashboard interno con CRUD de juegos indie + chat con IA que responde preguntas sobre el catálogo usando **tool calling** y **streaming**.

## Cómo se evalúa (prioriza según esto)

| Área | Peso | Implicación para el equipo |
|---|---|---|
| `AI_WORKFLOW.md` | **30%** | Todos registran prompts y errores de la IA en `AI_LOG.md` mientras trabajan |
| CRUD + API + chat + tools | 30% | Funcionalidad completa antes que pulido |
| Calidad de código | 20% | Tipos estrictos, capa de datos única, validación con Zod |
| UX | 10% | Estados de carga/vacío, feedback de tools en el chat |
| README | 10% | Correr el proyecto en ≤3 comandos |

## Lista de tareas

| # | Tarea | Depende de | Track | Estimado |
|---|---|---|---|---|
| 01 | [Setup del proyecto + contrato de tipos](./01-setup.md) | — | Común | 15 min |
| 02 | [Capa de datos (SQLite + seed + repositorio)](./02-data-layer.md) | 01 | A | 25 min |
| 03 | [API REST de juegos](./03-rest-api.md) | 02 | A | 20 min |
| 04 | [Dashboard UI (tabla + CRUD)](./04-dashboard-ui.md) | 03 (o contrato) | A | 35 min |
| 05 | [Chat backend (tools + streaming)](./05-chat-backend.md) | 01 (+02 para integrar) | B | 30 min |
| 06 | [Chat UI](./06-chat-ui.md) | 05 (o contrato) | B | 30 min |
| 07 | [QA, integración y pulido](./07-qa-polish.md) | 04, 06 | Común | 15 min |
| 09 | [Hallazgos de QA con LLM real](./09-qa-findings.md) | 07 | Común | 30 min |
| 08 | [README, AI_WORKFLOW.md y Pull Request](./08-docs-and-pr.md) | 09 | Común | 25 min |

```
            ┌─► 02 ─► 03 ─► 04 ─┐   Track A: CRUD
 01 setup ──┤                   ├─► 07 QA ─► 09 Hallazgos ─► 08 Docs + PR
            └─► 05 ─────► 06 ───┘   Track B: AI Chat
```

**Paralelismo:** después de la tarea 01, los tracks A y B pueden avanzar a la vez (dos personas, dos agentes o dos **git worktrees**). El track B programa contra las firmas de `lib/games.ts` definidas abajo, aunque la implementación todavía no exista. **Documenten cómo lo hicieron**: es un punto explícito del `AI_WORKFLOW.md`.

---

## Contrato compartido (no cambiar sin avisar al equipo)

### Modelo `Game`

```ts
// lib/types.ts
export interface Game {
  id: number;
  title: string;
  developer: string;
  genre: string;
  monthly_revenue_usd: number;   // >= 0, USD del último mes
  monthly_downloads: number;     // entero >= 0
  average_rating: number;        // 0.0 – 5.0
  created_at: string;            // ISO
  updated_at: string;            // ISO
}

export type GameInput = Omit<Game, 'id' | 'created_at' | 'updated_at'>;
```

Los nombres de campos están en `snake_case` **a propósito**: así los pide el enunciado.

### Funciones del repositorio (`lib/games.ts`)

Las usan **tanto la API REST como las tools del chat**. No dupliquen consultas SQL en otro lugar.

```ts
export type SortField = 'monthly_revenue_usd' | 'monthly_downloads' | 'average_rating' | 'title';

export interface GameFilters {
  genre?: string;
  developer?: string;
  minRating?: number;
  maxRating?: number;
  minRevenue?: number;
  search?: string;          // LIKE sobre title
  sortBy?: SortField;
  order?: 'asc' | 'desc';
  limit?: number;
}

export interface GameStats {
  count: number;
  total_revenue_usd: number;
  avg_revenue_usd: number;
  total_downloads: number;
  avg_rating: number;
}

listGames(filters?: GameFilters): Game[]
getGame(id: number): Game | null
createGame(input: GameInput): Game
updateGame(id: number, input: Partial<GameInput>): Game | null
deleteGame(id: number): boolean
getStats(filters?: Omit<GameFilters, 'sortBy' | 'order' | 'limit'>): GameStats
findGamesByTitles(titles: string[]): Game[]   // coincidencia aproximada, case-insensitive
listGenres(): string[]
```

### API REST

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | `/api/games?genre=&search=&sortBy=&order=` | — | `200 Game[]` |
| POST | `/api/games` | `GameInput` | `201 Game` / `400` error envelope |
| GET | `/api/games/:id` | — | `200 Game` / `404` |
| PUT | `/api/games/:id` | `Partial<GameInput>` | `200 Game` / `400` / `404` |
| DELETE | `/api/games/:id` | — | `204` / `404` |
| POST | `/api/chat` | `{ messages }` (formato del AI SDK) | stream |

### Error envelope (toda respuesta no-2xx)

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed", "issues": { "average_rating": ["..."] } } }
```
Códigos: `VALIDATION_ERROR | INVALID_JSON | INVALID_ID | NOT_FOUND | CONFIG_ERROR | INTERNAL`. Detalle en la skill `api-contract-patterns`.

### Stack y versiones (verificado en nov 2026)
Node **22+** · **Next.js 16** (App Router, React 19) · Tailwind v4 · `better-sqlite3` · Zod · **Vercel AI SDK 7** (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`, `@ai-sdk/anthropic`) · Vitest + React Testing Library 16 + MSW 3.
La base de datos lee `DATABASE_PATH` (por defecto `data/games.db`; `:memory:` en tests).

### Decisiones del contrato
- **Bodies y tools con números estrictos:** `z.number()`, no `z.coerce`, porque `null` y `""` se convertirían en `0`. Solo coercionan los query params y el formulario.
- **`gameUpdateSchema` exige al menos un campo:** un update vacío responde `400`.
- **`minRating` es exclusivo y `maxRating` inclusivo:** "rated above 4" no incluye 4.0.
- **Proveedor del chat:** OpenAI por defecto, con strategy + factory en `lib/ai/providers/`. Se elige con `AI_PROVIDER`, y `AI_MODEL` es opcional.
- **`cacheComponents` desactivado:** esa opción prohíbe el export `runtime` que usan las rutas.

### Estructura de carpetas

```
app/
  layout.tsx               # nav: Dashboard | Chat
  page.tsx                 # Dashboard
  chat/page.tsx            # Chat
  api/games/route.ts
  api/games/[id]/route.ts
  api/chat/route.ts
components/
  games/…                  # tabla, formulario, modal
  chat/…                   # mensajes, input, indicador de tool
lib/
  types.ts
  schema.ts                # Zod (lo usan API y tools)
  db.ts                    # conexión + migración + seed
  games.ts                 # repositorio
  ai/tools.ts              # definición de tools
  ai/prompt.ts             # system prompt
  ai/model.ts              # getChatModel()
  ai/providers/            # strategy por proveedor + factory
data/                      # games.db (ignorado por git)
tasks/                     # estas tareas
AI_LOG.md                  # bitácora para AI_WORKFLOW.md
```

## Equipo de agentes (Claude Code)

`CLAUDE.md` + `.claude/agents/` + `.claude/skills/`. Ciclo de cada ticket: **implementar** (`backend-developer` / `frontend-developer`, con tests) → **verificar** (`qa-engineer`) → **revisar** (`code-reviewer`) → corregir → commit.

## Definition of Done (aplica a cada tarea)

- [ ] `npm run typecheck && npm run lint && npm test` en verde (tests nuevos incluidos)
- [ ] QA report ✅ del `qa-engineer` y review ✅ del `code-reviewer`
- [ ] Criterios de aceptación de la tarea verificados manualmente
- [ ] Commit con un mensaje claro (`feat(api): …`, `feat(chat): …`)
- [ ] **Al menos 1 entrada nueva en `AI_LOG.md`** (prompt + resultado, o error de la IA + fix)
