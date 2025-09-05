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
  h1: '#ffffff', // Blanco puro - el más notorio
  h2: '#60a5fa', // Azul claro - resalta sin robar protagonismo
  h3: '#a78bfa', // Violeta suave - contraste académico
  h4: '#4ade80', // Verde - muy legible, da "ok / correcto"
  h5: '#d1d5db', // Gris claro - mantiene jerarquía
  h6: '#9ca3af', // Gris medio - más discreto, casi subtítulo
};

/**
 * Tamaños de encabezados en rem - fuente única para editor y vista previa.
 * Cambiar aquí afecta ambos lados automáticamente.
 */
export const headerSizes = {
  h1: '3rem',     // 48px - el más grande y notorio
  h2: '2.25rem',  // 36px - decreciendo progresivamente
  h3: '1.875rem', // 30px
  h4: '1.5rem',   // 24px
  h5: '1.25rem',  // 20px
  h6: '1rem',     // 16px - base
};

export const headerTextClasses: Record<number, string> = {
  1: 'text-[#ffffff]', // H1 - Blanco puro
  2: 'text-[#60a5fa]', // H2 - Azul claro
  3: 'text-[#a78bfa]', // H3 - Violeta suave
  4: 'text-[#4ade80]', // H4 - Verde
  5: 'text-[#d1d5db]', // H5 - Gris claro
  6: 'text-[#9ca3af]', // H6 - Gris medio
};
