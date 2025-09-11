# Guía de Flashcards de Opción Múltiple

## Descripción General

El sistema de flashcards de opción múltiple permite crear y estudiar preguntas con múltiples opciones de respuesta, soportando tanto respuestas únicas como múltiples respuestas correctas.

## Características Principales

### ✨ Funcionalidades
- **Creación en lote**: Pega múltiples preguntas en formato texto y genera flashcards automáticamente
- **Respuestas múltiples**: Soporte para preguntas con una o varias respuestas correctas
- **Vista previa**: Revisa las preguntas antes de crearlas
- **Modo de estudio mixto**: Combina flashcards tradicionales y de opción múltiple
- **Interfaz intuitiva**: Diseño limpio y fácil de usar
- **Retroalimentación visual**: Indicadores claros de respuestas correctas e incorrectas

### 🎯 Tipos de Estudio
1. **Solo Tradicionales**: Estudia únicamente flashcards de pregunta/respuesta
2. **Solo Opción Múltiple**: Estudia únicamente preguntas de selección múltiple
3. **Modo Mixto**: Combina ambos tipos en una sesión de estudio

## Formato de Entrada

### Estructura Requerida
```
Pregunta X: ¿Texto de la pregunta?
a) Primera opción
b) Segunda opción
c) Tercera opción
d) Cuarta opción
Respuesta: b

Pregunta Y: ¿Otra pregunta?
a) Opción A
b) Opción B
c) Opción C
Respuesta: a,c
```

### Reglas del Formato
- **Pregunta**: Debe comenzar con "Pregunta X:" seguido del texto
- **Opciones**: Usar letras minúsculas seguidas de paréntesis: a), b), c), etc.
- **Respuesta**: "Respuesta:" seguido de la(s) letra(s) correcta(s)
- **Múltiples respuestas**: Separar con comas sin espacios: `a,c,d`
- **Separación**: Línea en blanco entre preguntas

## Cómo Usar

### 1. Crear Flashcards de Opción Múltiple
1. Abre el visor de flashcards de cualquier nota
2. Haz clic en **"+ Opción Múltiple"** (botón morado)
3. Pega tu texto con las preguntas en el formato especificado
4. Haz clic en **"Generar Flashcards"** para procesar el texto
5. Revisa la vista previa de cada pregunta
6. Haz clic en **"Crear Flashcards"** para guardarlas

### 2. Estudiar
1. En el visor de flashcards, haz clic en **"📚 Estudiar"**
2. Selecciona el tipo de estudio:
   - **Flashcards Tradicionales**: Solo pregunta/respuesta
   - **Opción Múltiple**: Solo preguntas de selección
   - **Modo Mixto**: Ambos tipos mezclados
3. Haz clic en **"Comenzar Estudio"**

### 3. Durante el Estudio
- **Flashcards tradicionales**: Toca para voltear, califica tu respuesta
- **Opción múltiple**: Selecciona opciones y confirma respuesta
- **Navegación**: Usa los botones anterior/siguiente (desktop)
- **Progreso**: Visualiza tu avance en la barra superior

## Ejemplos de Uso

### Ejemplo 1: Respuesta Única
```
Pregunta 1: ¿Cuál es la capital de Francia?
a) Madrid
b) París
c) Roma
d) Londres
Respuesta: b
```

### Ejemplo 2: Múltiples Respuestas
```
Pregunta 2: ¿Cuáles son números pares?
a) 1
b) 2
c) 3
d) 4
e) 5
Respuesta: b,d
```

### Ejemplo 3: Pregunta Técnica
```
Pregunta 3: ¿Qué lenguajes son orientados a objetos?
a) JavaScript
b) Python
c) HTML
d) Java
e) CSS
Respuesta: a,b,d
```

## Características Técnicas

### Base de Datos
- Las flashcards se almacenan en la tabla `cards` con campos adicionales:
  - `type`: 'traditional' o 'multiple_choice'
  - `question`: Texto de la pregunta
  - `options`: JSON con las opciones disponibles
  - `correct_answers`: JSON con las respuestas correctas

### Validaciones
- Mínimo 2 opciones por pregunta
- Máximo 26 opciones (a-z)
- Al menos 1 respuesta correcta
- Todas las respuestas correctas deben existir en las opciones

### Interfaz Móvil
- Diseño optimizado para dispositivos móviles
- Navegación táctil intuitiva
- Botones de tamaño adecuado para touch

## Solución de Problemas

### Errores Comunes

**"Formato de pregunta inválido"**
- Verifica que la pregunta comience con "Pregunta X:"
- Asegúrate de incluir el número de pregunta

**"Formato de opción inválido"**
- Las opciones deben usar el formato: `a) texto`
- Usa letras minúsculas seguidas de paréntesis

**"Respuestas inválidas"**
- Verifica que las letras en "Respuesta:" existan en las opciones
- Para múltiples respuestas, usa formato: `a,c,d` (sin espacios)

**"Falta la línea de respuesta"**
- Cada pregunta debe terminar con "Respuesta: x"
- No olvides los dos puntos después de "Respuesta"

### Consejos de Uso

1. **Usa el botón "Cargar Ejemplo"** para ver el formato correcto
2. **Revisa la vista previa** antes de crear las flashcards
3. **Separa preguntas con líneas en blanco** para evitar errores
4. **Mantén las opciones concisas** para mejor legibilidad
5. **Usa el modo mixto** para sesiones de estudio más variadas

## Integración con el Sistema

### Compatibilidad
- Funciona con todas las funcionalidades existentes de flashcards
- Compatible con el sistema de carpetas y notas
- Integrado con el modo de estudio móvil
- Soporte para imágenes en flashcards tradicionales (no en opción múltiple)

### Estadísticas
- Las respuestas se cuentan como correctas/incorrectas
- Compatible con el sistema de progreso existente
- Métricas de precisión por sesión de estudio

---

## Instalación y Configuración

### Requisitos de Base de Datos
Ejecuta el script SQL proporcionado (`sql_multiple_choice_flashcards.sql`) en tu base de datos Supabase para agregar los campos necesarios.

### Archivos Creados
- `multipleChoiceParser.ts`: Parser para procesar texto
- `MultipleChoiceCard.tsx`: Componente de flashcard interactiva
- `MultipleChoiceCreator.tsx`: Interfaz de creación
- `StudyModeSelector.tsx`: Selector de modo de estudio
- `MixedStudyMode.tsx`: Modo de estudio combinado
- Actualizaciones en `FlashcardViewer.tsx` y `flashcards.ts`

¡Disfruta estudiando con las nuevas flashcards de opción múltiple! 🎓
