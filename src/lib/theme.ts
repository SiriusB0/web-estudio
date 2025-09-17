// src/lib/theme.ts
/**
 * Configuración centralizada de COLORES para encabezados (H1–H6).
 * 
 * Dónde se usan:
 * - Editor (CodeMirror): `headerColors` es consumido en `NoteEditor.tsx`
 *   dentro de `customSyntaxHighlighting` para colorear los tokens de heading.
 * - Modo Estudio (ReactMarkdown): `headerTextClasses` es consumido en
 *   `NotePreview.tsx` para asignar clases Tailwind por nivel de header.
 * 
 * Cómo cambiar COLORES:
 * - Cambia los valores hex de `headerColors` (afecta al editor).
 * - Cambia las clases en `headerTextClasses` (afecta al modo estudio).
 *   Recomendado mantener ambos en sincronía para consistencia visual.
 * 
 * Ejemplo rápido:
 *   - H1 verde en ambos lados:
 *       headerColors.h1 = '#22c55e'
 *       headerTextClasses[1] = 'text-[#22c55e]'
 */

export const headerColors = {
  h1: '#f8fafc', // Blanco casi puro - como en el ejemplo
  h2: '#60a5fa', // Azul brillante - como en el ejemplo
  h3: '#8b5cf6', // Violeta - como en el ejemplo
  h4: '#10b981', // Verde esmeralda - como en el ejemplo
  h5: '#f59e0b', // Ámbar/naranja - como en el ejemplo
  h6: '#d1d5db', // Gris claro - como en el ejemplo
};

/**
 * Tamaños de encabezados para vista normal (rem) - tamaños fijos basados en fuente raíz.
 * Cambiar aquí afecta editor y modo estudio automáticamente.
 */
export const headerSizes = {
  h1: '2.0rem',   // 2em del ejemplo
  h2: '1.5rem',   // 1.5em del ejemplo
  h3: '1.3rem',   // 1.3em del ejemplo
  h4: '1.15rem',  // 1.15em del ejemplo
  h5: '1.05rem',  // 1.05em del ejemplo
  h6: '0.95rem',  // 0.95em del ejemplo
};

/**
 * Tamaños de encabezados para modo estudio (em) - relativos al tamaño base.
 * Se escalan automáticamente cuando cambias el tamaño de fuente.
 */
export const headerSizesStudy = {
  h1: '2.0em',    // 2em del ejemplo - más grande para móvil
  h2: '1.5em',    // 1.5em del ejemplo
  h3: '1.3em',    // 1.3em del ejemplo
  h4: '1.15em',   // 1.15em del ejemplo
  h5: '1.05em',   // 1.05em del ejemplo
  h6: '0.95em',   // 0.95em del ejemplo
};

/**
 * Pesos de fuente para cada nivel de header.
 */
export const headerWeights = {
  h1: '700',      // H1: peso 700 - como en el ejemplo
  h2: '600',      // H2: peso 600 - como en el ejemplo
  h3: '600',      // H3: peso 600 - como en el ejemplo
  h4: '600',      // H4: peso 600 - como en el ejemplo
  h5: '600',      // H5: peso 600 - como en el ejemplo
  h6: '500',      // H6: peso 500 - como en el ejemplo
};

export const headerTextClasses: Record<number, string> = {
  1: 'text-[#f8fafc]', // H1 - Blanco casi puro - como en el ejemplo
  2: 'text-[#60a5fa]', // H2 - Azul brillante - como en el ejemplo
  3: 'text-[#8b5cf6]', // H3 - Violeta - como en el ejemplo
  4: 'text-[#10b981]', // H4 - Verde esmeralda - como en el ejemplo
  5: 'text-[#f59e0b]', // H5 - Ámbar/naranja - como en el ejemplo
  6: 'text-[#d1d5db]', // H6 - Gris claro - como en el ejemplo
};
