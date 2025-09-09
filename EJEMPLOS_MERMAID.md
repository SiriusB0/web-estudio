# Ejemplos de Diagramas Mermaid

Esta guía contiene ejemplos de diferentes tipos de diagramas Mermaid que puedes usar en tus notas y flashcards.

## 1. Diagrama de Flujo (Flowchart)

```mermaid
flowchart TD
    A[Inicio] --> B{¿Condición?}
    B -->|Sí| C[Proceso A]
    B -->|No| D[Proceso B]
    C --> E[Fin]
    D --> E
```

## 2. Diagrama de Secuencia

```mermaid
sequenceDiagram
    participant Usuario
    participant Sistema
    participant BD
    
    Usuario->>Sistema: Solicitar datos
    Sistema->>BD: Consultar información
    BD-->>Sistema: Datos encontrados
    Sistema-->>Usuario: Mostrar resultados
```

## 3. Diagrama de Gantt

```mermaid
gantt
    title Cronograma del Proyecto
    dateFormat  YYYY-MM-DD
    section Fase 1
    Análisis           :a1, 2024-01-01, 30d
    Diseño            :after a1, 20d
    section Fase 2
    Desarrollo        :2024-02-20, 45d
    Pruebas          :2024-04-05, 20d
```

## 4. Diagrama de Clases

```mermaid
classDiagram
    class Animal {
        +String nombre
        +int edad
        +comer()
        +dormir()
    }
    
    class Perro {
        +String raza
        +ladrar()
    }
    
    class Gato {
        +String color
        +maullar()
    }
    
    Animal <|-- Perro
    Animal <|-- Gato
```

## 5. Diagrama de Estado

```mermaid
stateDiagram-v2
    [*] --> Inactivo
    Inactivo --> Activo : activar()
    Activo --> Procesando : procesar()
    Procesando --> Activo : completar()
    Procesando --> Error : fallar()
    Error --> Activo : reintentar()
    Activo --> Inactivo : desactivar()
    Error --> [*] : terminar()
```

## 6. Diagrama de Entidad-Relación

```mermaid
erDiagram
    USUARIO ||--o{ PEDIDO : realiza
    PEDIDO ||--|{ DETALLE_PEDIDO : contiene
    PRODUCTO ||--o{ DETALLE_PEDIDO : incluye
    
    USUARIO {
        int id PK
        string nombre
        string email
        date fecha_registro
    }
    
    PEDIDO {
        int id PK
        int usuario_id FK
        date fecha
        decimal total
    }
    
    PRODUCTO {
        int id PK
        string nombre
        decimal precio
        int stock
    }
```

## 7. Diagrama de Pastel (Pie Chart)

```mermaid
pie title Distribución de Tiempo de Estudio
    "Matemáticas" : 35
    "Programación" : 25
    "Historia" : 20
    "Idiomas" : 15
    "Otros" : 5
```

## 8. Diagrama de Git

```mermaid
gitgraph
    commit id: "Inicial"
    branch develop
    checkout develop
    commit id: "Feature A"
    commit id: "Feature B"
    checkout main
    merge develop
    commit id: "Release v1.0"
```

## 9. Diagrama de Arquitectura C4

```mermaid
C4Context
    title Contexto del Sistema
    
    Person(usuario, "Usuario", "Persona que usa el sistema")
    System(sistema, "Sistema Principal", "Aplicación web de gestión")
    System_Ext(email, "Sistema de Email", "Servicio externo de correo")
    
    Rel(usuario, sistema, "Usa")
    Rel(sistema, email, "Envía notificaciones")
```

## 10. Mapa Mental

```mermaid
mindmap
  root((Aprendizaje))
    Teorías
      Constructivismo
      Conductismo
      Cognitivismo
    Métodos
      Visual
      Auditivo
      Kinestésico
    Herramientas
      Flashcards
      Mapas mentales
      Diagramas
```

## Cómo Usar en tu Editor

1. **En el editor de notas**: Simplemente escribe un bloque de código con el lenguaje `mermaid`:
   ````markdown
   ```mermaid
   flowchart TD
       A --> B
   ```
   ````

2. **En flashcards**: Puedes incluir diagramas tanto en la pregunta como en la respuesta de tus flashcards.

3. **Modo de estudio**: Los diagramas se renderizarán automáticamente cuando visualices tus notas o estudies con flashcards.

## Consejos de Uso

- **Simplicidad**: Mantén los diagramas simples y claros
- **Colores**: Mermaid usa un tema oscuro que combina con tu editor
- **Tamaño**: Los diagramas se ajustan automáticamente al contenedor
- **Errores**: Si hay un error en la sintaxis, se mostrará un mensaje de error con el código para que puedas corregirlo

¡Experimenta con estos ejemplos y crea tus propios diagramas para mejorar tus notas de estudio!
