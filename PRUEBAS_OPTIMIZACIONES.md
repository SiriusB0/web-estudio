# Guía de Pruebas para Optimizaciones del Editor

## Cómo probar las mejoras implementadas

### 1. Pruebas de rendimiento del headerDecorationPlugin

**Qué se optimizó:**
- Procesamiento solo del viewport visible
- Uso de RangeSetBuilder en lugar de arrays
- Mapeo incremental de decoraciones con `Decoration.map`

**Cómo probarlo:**
1. Crea una nota con muchos encabezados (50+ líneas con `# ## ### ####`)
2. Abre las DevTools de Chrome (F12) → pestaña Performance
3. Inicia grabación y escribe/edita en el editor por 10-15 segundos
4. Para la grabación y verifica:
   - **Antes**: Múltiples picos de >16ms en "buildDecorations"
   - **Después**: Picos reducidos, la mayoría <10ms

**Criterio de éxito:** p95 de latencia por tecla < 10ms en documentos de 25k caracteres.

### 2. Pruebas del color inline sin parpadeos

**Qué se optimizó:**
- Decoraciones estables que no dependen de la posición del cursor
- Uso de `Decoration.replace` para ocultar marcadores completamente
- Borrado atómico mejorado

**Cómo probarlo:**
1. Escribe texto con colores: `{#red|texto rojo} y {#blue|texto azul}`
2. Mueve el cursor dentro y fuera del texto coloreado
3. Edita caracteres dentro del texto coloreado
4. Borra caracteres hasta que quede solo 1 letra

**Criterio de éxito:**
- ✅ Cero parpadeos al mover el cursor
- ✅ Los marcadores `{#color|` y `}` nunca se ven
- ✅ Al borrar el último carácter, se elimina todo el patrón limpiamente

### 3. Pruebas de borrado atómico

**Casos específicos a probar:**

```markdown
Texto {#green|verde} normal
```

1. **Cursor dentro del texto coloreado:**
   - Posiciona cursor entre 'v' y 'e' en "verde"
   - Presiona Backspace hasta que quede solo 1 carácter
   - **Esperado:** Al borrar el último carácter, desaparece todo `{#green|x}`

2. **Cursor justo después del patrón:**
   - Posiciona cursor después de `}` 
   - Presiona Backspace
   - **Esperado:** Se elimina el formato, queda solo "verde"

3. **Cursor justo antes del patrón:**
   - Posiciona cursor antes de `{`
   - Presiona Delete
   - **Esperado:** Se elimina el formato, queda solo "verde"

### 4. Pruebas de rendimiento general

**Dataset de prueba recomendado:**
```markdown
# Encabezado Principal
Texto normal con {#red|colores} y más {#blue|texto azul}.

## Subsección
Más contenido con {#green|verde} y enlaces [[Otra Nota]].

### Nivel 3
{#purple|Texto morado} con más contenido...

[Repetir este patrón 100+ veces para crear un documento de ~25k caracteres]
```

**Métricas a verificar:**
1. **FPS durante escritura:** Abrir DevTools → Rendering → FPS meter
   - **Meta:** ≥60 FPS constante al escribir
   
2. **Latencia de entrada:** Performance tab mientras escribes
   - **Meta:** p95 < 10ms por pulsación de tecla
   
3. **Memoria:** Memory tab, verificar que no hay fugas
   - **Meta:** Sin crecimiento continuo al alternar entre notas

### 5. Pruebas de regresión

**Verificar que no se rompió nada:**
- ✅ Plegado de encabezados funciona (click en flechas)
- ✅ Wikilinks `[[texto]]` siguen funcionando
- ✅ Flashcards (Alt+Q, Alt+A) siguen funcionando
- ✅ Toolbar de markdown funciona
- ✅ Vista previa sincronizada funciona
- ✅ Autosave sigue funcionando

### 6. Comandos para probar

**Abrir el editor:**
```bash
cd c:\Users\micro\Downloads\Windsurf\proyecto-estudio
npm run dev
```

**Navegar a:** `http://localhost:3000/editor`

### 7. Casos extremos

1. **Documento muy largo:** 100k+ caracteres
2. **Muchos colores:** 50+ patrones `{#color|texto}` en una página
3. **Encabezados anidados:** H1 → H6 con mucho contenido
4. **Scroll rápido:** Verificar que las decoraciones se mantienen estables

### 8. Indicadores de éxito

**✅ Optimización exitosa si:**
- No hay parpadeos visibles en texto coloreado
- Escritura fluida (60 FPS) en documentos grandes
- Borrado atómico funciona limpiamente
- Sin regresiones en funcionalidad existente
- Latencia de entrada <10ms p95

**❌ Necesita ajustes si:**
- Siguen apareciendo marcadores `{#color|` al editar
- FPS cae por debajo de 45 en documentos medianos
- El borrado deja fragmentos de sintaxis
- Alguna funcionalidad existente se rompió
