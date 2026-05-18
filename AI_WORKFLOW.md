# AI Workflow Documentation

## 1. Tools Used and Why

**Claude Code (claude-sonnet-4-6)** via the VSCode extension.

Chosen because:
- The CLAUDE.md project rules file lets the AI maintain consistent architectural decisions across the entire session without repeating context on every prompt.
- Agentic mode (multi-step tool use) allowed delegating scaffolding, TypeScript type checking, and iterative fixes within a single conversation flow.
- The VSCode extension provides inline code navigation, making it easy to review generated files immediately after creation.

---

## 2. Concrete Prompts and Outcomes

### Prompt 1 — Project setup and architecture definition
> "Eres un Desarrollador Senior profesional.
>
> Vamos a construir un dashboard de indie games con Next.js 14 App Router, TypeScript, Tailwind y OpenAI SDK. Necesito: CRUD con SQLite, API REST, chat con tool calling y streaming. Propón la estructura de carpetas antes de escribir cualquier archivo.
>
> Lee el archivo README.md y dime cómo podemos empezar."

**Outcome:** Claude analyzed the README requirements and proposed a concrete tech stack (Next.js App Router + OpenAI SDK + `better-sqlite3`) along with the full folder structure before writing a single line of code. It then created `CLAUDE.md` — a persistent rules file encoding architecture decisions, file conventions, naming standards, and explicit constraints (no ORM, no `useEffect` for data fetching, no barrel exports, etc.). Every subsequent code generation step was automatically bound by these rules without needing to repeat instructions.

---

### Prompt 2 — Full scaffold in one shot
> "Implementa el scaffold completo del proyecto respetando la estructura definida en CLAUDE.md. Sin omitir archivos, crea en este orden:
> `package.json` → configs (`tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `.env.local`) → `lib/types.ts` → `lib/db.ts` (SQLite singleton + seed de 12 juegos indie reales) → `app/layout.tsx` + `globals.css` → páginas Server Component (`app/page.tsx`, `app/chat/page.tsx`) → rutas API REST (`GET`/`POST` `/api/games`, `GET`/`PUT`/`DELETE` `/api/games/[id]`) → `lib/tools.ts` con las 4 tool definitions para el LLM → `app/api/chat/route.ts` con loop agentico + SSE streaming → `components/GameTable.tsx` + `components/ChatWindow.tsx`.
> TypeScript strict mode, sin comentarios superfluos, sin abstracciones prematuras."

**Outcome:** Claude generated the entire project in a single turn — 16 files covering configuration, database layer, REST API, AI tool definitions, agentic streaming loop, and both UI components. All files respected CLAUDE.md constraints from the start: Server Components by default, synchronous SQLite calls, `"use client"` only where event handlers required it, and no third-party streaming libraries.

---

### Prompt 3 — Responsiveness and numeric input fix

> "Agrega diseño responsivo completo usando Tailwind CSS breakpoints (`sm`, `md`, `lg`):
>
> - **Móvil** (< 640px): layout en una sola columna, tabla reemplazada por cards apiladas,
>   navegación colapsada o en menú hamburguesa si aplica.
> - **Tablet** (640px–1024px): grid de 2 columnas para las cards, tabla visible pero
>   con columnas priorizadas (ocultar columnas secundarias si es necesario).
> - **Escritorio** (> 1024px): layout actual sin cambios.
>
> No uses CSS custom, todo con clases de Tailwind.
>
> Fix: Los campos `monthly_revenue_usd`, `monthly_downloads` y `average_rating` tienen valor
> por defecto `0`. Al escribir un dígito, el `0` permanece pegado al inicio (ej: escribir `5`
> resulta en `05`). El campo debe iniciar vacío (`""`), limpiarse al hacer foco si el valor es `0`,
> y parsear el número correctamente antes del submit. Aplica este patrón a todos los campos numéricos."

**Outcome:** Two separate problems solved in one prompt. For responsiveness: `GameTable` now renders stacked cards on mobile (`sm:hidden`) and a standard table on tablet/desktop (`hidden sm:block`), with the Downloads column hidden on tablet (`hidden lg:table-cell`) to reduce horizontal crowding. The nav in `layout.tsx` wraps gracefully on small screens using `flex-wrap`. For the numeric inputs: introduced a dedicated `GameFormState` type where numeric fields are typed as `number | ""`, replacing the previous `GameInput` reuse. Added `handleNumericFocus` (clears field if value is `0`) and `handleNumericChange` (preserves `""` instead of converting to `NaN`). A `buildPayload()` function normalizes to `number` before submitting, so the API always receives valid data.

---

### Prompt 4 — Streaming agentic loop design
> (implicit in the chat route generation)

The specific challenge was: how to correctly implement the OpenAI agentic loop (tool use → tool result → next API call) while streaming text to the client simultaneously. Claude generated a `processWithTools` function that:
- Streams `content` deltas directly to the SSE response.
- Accumulates `function.arguments` fragments across chunks to reconstruct tool inputs.
- Loops back for a new API call with `role: "tool"` messages appended.

**Outcome:** A clean agentic loop with proper SSE streaming, no third-party streaming libraries needed.

---

### Prompt 5 — TypeScript strict mode fix
> (triggered by `npx tsc --noEmit` output)

**Error:** `Argument of type '{ type: "text"; text: string; }' is not assignable to parameter of type 'ContentBlock'. Property 'citations' is missing`.

**Outcome:** Claude immediately identified the mismatch — `ContentBlock` (SDK response type) is stricter than `ContentBlockParam` (SDK input type). Changed `assistantContent` from `Anthropic.ContentBlock[]` to `Anthropic.ContentBlockParam[]`. Zero other type errors in the codebase.

---

### Prompt 6 — Security patch
> (triggered by `npm audit` warning about Next.js 15.3.2 CVE-2025-66478)

**Outcome:** Claude ran `npm install next@latest` to patch the critical vulnerability. Verified the remaining 2 moderate findings are transitive postcss issues inside Next.js itself — fixing them would downgrade to Next 9.x, which is worse. Left with a documented trade-off.

---

## 3. One Moment Where the AI Got It Wrong

**The issue:** When scaffolding, Claude attempted to run `npx create-next-app@latest . --force` to initialize inside the existing directory. `create-next-app` does not support a `--force` flag and refuses to run when `.github/`, `CLAUDE.md`, and `README.md` already exist — it errors out.

**How it was fixed:** Instead of retrying the same command or deleting the existing files, Claude pivoted to manually creating every configuration file (`package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`) from scratch. This turned out to be faster and gave more control over the exact dependency versions chosen.

---

## 4. Parallel Agents / Subagents / Worktrees

Not used in this assessment. The scope was small enough for a single-agent, single-conversation flow.

The CLAUDE.md rules file served as a lightweight alternative to subagents: by encoding architecture decisions in a persistent file, every subsequent code generation step was automatically constrained without needing separate agent coordination.

If the project were larger (e.g., separate frontend and backend repos, multiple feature branches), I would have used:
- **Worktrees** for parallel feature work (e.g., CRUD branch + AI branch simultaneously).
- **Explore subagent** for codebase search without polluting the main context window.
