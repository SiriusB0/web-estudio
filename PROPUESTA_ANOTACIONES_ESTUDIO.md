# Propuesta: Sistema de Anotaciones de Estudio

## Objetivo
Añadir un sistema de anotaciones en la vista previa de notas que permita:
- Crear pines de anotación en cualquier parte del contenido (texto, código, listas)
- Edición rápida con Markdown y plantillas
- Conversión a flashcards y otros formatos de estudio
- Navegación y filtrado eficiente

## Características Principales

### 1. Modelo de Anclaje
- **Headings**: Vinculación por ID (H1-H6)
- **Texto seleccionado**: Almacenamiento con contexto para búsqueda difusa
- **Código**: Soporte para anotaciones por línea o rango
- **Listas/Blockquotes**: Anclaje por posición relativa

### 2. Interacción
- **Creación de anotaciones**:
  - Hover + botón "+" en márgenes
  - Atajo global: Alt+Shift+N
  - Selección de texto → menú contextual

- **Edición**:
  - Popover con editor Markdown
  - Plantillas rápidas
  - Auto-guardado con debounce

### 3. Visualización
- **Pines**:
  - Iconos en márgenes/gutter
  - Colores por prioridad
  - Estados: pendiente/revisado

- **Modos de vista**:
  - Normal: Todos los pines visibles
  - Estudio: Solo pines pendientes/importantes
  - Enfoque: Anotaciones de la sección actual

### 4. Flujos de Estudio
- **Flashcards**:
  - Conversión 1-clic a QA/Cloze
  - Integración con FlashcardGenerator
  - Recordatorios espaciados

- **Seguimiento**:
  - Estados: Por revisar → Revisado → Dominado
  - Etiquetas personalizables
  - Filtros por prioridad/estado/etiqueta

### 5. Atajos de Teclado
- `Alt+Shift+N`: Nueva anotación
- `Alt+Enter`: Editar anotación seleccionada
- `Alt+]`/`Alt+[`: Navegar entre anotaciones
- `Alt+Shift+F`: Convertir a flashcard
- `Alt+H`: Mostrar/ocultar pines

## Implementación Técnica

### Componentes Principales
1. **NotePin**: Componente de UI para pines
2. **AnnotationPopover**: Editor flotante
3. **AnnotationsPanel**: Vista lateral de lista
4. **useAnnotations**: Hook para gestión de estado
5. **SupabaseService**: Capa de persistencia

### Estructura de Datos
```typescript
interface Annotation {
  id: string;
  userId: string;
  documentId: string;
  anchor: {
    type: 'heading' | 'text' | 'code' | 'list';
    target: string; // ID o selector
    context?: string; // Texto de contexto
  };
  content: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'reviewed' | 'mastered';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  // Opcionales
  dueAt?: string;
  flashcardId?: string;
  metadata?: Record<string, any>;
}
```

### Plan de Implementación
1. **Fase 1**: Pines básicos (solo UI)
2. **Fase 2**: Persistencia local
3. **Fase 3**: Sincronización Supabase
4. **Fase 4**: Integración con flashcards
5. **Fase 5**: Optimizaciones y accesibilidad

## Preguntas Abiertas
- Preferencias de atajos de teclado
- Plantillas de flashcards más útiles
- Flujos de estudio específicos
- Requisitos de privacidad/compartición
