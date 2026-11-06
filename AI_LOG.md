# AI Log

Bitácora de uso de IA durante la prueba. Alimenta `AI_WORKFLOW.md`.

## [~22:50] Planificación — Roadmap desde el overview
- **Herramienta:** Claude Code (modo plan)
- **Prompt:** "empecemos a trabajar en @tech-test-fullstack-engineer-ai/tasks/00-OVERVIEW.md"
- **Resultado:** ✅ funcionó
- **Qué corregí:** La IA encontró huecos en las tareas: `z.coerce` convertía `null` y `""` en 0, `datetime('now')` no es ISO-8601, y `SUM` devuelve `NULL` con cero filas. Elegí tareas 01 a 07, tracks en paralelo y corregir el schema.
- **Paralelo:** decidido aquí, dos worktrees después de la tarea 01

## [~22:55] Planificación — Cambio de proveedor
- **Herramienta:** Claude Code (modo plan)
- **Prompt:** "Vamos a hacer con una open api key, y para el cliente del chat, recuerda usar un strategy pattern con factory para poder cambiar entre proveedores de api facilmente"
- **Resultado:** ✅ funcionó
- **Qué corregí:** Rechacé la primera versión del plan, que asumía Anthropic como proveedor fijo. El plan pasó a OpenAI por defecto con `lib/ai/providers/`.

## [23:05] Tarea 01 — Scaffold y contrato compartido
- **Herramienta:** Claude Code
- **Prompt:** aprobación del plan de la tarea 01 (ver las dos entradas anteriores)
- **Resultado:** ⚠️ parcial; tres instrucciones del kit estaban desactualizadas frente a las versiones instaladas
- **Qué corregí:**
  - **Next 16.4:** el scaffold activa `cacheComponents`, que prohíbe el export `runtime` que exigen las tareas. Lo detecté leyendo `node_modules/next/dist/docs` y lo desactivé.
  - **MSW 3:** la skill usaba `onUnhandledRequest`, que ya no existe. `tsc` lo detectó; sin el cambio, un request sin handler no habría hecho fallar el test. Ahora es `onUnhandledFrame`.
  - **Vite:** el plugin `vite-tsconfig-paths` y la config como CommonJS daban avisos. Pasé a `resolve.tsconfigPaths` y a `vitest.config.mts`.
  - **Typecheck:** `LayoutProps` depende de tipos generados, así que el script ahora corre `next typegen` antes de `tsc`.
