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
  h1: '#39FF14', // Verde lima brillante
  h2: '#00FFA3', // Verde agua
  h3: '#00FFD5', // Turquesa suave
  h4: '#00BFAF', // Verde azulado
  h5: '#007F7F', // Verde oscuro frío
  h6: '#004D4D', // Verde profundo
};

/**
 * Tamaños de encabezados para vista normal (rem) - tamaños fijos basados en fuente raíz.
 * Cambiar aquí afecta editor y vista previa automáticamente.
 */
export const headerSizes = {
  h1: '2.5rem',   // 40px aprox.
  h2: '2rem',     // 32px aprox.
  h3: '1.75rem',  // 28px aprox.
  h4: '1.5rem',   // 24px aprox.
  h5: '1.25rem',  // 20px aprox.
  h6: '1.1rem',   // 17.6px aprox.
};

/**
 * Tamaños de encabezados para modo estudio (em) - relativos al tamaño base.
 * Se escalan automáticamente cuando cambias el tamaño de fuente.
 */
export const headerSizesStudy = {
  h1: '2.5em',    // 2.5 × tamaño base
  h2: '2em',      // 2 × tamaño base
  h3: '1.7em',    // 1.7 × tamaño base
  h4: '1.4em',    // 1.4 × tamaño base
  h5: '1.2em',    // 1.2 × tamaño base
  h6: '1em',      // igual al tamaño base
};

/**
 * Pesos de fuente para cada nivel de header.
 */
export const headerWeights = {
  h1: '700',      // H1: peso 700
  h2: '600',      // H2: peso 600
  h3: '600',      // H3: peso 600
  h4: '500',      // H4: peso 500
  h5: '500',      // H5: peso 500
  h6: '500',      // H6: peso 500
};

export const headerTextClasses: Record<number, string> = {
  1: 'text-[#39FF14]', // H1 - Verde lima brillante
  2: 'text-[#00FFA3]', // H2 - Verde agua
  3: 'text-[#00FFD5]', // H3 - Turquesa suave
  4: 'text-[#00BFAF]', // H4 - Verde azulado
  5: 'text-[#007F7F]', // H5 - Verde oscuro frío
  6: 'text-[#004D4D]', // H6 - Verde profundo
};
