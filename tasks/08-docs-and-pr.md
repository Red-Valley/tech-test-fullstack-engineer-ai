# 08 — README, AI_WORKFLOW.md y Pull Request

**Track:** Común · **Depende de:** 09 · **Estimado:** 25 min

> El `AI_WORKFLOW.md` vale **30%** y el README **10%**: 40% de la nota está en esta tarea. No la recortes.

## 1. `AI_LOG.md` (bitácora durante el desarrollo)

Plantilla para que cada miembro agregue entradas **mientras trabaja**:

```markdown
## [HH:MM] Tarea 0X — <título corto>
- **Herramienta:** Claude Code / Cursor / …
- **Prompt:** "<texto literal>"
- **Resultado:** ✅ funcionó / ⚠️ parcial / ❌ falló
- **Qué corregí:** …
- **Paralelo:** (si aplica) worktree/agente usado
```

## 2. `AI_WORKFLOW.md` (entregable obligatorio)

Destílalo del `AI_LOG.md`. Debe responder **exactamente** los 4 puntos del enunciado:

```markdown
# AI Workflow

## 1. Tools used and why
- Claude Code — … (por qué: contexto de todo el repo, agentes, worktrees)
- <otra> — …

## 2. Key prompts and outcomes
### Prompt 1 — Shared contract
> "<prompt literal>"
**Outcome:** …
(3 a 5 prompts; incluye al menos el de las tools del chat)

## 3. When the AI got it wrong
**What happened:** p. ej. generó código del AI SDK de otra versión mayor (`parameters`/`maxSteps`) y el build falló.
**How I detected it:** error de TypeScript / docs.
**How I fixed it:** …
**Lesson:** fijar la versión y dar la doc al agente en el prompt.

## 4. Parallel agents / subagents / worktrees
- Después de la tarea 01, dos worktrees: `git worktree add ../wt-crud` y `../wt-chat`
- Agente A: tareas 02–04 · Agente B: tareas 05–06, programando contra el contrato de `tasks/00-OVERVIEW.md`
- Cómo integré: merge + conflictos encontrados + review con un subagente independiente
- (Si no usaste paralelismo, explica por qué fue una decisión consciente)

## Reflection
Qué haría distinto / qué delegaría o no a la IA.
```

Sé **específico y honesto**: prompts reales, tiempos reales, errores reales. Un texto genérico se nota.

## 3. `README.md` (reemplaza el del enunciado)

Secciones:
1. **Qué es**: 2 líneas + screenshot/GIF
2. **Quick start** (≤3 comandos):
   ```bash
   npm install
   cp .env.example .env.local   # agrega tu ANTHROPIC_API_KEY
   npm run dev                  # http://localhost:3000 — la DB se crea y se llena sola
   ```
3. **Features**: CRUD, API, chat con tools y streaming
4. **Arquitectura**: diagrama corto (UI → API/route handlers → `lib/games.ts` → SQLite; chat → LLM ⇄ tools → `lib/games.ts`)
5. **API reference**: tabla de endpoints + ejemplos curl de la tarea 03
6. **Tools del chat**: tabla de la tarea 05 y por qué ese diseño
7. **Trade-offs y supuestos**: "last month" = valores mensuales actuales; SQLite local; filtrado client-side; sin auth (fuera de alcance); OpenAI no validado en vivo
8. **Qué haría con más tiempo**: evaluación de las preguntas contra cada proveedor, historial mensual, persistencia del chat, deploy

## 4. Pull Request

1. Push de la rama `submission/<nombre>` al fork
2. Abrir un PR → `Red-Valley/tech-test-fullstack-engineer-ai:main`
3. Llenar **toda** la plantilla (`.github/PULL_REQUEST_TEMPLATE.md`):
   - Nombre, email, **tiempo real invertido**
   - What I built (bullets + screenshot/GIF)
   - How to run (los 3 comandos)
   - Trade-offs
   - Marcar el checklist: CRUD · API · Chat with streaming · Tool calling · `AI_WORKFLOW.md`

## Criterios de aceptación

- [x] `AI_WORKFLOW.md` cubre los 4 puntos con ejemplos concretos
- [x] Alguien sin contexto clona el repo y lo corre siguiendo solo el README
- [ ] El PR tiene la plantilla completa y el checklist marcado
- [x] Decidir si `tasks/` y `AI_LOG.md` se quedan en el repo (recomendado: sí, como evidencia del proceso; menciónalos en el `AI_WORKFLOW.md`)
