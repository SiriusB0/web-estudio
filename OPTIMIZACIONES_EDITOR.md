# Plan de Optimizaciones del Editor (Autosave = 5s)

Este documento define el roadmap para mejorar el rendimiento y la UX del editor Markdown basado en CodeMirror 6.

## Metas globales
- p95 de latencia por pulsación < 10 ms.
- 60 FPS estables durante escritura, scroll y selección.
- Cero parpadeos en decoraciones (encabezados y color inline).
- Popup de wikilinks anclado al cursor, sin “saltos”.
- Autosave imperceptible (5 s) y sin bloqueos; botón Guardar + Ctrl+S.

## Fase 1 — Fluidez de escritura y eliminación de parpadeos

- Optimizar `headerDecorationPlugin` en `src/components/notes/NoteEditor.tsx`.
  - Procesar solo el `viewport` con `RangeSetBuilder`.
  - Usar `this.decorations.map(update.changes)` en `update()` para mapeo incremental.
  - Evitar `requestAnimationFrame()` y `requestMeasure()` salvo necesidad real.
- Estabilizar color inline `{#color|texto}`.
  - `StateField` + decoraciones `replace`/`mark` con `inclusive` adecuado.
  - Borrado atómico: si el bloque queda vacío, reemplazar todo `{#...|...}` por texto “desnudo” sin revelar marcadores.
  - Recalcular por líneas afectadas usando diffs de `update.changes`.
- Criterios de aceptación Fase 1.
  - p95 < 10 ms en documentos 5k/25k.
  - Cero parpadeos visibles en color y encabezados.

## Fase 2 — UX de wikilinks y guardado no intrusivo

- Popup de wikilinks anclado al cursor.
  - Usar `view.coordsAtPos(view.state.selection.main.head)` para `{top,left}`.
  - Debounce 150–250 ms + `AbortController` para cancelar búsquedas previas a Supabase.
  - Cache breve por prefijo de consulta.
- Autosave a 5 s (debounce tras última edición).
  - Guardado “ligero” solo del contenido.
  - Tareas pesadas (actualizar `note_links`, outline) se difieren a idle/worker.
- Botón Guardar + Ctrl+S en `src/components/notes/MarkdownToolbar.tsx`.
  - Indicador “Cambios sin guardar” (dirty), “Guardando…”, “Guardado”.
- Criterios de aceptación Fase 2.
  - Popup estable, sin saltos, y sin afectar input latency.
  - No más de 1 request de guardado por ráfaga de escritura; guardado manual inmediato.

## Fase 3 — Trabajo pesado fuera del hilo principal y robustez

- `Web Worker` en `src/lib/workers/notesWorker.ts` (nuevo).
  - Extraer wikilinks del documento y calcular outline fuera del UI thread.
  - Invocar bajo debounce/idle.
- Compartments para reconfigurar sin reinstanciar.
  - Tema y extensiones dinámicas con `Compartment` (CodeMirror 6).
- Limpieza de recursos al cambiar de nota.
  - `view.destroy()`, cancelar timeouts/debounces, abortar fetches, desuscribir workers.
- Criterios de aceptación Fase 3.
  - Sin jank al alternar notas o temas.
  - UI responsive > 55–60 FPS con worker activo.

## Fase 4 — Plegado y coherencia visual total

- Plegado de encabezados con `foldService`.
  - Calcular rangos por niveles H1–H6 y cachear por línea.
  - Recalcular solo el subárbol afectado en cambios.
- QA de tema compartido (editor/preview).
  - Verificar que `headerColors`, `headerSizes`, `headerTextClasses` de `src/lib/theme.ts` se apliquen 1:1.
- Criterios de aceptación Fase 4.
  - Plegado anidado robusto, sin recalcular toda la jerarquía.
  - Consistencia visual entre editor y `NotePreview.tsx`.

## Mediciones y pruebas

- Instrumentación con `performance.mark/measure` en `NoteEditor.tsx`.
- Datasets de prueba: 5k, 25k, 100k caracteres.
- Metas globales:
  - p95 por tecla < 10 ms.
  - 60 FPS en escritura/scroll.
  - Sin parpadeos visibles.

## Riesgos y mitigaciones

- Riesgo: pérdida de datos (si se desactiva autosave).
  - Mitigar: `beforeunload`, indicador visible, Ctrl+S, tests.
- Riesgo: jank por guardado pesado.
  - Mitigar: separar guardado rápido del texto y post-procesado en idle/worker.

## Archivos impactados (referencia)

- `src/components/notes/NoteEditor.tsx`
- `src/components/notes/WikilinkSuggestions.tsx`
- `src/components/notes/MarkdownToolbar.tsx`
- `src/app/editor/page.tsx`
- `src/app/notes/[id]/page.tsx`
- `src/lib/theme.ts`
- `src/lib/workers/notesWorker.ts` (nuevo)

## Estimaciones de esfuerzo por fase

- Fase 1 (alto impacto, prioridad alta)
  - Optimización `headerDecorationPlugin`: 0.5–1.5 días.
  - Color inline estable + borrado atómico: 0.5–1.5 días.
  - Total Fase 1: 1–3 días.

- Fase 2 (impacto alto en UX)
  - Popup wikilinks con `coordsAtPos` + debounce/cancelación: 0.5–1 día.
  - Autosave 5 s (ligero) + botón Guardar + Ctrl+S + indicador dirty: 0.5–1 día.
  - Total Fase 2: 1–2 días.

- Fase 3 (robustez y rendimiento en segundo plano)
  - Web Worker para wikilinks/outline + integración: 1–2 días.
  - Compartments + limpieza de recursos: 0.5–1 día.
  - Total Fase 3: 1.5–3 días.

- Fase 4 (afinado final)
  - Plegado con `foldService` + cache de rangos: 0.5–1.5 días.
  - QA de tema y coherencia editor/preview: 0.5 día.
  - Total Fase 4: 1–2 días.

- Buffer y validación
  - Pruebas de estrés, mediciones y ajustes: 0.5–1 día.

Estimación global (suma): 4.5–11 días hábiles, según complejidad real y tamaño de documento.

## Criterios de aceptación detallados

- Rendimiento
  - p95 de latencia por pulsación < 10 ms en datasets de 5k y 25k caracteres (medido con `performance.measure`).
  - FPS >= 60 durante escritura y scroll (medido con el panel Performance de Chrome) en documentos de 5k/25k; aceptable >55 FPS en 100k.
  - Sin GC pausas visibles (>16 ms) durante escritura normal; en 100k puede haber pausas ocasionales pero no recurrentes.

- Estabilidad visual
  - Cero parpadeos en decoraciones de encabezados al tipear o mover el cursor.
  - Cero parpadeos y cero “marcadores visibles” en `{#color|texto}` incluso al borrar o editar en bordes.

- Wikilinks
  - El popup se posiciona exactamente bajo/junto al cursor usando `coordsAtPos`.
  - Navegación por teclado fluida; sin jank al abrir/cerrar; consultas cancelables y cacheadas.

- Guardado
  - Autosave a 5 s después de la última edición sin bloquear la escritura; no más de 1 request por ráfaga.
  - Botón Guardar y Ctrl+S guardan inmediatamente y muestran estados (dirty/guardando/guardado).
  - Tareas pesadas (actualizar `note_links`, outline) no bloquean el hilo principal.

- Plegado de encabezados
  - Plegado anidado consistente; expandir/plegar no recalcula toda la jerarquía.
  - Rango de plegado correcto por niveles H1–H6.

- Coherencia editor/preview
  - Colores y tamaños de H1–H6 iguales entre editor y `NotePreview.tsx` usando `src/lib/theme.ts`.

- Robustez
  - Al cambiar de nota no quedan fetches/timeout/workers vivos; sin pérdidas de memoria.
  - Reconfigurar tema/extensiones no reinstancia el editor (usa `Compartment`).
