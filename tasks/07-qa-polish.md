# 07 — QA, integración y pulido

**Track:** Común · **Depende de:** 04, 06 · **Estimado:** 15 min

## Objetivo

Integrar los dos tracks (merge de worktrees o ramas), verificar el flujo completo desde cero como lo haría el evaluador y pulir los detalles visibles.

## Checklist de integración

- [ ] Merge de los tracks A y B sin conflictos (si hubo conflictos, **regístralo en `AI_LOG.md`**)
- [ ] `rm -rf node_modules data .next && npm install && npm run dev` funciona en limpio
- [ ] `npm run build` pasa (el evaluador puede probarlo)
- [ ] `npm run lint` y `npx tsc --noEmit` sin errores

## Script de prueba manual (en este orden)

1. Abrir `/` → se ven los juegos del seed y los KPIs
2. Crear "QA Test Game" con revenue $999,999 (mayor que cualquiera)
3. Ir a `/chat` → "Which game made the most revenue last month?" → debe responder **QA Test Game**. Esto demuestra que las tools consultan datos en vivo.
4. "How many games are rated above 4?" → verificar contra la tabla
5. "Compare revenue of <A> vs <B>" → tabla con ambos valores
6. Pregunta sobre un juego inexistente → no inventa datos
7. Pregunta fuera de tema ("¿qué clima hace?") → redirige con amabilidad
8. Volver a `/`, borrar "QA Test Game"
9. Probar en ancho móvil (DevTools)

## Pulido rápido (solo si sobra tiempo, en orden de impacto)

1. Título y favicon (`metadata` en el layout)
2. Indicador del link activo en la navegación
3. Un `loading.tsx` en `/` y `/chat`
4. Botón "Nuevo chat" para limpiar la conversación
5. Revisar consistencia visual (espaciados, colores, tipografía)

## Code review rápido

- [ ] No hay SQL fuera de `lib/`
- [ ] No hay `any` innecesarios
- [ ] No quedaron `console.log` de debug
- [ ] No hay secretos commiteados (`git log -p | grep -i "sk-"` vacío)
- [ ] Nombres y estructura consistentes con `00-OVERVIEW.md`

💡 Idea para el `AI_WORKFLOW.md`: pídele a un agente/subagente **independiente** que haga un code review del diff completo y documenta qué encontró y qué aceptaste o rechazaste.
