"use client";

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeHighlighterProps {
  text: string;
}

// Detectar lenguaje de programación basado en patrones
function detectLanguage(code: string): string {
  const trimmedCode = code.trim();
  
  // C/C++
  if (trimmedCode.includes('#include') || 
      trimmedCode.includes('cout <<') || 
      trimmedCode.includes('cin >>') ||
      /\b(int|float|double|char|void)\s+\w+/.test(trimmedCode) ||
      trimmedCode.includes('for(') ||
      trimmedCode.includes('printf(') ||
      trimmedCode.includes('scanf(')) {
    return 'cpp';
  }
  
  // Java
  if (trimmedCode.includes('public class') ||
      trimmedCode.includes('System.out.println') ||
      trimmedCode.includes('public static void main') ||
      /\b(public|private|protected)\s+(static\s+)?(void|int|String)/.test(trimmedCode)) {
    return 'java';
  }
  
  // Python
  if (trimmedCode.includes('def ') ||
      trimmedCode.includes('import ') ||
      trimmedCode.includes('print(') ||
      trimmedCode.includes('if __name__') ||
      /^\s*def\s+\w+/.test(trimmedCode) ||
      /^\s*class\s+\w+/.test(trimmedCode)) {
    return 'python';
  }
  
  // JavaScript
  if (trimmedCode.includes('function ') ||
      trimmedCode.includes('const ') ||
      trimmedCode.includes('let ') ||
      trimmedCode.includes('var ') ||
      trimmedCode.includes('console.log') ||
      trimmedCode.includes('=>') ||
      trimmedCode.includes('document.') ||
      trimmedCode.includes('window.')) {
    return 'javascript';
  }
  
  // HTML
  if (trimmedCode.includes('<html') ||
      trimmedCode.includes('<!DOCTYPE') ||
      /<\w+[^>]*>/.test(trimmedCode)) {
    return 'html';
  }
  
  // CSS
  if (trimmedCode.includes('{') && trimmedCode.includes('}') &&
      (trimmedCode.includes(':') || trimmedCode.includes(';'))) {
    return 'css';
  }
  
  // SQL
  if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(trimmedCode)) {
    return 'sql';
  }
  
  // Si no se detecta, usar texto plano
  return 'text';
}

// Detectar si un bloque de texto contiene código
function isCodeBlock(text: string): boolean {
  const codeIndicators = [
    // Símbolos comunes de programación
    /[{}();]/,
    // Palabras clave de programación
    /\b(function|def|class|if|else|for|while|return|import|include|public|private|void|int|string|float|double)\b/i,
    // Operadores de programación
    /[=<>!]+[=]/,
    // Comentarios
    /\/\/|\/\*|\*\/|#|<!--/,
    // Strings con comillas
    /["'`][^"'`]*["'`]/,
    // Indentación consistente (más de 2 espacios al inicio)
    /^\s{2,}/m,
    // Punto y coma al final de línea
    /;\s*$/m
  ];
  
  let matches = 0;
  for (const indicator of codeIndicators) {
    if (indicator.test(text)) {
      matches++;
    }
  }
  
  // Si tiene 2 o más indicadores, probablemente es código
  return matches >= 2;
}

// Separar texto normal de bloques de código de forma más inteligente
function parseTextWithCode(text: string): Array<{ type: 'text' | 'code', content: string, language?: string }> {
  // Estrategia más simple: detectar si todo el texto después de la pregunta es código
  const lines = text.split('\n');
  
  // Buscar la primera línea que parece código
  let codeStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isCodeBlock(line)) {
      codeStartIndex = i;
      break;
    }
  }
  
  if (codeStartIndex === -1) {
    // No hay código, devolver todo como texto
    return [{ type: 'text', content: text }];
  }
  
  // Separar en texto inicial y bloque de código
  const textLines = lines.slice(0, codeStartIndex);
  const codeLines = lines.slice(codeStartIndex);
  
  const blocks: Array<{ type: 'text' | 'code', content: string, language?: string }> = [];
  
  // Agregar texto inicial si existe
  if (textLines.length > 0) {
    const textContent = textLines.join('\n').trim();
    if (textContent) {
      blocks.push({
        type: 'text',
        content: textContent
      });
    }
  }
  
  // Agregar bloque de código
  if (codeLines.length > 0) {
    const codeContent = codeLines.join('\n').trim();
    if (codeContent) {
      blocks.push({
        type: 'code',
        content: codeContent,
        language: detectLanguage(codeContent)
      });
    }
  }
  
  return blocks;
}

export default function CodeHighlighter({ text }: CodeHighlighterProps) {
  const blocks = parseTextWithCode(text);
  
  return (
    <div>
      {blocks.map((block, index) => {
        if (block.type === 'code') {
          return (
            <div key={index} className="text-xs sm:text-sm">
              <SyntaxHighlighter
                language={block.language || 'text'}
                style={vscDarkPlus}
                customStyle={{
                  margin: '8px 0',
                  borderRadius: '6px',
                  fontSize: 'inherit',
                  lineHeight: '1.4'
                }}
                showLineNumbers={false}
                wrapLongLines={true}
              >
                {block.content}
              </SyntaxHighlighter>
            </div>
          );
        } else {
          return (
            <pre key={index} className="whitespace-pre-wrap font-sans text-white leading-relaxed">
              {block.content}
            </pre>
          );
        }
      })}
    </div>
  );
}
