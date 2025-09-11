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
  h1: '#F5F5F5', // Blanco hueso
  h2: '#B0B0B0', // Gris claro
  h3: '#D0D0D0', // Gris medio claro
  h4: '#9A9A9A', // Gris medio
  h5: '#6E6E6E', // Gris oscuro
  h6: '#3D3D3D', // Gris muy oscuro
};

/**
 * Tamaños de encabezados para vista normal (rem) - tamaños fijos basados en fuente raíz.
 * Cambiar aquí afecta editor y modo estudio automáticamente.
 */
export const headerSizes = {
  h1: '2.2rem',   // 35.2px aprox.
  h2: '1.9rem',   // 30.4px aprox.
  h3: '1.6rem',   // 25.6px aprox.
  h4: '1.3rem',   // 20.8px aprox.
  h5: '1.1rem',   // 17.6px aprox.
  h6: '0.9rem',   // 14.4px aprox.
};

/**
 * Tamaños de encabezados para modo estudio (em) - relativos al tamaño base.
 * Se escalan automáticamente cuando cambias el tamaño de fuente.
 */
export const headerSizesStudy = {
  h1: '1.6em',    // más compacto para móvil
  h2: '1.4em',
  h3: '1.2em',
  h4: '1.1em',
  h5: '1.05em',
  h6: '1em',
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
  1: 'text-[#F5F5F5]', // H1 - Blanco hueso
  2: 'text-[#B0B0B0]', // H2 - Gris claro
  3: 'text-[#D0D0D0]', // H3 - Gris medio claro
  4: 'text-[#9A9A9A]', // H4 - Gris medio
  5: 'text-[#6E6E6E]', // H5 - Gris oscuro
  6: 'text-[#3D3D3D]', // H6 - Gris muy oscuro
};
