# 04 — Dashboard UI (tabla + CRUD)

**Track:** A · **Depende de:** 03 (se puede empezar con el contrato y datos mock) · **Estimado:** 35 min

## Objetivo

La vista principal (`/`) para ver, crear, editar y borrar juegos. Tailwind, sin librerías de componentes pesadas.

## Componentes

| Componente | Responsabilidad |
|---|---|
| `app/page.tsx` | Server Component: carga los juegos iniciales con `listGames()` directo (sin fetch a la propia API) y los pasa al cliente |
| `components/games/StatsCards.tsx` | 3–4 KPIs: total de juegos, revenue total, descargas totales, rating promedio (usa `getStats`) |
| `components/games/GamesTable.tsx` | Client: tabla con columnas ordenables, búsqueda por título y filtro por género |
| `components/games/GameFormModal.tsx` | Client: formulario para crear/editar (mismo componente) con errores por campo |
| `components/games/DeleteButton.tsx` | Confirmación antes de borrar |

## Detalles de implementación

- Mutaciones con `fetch` a `/api/games` y luego `router.refresh()`, o actualizando el estado local. Elige uno y sé consistente.
- Muestra los errores `400` del backend debajo de cada input (vienen en `issues`).
- Formato: revenue con `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`, descargas con separador de miles, rating con ★ y 1 decimal.
- El ordenado y el filtrado pueden ser client-side (son pocos datos). Documéntalo como trade-off.
- Estados: **vacío** ("No hay juegos — crea el primero"), **cargando** (botón deshabilitado + spinner al guardar) y **error** (toast o banner simple).
- Accesibilidad básica: `<label>` en los inputs, cerrar el modal con Esc y botones con texto o `aria-label`.
- Diseño responsive: en móvil, la tabla con `overflow-x-auto` basta.

## Criterios de aceptación

- [ ] Se listan los juegos del seed con formato correcto
- [ ] Crear un juego → aparece en la tabla sin recargar manualmente
- [ ] Editar → los cambios se reflejan; con un input inválido se ve el error del campo
- [ ] Borrar pide confirmación y lo quita de la tabla
- [ ] Ordenar por revenue, descargas y rating funciona en ambas direcciones
- [ ] Los KPIs se actualizan tras crear o borrar

## Prompt sugerido

> "Build the dashboard at app/page.tsx: a server component that loads games via lib/games.ts and renders StatsCards + a client GamesTable with sortable columns, title search and genre filter. Add a GameFormModal reused for create/edit that calls the REST API and shows per-field zod errors from the 400 response. Use Tailwind only, format currency/numbers with Intl, and include empty/loading/error states."

📝 Toma un screenshot del dashboard terminado para el README.
