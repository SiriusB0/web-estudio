// src/lib/theme.ts
/**
 * Configuración centralizada de COLORES para encabezados (H1–H6).
 * 
 * Dónde se usan:
 * - Editor (CodeMirror): `headerColors` es consumido en `NoteEditor.tsx`
 *   dentro de `customSyntaxHighlighting` para colorear los tokens de heading.
 * - Vista previa (ReactMarkdown): `headerTextClasses` es consumido en
 *   `NotePreview.tsx` para asignar clases Tailwind por nivel de header.
 * 
 * Cómo cambiar COLORES:
 * - Cambia los valores hex de `headerColors` (afecta al editor).
 * - Cambia las clases en `headerTextClasses` (afecta a la vista previa).
 *   Recomendado mantener ambos en sincronía para consistencia visual.
 * 
 * Ejemplo rápido:
 *   - H1 verde en ambos lados:
 *       headerColors.h1 = '#22c55e'
 *       headerTextClasses[1] = 'text-[#22c55e]'
 */

export const headerColors = {
  h1: '#63B3ED', // blue.300
  h2: '#4299E1', // blue.400
  h3: '#9F7AEA', // purple.400
  h4: '#805AD5', // purple.500
  h5: '#ED8936', // orange.400
  h6: '#DD6B20', // orange.500
};

/**
 * Tamaños de encabezados en rem - fuente única para editor y vista previa.
 * Cambiar aquí afecta ambos lados automáticamente.
 */
export const headerSizes = {
  h1: '2.25rem', // 36px - text-4xl
  h2: '1.875rem', // 30px - text-3xl (más pequeño que H1)
  h3: '1.5rem',   // 24px - text-2xl
  h4: '1.25rem',  // 20px - text-xl
  h5: '1.125rem', // 18px - text-lg
  h6: '1rem',     // 16px - text-base
};

export const headerTextClasses: Record<number, string> = {
  1: 'text-[#63B3ED]', // H1
  2: 'text-[#4299E1]', // H2
  3: 'text-[#9F7AEA]', // H3
  4: 'text-[#805AD5]', // H4
  5: 'text-[#ED8936]', // H5
  6: 'text-[#DD6B20]', // H6
};
