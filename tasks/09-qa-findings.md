# 09 — Hallazgos de QA con LLM real

**Track:** Común · **Depende de:** 07 · **Bloquea:** 08 · **Origen:** pruebas en vivo con Anthropic, QA completo sobre `702b3e9` y los code reviews de los tracks

## Objetivo

Resolver lo que un evaluador notaría y dejar constancia del resto. Los bugs BUG-1 y BUG-2 del reporte de QA (`AI_WORKFLOW.md` y README) se resuelven en la tarea 08.

**Veredicto de QA sobre `702b3e9`:** ❌ por los dos entregables. El código de las tareas 01 a 07, sin blockers ni major (8 minor y 8 trivial entre bugs y cosméticos).

## A corregir

| # | Severidad | Hallazgo | Evidencia | Corrección |
|---|---|---|---|---|
| H1 | Riesgo alto | Con `claude-sonnet-5-5`, tras una tool hay espera de 2 a 10 s y el texto llega de golpe. Es lo que se ve en las 3 preguntas del enunciado | Sin la ruta de por medio pasa igual: 2.005 caracteres en 53 ms. La doc del proveedor dice que Sonnet 5.5 no permite desactivar el reasoning. Con `claude-haiku-5-5` sin reasoning: texto fluido desde ~1,6 s | Default `claude-haiku-5-5` sin reasoning, encapsulado en la estrategia. Repetir las preguntas para confirmar exactitud |
| H2 | Decisión | El default es OpenAI, un camino nunca validado en vivo | OpenAI sin saldo | Default `anthropic`; actualizar `.env.example`, config y documentación |
| H3 | Minor | Doble clic en Send cancela la pregunta: el segundo clic cae en Stop | QA BUG-3 | Ignorar el segundo clic de un doble clic (`event.detail`) y usar `key` distintas en Send y Stop: sin ellas, un clic en Stop con un borrador lo enviaba |
| H4 | Minor | "moss and marrow" responde que no existe | QA BUG-4 | El prompt obliga a reintentar con `searchGames` y una palabra distintiva antes de decir "not found" |
| H5 | Minor | Developer parcial ("Bramble") responde "no encontrado" e inventa un nombre | QA BUG-5 | Filtro `developer` por coincidencia parcial |
| H6 | Minor | KPI de revenue se sale de la tarjeta en móvil desde $1M | QA BUG-7 | Texto que se ajusta a la tarjeta |
| H7 | Minor | El foco se pierde al enviar en el chat | QA BUG-9 | Devolver el foco al textarea |
| H8 | Minor | Título largo sin espacios rompe tabla y modal | QA BUG-10 | `overflow-wrap` en título de fila y de modal |
| H9 | Minor | Errores del formulario en jerga de Zod | QA BUG-11 | Mensajes propios en `gameInputSchema` |
| H10 | Minor | Idioma incorrecto, intermitente | En vivo: respuesta en español a una pregunta en inglés | Prompt: idioma del último mensaje del usuario |
| H11 | Minor | Tras Stop, el modelo retoma la petición cancelada | En vivo: "tu petición anterior sigue abierta" | Prompt: responder solo al último mensaje |
| H12 | Minor | Sin "Nuevo chat", al llegar a 100 mensajes solo se sale recargando | QA, mejora; también pulido de la tarea 07 | Botón New chat |
| H13 | Minor | Revenue sin tope: `$∞` en KPI, y no editable desde `1e21` | Code review A | `.max()` en revenue |
| H14 | Trivial | `npm install` limpio modifica `package-lock.json` | QA BUG-15 | Commitear el lock actualizado |
| H15 | Trivial | Scrollbars blancas en modo oscuro | QA, cosmético | `color-scheme` en `globals.css` |
| H16 | Mejora | Cada request pide `max_tokens: 128000` | QA, proxy | `maxOutputTokens` acotado en la ruta |

## A documentar, sin cambios

| Hallazgo | Motivo |
|---|---|
| Con más de 100 juegos, lo nuevo no sale en la tabla (QA BUG-6) | Ya hay aviso "Showing the first 100 of N". El tope lo pide la tarea 02 y la paginación queda fuera de alcance. Va en los trade-offs |
| Mayúsculas solo en ASCII (QA BUG-8) | Limitación de `LIKE`/`NOCASE` en SQLite. El seed es ASCII |
| OpenAI sin validar en vivo, incluido el reasoning huérfano tras Stop | Sin saldo. Con Anthropic, Stop funciona en los tres momentos. Sin parche a ciegas |
| Re-seed al vaciar la tabla | Lo pide la tarea 02 |
| "Rated 4 or higher" usa `minRating: 3.99` | Compromiso conocido de `minRating` exclusivo; funciona con ratings de un decimal |

## Descartados

| Hallazgo | Motivo |
|---|---|
| Mensaje de error del stream no mostrado (QA BUG-12) | El banner genérico es correcto y seguro |
| Títulos invisibles aceptados (QA BUG-13) | Herramienta interna; sin impacto real |
| Atrás muestra datos viejos (QA BUG-14) | Caché del router; un recargar lo resuelve |
| 405 y 404 de Next sin envelope, id `007` (QA BUG-16) | Respuestas fuera de nuestras rutas; `007` es el juego 7 sin ambigüedad |
| Foco tras borrar, `?minRating=0x2`, helpers de error duplicados, cabeceras desalineadas 12 px | Bajo impacto para el tiempo restante |
| "Hydration failed" en `next dev` y #418 en `next start` | Causa: algo ajeno a la app, muy probablemente una extensión, agrega `<div style="display: contents">` como primer hijo de `<body>` antes de hidratar, también en páginas sin React. Sin errores en perfil limpio (38 y 32 cargas, en dos corridas independientes); falla en todas las cargas con el perfil del usuario (8 de 8 y 11 de 11). Inyectar ese div en el perfil limpio reproduce el error exacto (20 de 20). Sin identificar: el código de Directo coincide y FastApply también está presente, y no se apagó ninguna. Sin cambios en el código; nota en el README |

## Criterios de aceptación

- [x] `npm run typecheck && npm run lint && npm test && npm run build` en verde, con tests de regresión para H3, H5, H7, H9, H12 y H13; H6 y H8 son de layout y se verifican en Chrome
- [x] Las 3 preguntas del enunciado, juego inexistente, "and" por "&", developer parcial y una en español correctas con el modelo por defecto
- [x] Texto progresivo medido en respuestas con tool, en varios fragmentos a lo largo del tiempo
- [x] Stop seguido de otro mensaje: sin error y sin retomar lo cancelado
- [x] QA de regresión y code review del diff, sin bugs blocker ni major

## Resultado

Regresión sobre `812b6bb` y code review de `b86d59a..812b6bb`: sin blocker ni major. Sus hallazgos se corrigieron después. Esas correcciones se verificaron con tests y con pruebas en vivo y en Chrome, sin repetir el QA completo.

**Agregado por el review y el QA:**
- Turnos detenidos o fallidos sin texto: se cierran con un marcador en vez de borrarse, para que "try again" conserve el contexto.
- Un clic en Stop con un borrador lo enviaba. Solo se reprodujo en Chrome real; jsdom no lo muestra.
- `getCatalogStats` nombra los developers cuando el filtro parcial combina varios.
- Foco tras Stop y Retry, y columnas largas de developer y genre.

**Limitaciones conocidas:**
- Una respuesta parcial tras Stop puede retomarse en la siguiente respuesta.
- H10 queda parcial: en seguimientos elípticos ("And which one…?") tras un historial en otro idioma, Haiku responde en el idioma anterior (3 de 3). Reforzar el prompt no lo cambió.
- Haiku a veces anuncia un reintento en una frase corta.
