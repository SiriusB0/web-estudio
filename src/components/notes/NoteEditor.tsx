"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType, scrollPastEnd, keymap } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting, syntaxTree, foldGutter, foldEffect, unfoldEffect, codeFolding, foldService, foldedRanges, foldInside } from "@codemirror/language";
import { lineNumbers } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { headerColors, headerSizes, headerWeights } from "../../lib/theme";
import { debounce } from "@/lib/notes/noteUtils";
import WikilinkSuggestions from "./WikilinkSuggestions";
import NotePreview from "./NotePreview";
import MarkdownToolbar from "./MarkdownToolbar";
import FlashcardViewer from "./FlashcardViewer";
import DocumentOutline from "./DocumentOutline";
import { supabase } from "@/lib/supabaseClient";
import { Flashcard, getOrCreateDeckForNote, saveFlashcard, countFlashcardsForNote, countFlashcardsByType } from "@/lib/notes/flashcards";
import StudyModeSelector from "./StudyModeSelector";

interface NoteEditorProps {
  initialContent: string;
  onSave: (content: string) => void;
  onTitleChange?: (title: string) => void;
  userId?: string;
  noteId?: string;
  noteTitle?: string;
  viewMode?: "edit" | "preview";
  onViewModeChange?: (mode: "edit" | "preview") => void;
  theme?: "light" | "dark";
  isFocusMode?: boolean;
  isSplitView?: boolean;
  currentFolderId?: string | null;
  onNoteCreated?: () => void;
  onToggleFocusMode?: () => void;
  onToggleSplitView?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function NoteEditor({ 
  initialContent, 
  onSave, 
  onTitleChange,
  theme = "light",
  userId,
  noteId,
  noteTitle,
  viewMode = "edit",
  onViewModeChange,
  isFocusMode = false,
  isSplitView = false,
  currentFolderId,
  onNoteCreated,
  onToggleFocusMode,
  onToggleSplitView,
  isSidebarCollapsed = false,
  onToggleSidebar
}: NoteEditorProps) {

  // Función para encontrar líneas de una sección
  // Función para calcular el rango de plegado de un encabezado
  const calculateFoldRange = useCallback((view: EditorView, headerLineNumber: number) => {
    const doc = view.state.doc;
    const headerLine = doc.line(headerLineNumber + 1); // +1 porque headerLineNumber es 0-indexed
    const headerText = headerLine.text;
    
    // Verificar si es un encabezado
    const headerMatch = headerText.match(/^(#{1,6})\s/);
    if (!headerMatch) return null;
    
    const headerLevel = headerMatch[1].length;
    const startLineNum = headerLine.number;
    let endLineNum = doc.lines;
    
    console.log(`[FOLD CALC] Calculando rango para encabezado nivel ${headerLevel} en línea ${startLineNum}: "${headerText}"`);
    
    // Buscar el final de la sección - debe incluir headers de menor jerarquía
    for (let lineNum = startLineNum + 1; lineNum <= doc.lines; lineNum++) {
      try {
        const currentLine = doc.line(lineNum);
        const currentText = currentLine.text.trim();
        
        // Solo detener en headers del mismo nivel o superior (menor número de #)
        if (currentText.startsWith('#')) {
          const currentHeaderMatch = currentText.match(/^(#{1,6})\s/);
          if (currentHeaderMatch) {
            const currentLevel = currentHeaderMatch[1].length;
            console.log(`[FOLD CALC] Encontrado encabezado nivel ${currentLevel} en línea ${lineNum}`);
            // Solo detener si es del mismo nivel o superior (menor jerarquía)
            if (currentLevel <= headerLevel) {
              endLineNum = lineNum - 1;
              console.log(`[FOLD CALC] Sección termina en línea ${endLineNum}`);
              break;
            }
            // Si es de menor jerarquía (más #), continuar incluyéndolo
          }
        }
      } catch (e) {
        endLineNum = lineNum - 1;
        break;
      }
    }
    
    // Verificar que hay contenido para plegar
    if (endLineNum <= startLineNum) {
      console.log(`[FOLD CALC] No hay contenido para plegar`);
      return null;
    }
    
    // Calcular posiciones exactas - incluir salto de línea después del header
    const foldStart = headerLine.to + 1; // Incluir el salto de línea después del header
    const lastLine = doc.line(endLineNum);
    const foldEnd = lastLine.to;
    
    console.log(`[FOLD CALC] Rango calculado: ${foldStart} -> ${foldEnd} (líneas ${startLineNum} -> ${endLineNum})`);
    
    return { from: foldStart, to: foldEnd };
  }, []);

  // Función para verificar si una línea está plegada usando la API nativa
  const isLineFolded = useCallback((view: EditorView, lineNumber: number): boolean => {
    const doc = view.state.doc;
    const line = doc.line(lineNumber + 1); // +1 porque lineNumber es 0-indexed
    
    // Usar foldedRanges para obtener los rangos plegados
    const folded = foldedRanges(view.state);
    let found = false;
    
    // Verificar si hay un rango plegado que comience justo después de esta línea
    folded.between(line.to, line.to + 1, (from: number, to: number) => {
      if (from === line.to + 1 || from === line.to) {
        found = true;
      }
    });
    
    return found;
  }, []);

  // Función para manejar el plegado/desplegado de headers
  const toggleHeaderFold = useCallback(async (headerLineNumber: number, level: number) => {
    if (!editorRef.current?.view) return;
    
    const editor = editorRef.current.view;
    const isFolded = isLineFolded(editor, headerLineNumber);
    
    console.log(`[TOGGLE] Clic en encabezado línea ${headerLineNumber} (nivel ${level}), isFolded: ${isFolded}`);
    
    try {
      if (isFolded) {
        // Desplegar: buscar el rango plegado que comience después de esta línea
        const folded = foldedRanges(editor.state);
        const doc = editor.state.doc;
        const headerLine = doc.line(headerLineNumber + 1);
        
        let foundRange = false;
        folded.between(headerLine.to, headerLine.to + 2, (from: number, to: number) => {
          if (from === headerLine.to + 1 || from === headerLine.to) {
            console.log(`[TOGGLE] Desplegando rango ${from} -> ${to}`);
            editor.dispatch({
              effects: unfoldEffect.of({ from, to })
            });
            foundRange = true;
          }
        });
        
        if (!foundRange) {
          console.log(`[TOGGLE] No se encontró rango plegado para desplegar`);
        }
      } else {
        // Plegar: calcular el rango y plegarlo
        const foldRange = calculateFoldRange(editor, headerLineNumber);
        if (foldRange && foldRange.from < foldRange.to) {
          console.log(`[TOGGLE] Plegando rango ${foldRange.from} -> ${foldRange.to}`);
          editor.dispatch({
            effects: foldEffect.of(foldRange)
          });
        } else {
          console.log(`[TOGGLE] No hay contenido válido para plegar`);
        }
      }
    } catch (error) {
      console.error('Error en plegado:', error);
    }
  }, [isLineFolded, calculateFoldRange]);

  // useEffect para manejar clicks en headers
  useEffect(() => {
    const setupClickHandler = () => {
      if (editorRef.current?.view) {
        const editor = editorRef.current.view;
        
        // Configurar event listeners para clicks en headers
        const handleClick = (event: MouseEvent) => {
          const target = event.target as HTMLElement;
          
          // Buscar la línea que contiene el header
          const line = target.closest('.cm-line');
          
          if (line) {
            // Verificar si es un header buscando el texto
            const lineText = line.textContent || '';
            const headerMatch = lineText.match(/^(#{1,6})\s+(.+)/);
            
            if (headerMatch) {
              // Método más robusto: usar coordenadas para encontrar la línea exacta
              const rect = line.getBoundingClientRect();
              const editorRect = editor.dom.getBoundingClientRect();
              const relativeY = rect.top - editorRect.top + editor.scrollDOM.scrollTop;
              
              // Usar posAtCoords para obtener la posición exacta en el documento
              const pos = editor.posAtCoords({ x: rect.left, y: rect.top });
              
              if (pos !== null) {
                const doc = editor.state.doc;
                const docLine = doc.lineAt(pos);
                const lineIndex = docLine.number - 1; // Convertir a 0-indexed
                
                // Verificar que realmente sea un header en el documento
                const docLineText = docLine.text;
                if (docLineText.match(/^#{1,6}\s/)) {
                  const level = docLineText.match(/^(#{1,6})\s/)?.[1].length || 0;
                  
                  event.preventDefault();
                  event.stopPropagation();
                  
                  console.log(`[CLICK] Header nivel ${level} en línea ${lineIndex}: "${docLineText}"`);
                  console.log(`[CLICK] Posición en documento: ${pos}`);
                  toggleHeaderFold(lineIndex, level);
                }
              } else {
                // Fallback al método anterior si posAtCoords falla
                const doc = editor.state.doc;
                const allLines = Array.from(editor.dom.querySelectorAll('.cm-line'));
                const lineIndex = allLines.indexOf(line as Element);
                
                if (lineIndex >= 0 && lineIndex < doc.lines) {
                  const level = headerMatch[1].length;
                  const docLine = doc.line(lineIndex + 1); // +1 porque doc.line es 1-indexed
                  
                  // Verificar que realmente sea un header en el documento
                  const docLineText = docLine.text;
                  if (docLineText.match(/^#{1,6}\s/)) {
                    event.preventDefault();
                    event.stopPropagation();
                    
                    console.log(`[CLICK FALLBACK] Header nivel ${level} en línea ${lineIndex}: "${headerMatch[2]}"`);
                    console.log(`[CLICK FALLBACK] Texto del documento: "${docLineText}"`);
                    toggleHeaderFold(lineIndex, level);
                  }
                }
              }
            }
          }
        };
        
        editor.dom.addEventListener('click', handleClick, true); // Usar capture para interceptar antes
        
        return () => {
          editor.dom.removeEventListener('click', handleClick, true);
        };
      }
    };

    // Configurar con un delay para asegurar que el DOM esté listo
    const timeout = setTimeout(setupClickHandler, 200);
    
    return () => {
      clearTimeout(timeout);
    };
  }, [toggleHeaderFold]); // Reconfigurar cuando cambie toggleHeaderFold

  // Widget para crear nota desde header
  class AddNoteWidget extends WidgetType {
    constructor(
      private lineNumber: number,
      private onCreateNote: (lineNumber: number) => void
    ) {
      super();
    }

    toDOM() {
      const span = document.createElement("span");
      span.className = "inline-add-note-btn";
      span.textContent = "+";
      span.style.cssText = `
        cursor: pointer;
        font-size: 14px;
        color: white;
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.4);
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: 8px;
        opacity: 0;
        transition: all 0.2s ease;
        vertical-align: top;
      `;
      
      span.onmouseenter = () => {
        span.style.background = "rgba(255, 255, 255, 0.3)";
      };
      
      span.onmouseleave = () => {
        span.style.background = "rgba(255, 255, 255, 0.2)";
      };
      
      span.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onCreateNote(this.lineNumber);
      };
      
      return span;
    }

    eq(other: AddNoteWidget) {
      return this.lineNumber === other.lineNumber;
    }
  }

  // Plugin para aplicar clases CSS a líneas de headers y añadir flechas de plegado
  const headerDecorationPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet = Decoration.none;
    private updateTimeout: NodeJS.Timeout | null = null;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        // Debounce las actualizaciones para evitar congelamiento
        if (this.updateTimeout) {
          clearTimeout(this.updateTimeout);
        }
        
        this.updateTimeout = setTimeout(() => {
          this.decorations = this.buildDecorations(update.view);
        }, 100); // Reducir frecuencia de actualizaciones
      }
    }

    buildDecorations(view: EditorView) {
      const decorations: any[] = [];
      const doc = view.state.doc;
      
      // Usar análisis directo del texto en lugar del árbol sintáctico
      // que puede estar desactualizado en documentos largos
      for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
        const line = doc.line(lineNum);
        const text = line.text;
        const headerMatch = text.match(/^(#{1,6})\s/);
        
        if (headerMatch) {
          const level = headerMatch[1].length;
          const hashSymbols = headerMatch[1];
          
          // Calcular indentación basada en jerarquía
          const indentLevel = Math.max(0, level - 1);
          const indentPixels = indentLevel * 16; // 16px por nivel
          
          // Decoración de línea para el color del header + indentación + clickeable
          decorations.push(
            Decoration.line({ 
              attributes: { 
                class: `cm-h${level} header-clickable`,
                style: `margin-left: ${indentPixels}px; cursor: pointer;`,
                'data-line': lineNum - 1, // 0-indexed para compatibilidad
                'data-level': level
              }
            }).range(line.from)
          );
          
          // Detectar estado de plegado usando la API nativa de CodeMirror
          const folded = foldedRanges(view.state);
          let isFolded = false;
          
          folded.between(line.from, line.to, (from: number, to: number) => {
            if (from >= line.from && from <= line.to) {
              isFolded = true;
            }
          });
        }
      }
      
      return Decoration.set(decorations);
    }
  }, {
    decorations: v => v.decorations
  });

  // Plugin especializado para hacer transparentes solo los símbolos #
  const hashSymbolPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet = Decoration.none;

    constructor(view: EditorView) {
      this.decorations = this.buildHashDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildHashDecorations(update.view);
      }
    }

    buildHashDecorations(view: EditorView) {
      const decorations: any[] = [];
      const doc = view.state.doc;
      
      // Iterar línea por línea buscando headers
      for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
        const line = doc.line(lineNum);
        const text = line.text;
        
        // Detectar headers solo cuando ya tienen espacio (header válido)
        const headerMatch = text.match(/^(#{1,6})\s/);
        if (headerMatch) {
          const hashSymbols = headerMatch[1];
          const hashStart = line.from;
          const hashEnd = line.from + hashSymbols.length;
          
          // Aplicar decoración solo a los símbolos #
          decorations.push(
            Decoration.mark({
              attributes: { 
                class: 'cm-header-hash',
                style: 'opacity: 0; transition: opacity 0.2s ease;'
              }
            }).range(hashStart, hashEnd)
          );
        }
      }
      
      return Decoration.set(decorations);
    }
  }, {
    decorations: v => v.decorations
  });

  // Plugin para renderizar colores de texto en tiempo real
  const colorTextPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet = Decoration.none;
    private colorUpdateTimeout: NodeJS.Timeout | null = null;

    constructor(view: EditorView) {
      this.decorations = this.buildColorDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        // Debounce las actualizaciones de colores para mejorar rendimiento
        if (this.colorUpdateTimeout) {
          clearTimeout(this.colorUpdateTimeout);
        }
        
        this.colorUpdateTimeout = setTimeout(() => {
          this.decorations = this.buildColorDecorations(update.view);
        }, 50); // Actualización más rápida para colores pero con debounce
      }
    }

    buildColorDecorations(view: EditorView) {
      const decorations: any[] = [];
      const doc = view.state.doc;
      const selection = view.state.selection.main;
      
      // Procesar todo el documento para evitar inconsistencias
      const fullText = doc.toString();
      
      // Buscar patrones de {#hex|texto} completos y válidos
      const colorRegex = /\{(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|[a-zA-Z]+)\|([^}]*)\}/g;
      let match;
      
      while ((match = colorRegex.exec(fullText)) !== null) {
        const fullMatch = match[0];
        const color = match[1];
        const innerText = match[2];
        const startPos = match.index;
        const endPos = startPos + fullMatch.length;
        const innerStart = startPos + fullMatch.indexOf('|') + 1;
        const innerEnd = innerStart + innerText.length;
        
        // Solo aplicar decoraciones si el patrón está completo y no hay cursor en los bordes
        const cursorInBorders = (selection.from >= startPos && selection.from <= innerStart) || 
                               (selection.to >= innerEnd && selection.to <= endPos);
        
        if (!cursorInBorders && innerText.length > 0) {
          // Marcadores de apertura {#color| - COMPLETAMENTE OCULTOS
          decorations.push(
            Decoration.mark({
              attributes: { 
                class: 'cm-color-tag-hidden',
                style: 'position: absolute; left: -9999px; opacity: 0 !important; width: 0 !important; height: 0 !important; overflow: hidden !important;'
              }
            }).range(startPos, innerStart)
          );
          
          // Texto coloreado
          decorations.push(
            Decoration.mark({
              attributes: { 
                style: `color: ${color} !important; font-weight: inherit;`
              }
            }).range(innerStart, innerEnd)
          );
          
          // Marcador de cierre } - COMPLETAMENTE OCULTO
          decorations.push(
            Decoration.mark({
              attributes: { 
                class: 'cm-color-tag-hidden',
                style: 'position: absolute; left: -9999px; opacity: 0 !important; width: 0 !important; height: 0 !important; overflow: hidden !important;'
              }
            }).range(innerEnd, endPos)
          );
        }
      }
      
      return Decoration.set(decorations);
    }
  }, {
    decorations: v => v.decorations
  });

  // Extension para detectar cuando se borra la última letra de texto coloreado y para auto-indentado de listas
  const colorKeymap = keymap.of([
    {
      key: "Backspace",
      run: (view) => {
        const handleRemoveColor = () => {
          if (!editorRef.current?.view) return;
          
          const editor = editorRef.current.view;
          const { from, to } = editor.state.selection.main;
          const doc = editor.state.doc;
          const text = doc.toString();
          
          // Buscar patrones de color que incluyan la selección
          const colorRegex = /\{(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|[a-zA-Z]+)\|([^}]*)\}/g;
          let match;
          
          while ((match = colorRegex.exec(text)) !== null) {
            const startPos = match.index;
            const endPos = startPos + match[0].length;
            const innerStart = startPos + match[0].indexOf('|') + 1;
            const innerEnd = innerStart + match[2].length;
            
            // Si la selección está dentro del texto coloreado
            if ((from >= innerStart && from <= innerEnd) || (to >= innerStart && to <= innerEnd)) {
              const innerText = match[2];
              
              editor.dispatch({
                changes: {
                  from: startPos,
                  to: endPos,
                  insert: innerText
                },
                selection: { anchor: startPos, head: startPos + innerText.length }
              });
              return;
            }
          }
        };


        const { from, to } = view.state.selection.main;
        if (from !== to) return false; // Si hay selección, comportamiento normal
        
        const doc = view.state.doc;
        const text = doc.toString();
        
        // Buscar si estamos dentro de un patrón de color
        const colorRegex = /\{(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|[a-zA-Z]+)\|([^}]*)\}/g;
        let match;
        
        while ((match = colorRegex.exec(text)) !== null) {
          const startPos = match.index;
          const endPos = startPos + match[0].length;
          const innerStart = startPos + match[0].indexOf('|') + 1;
          const innerEnd = innerStart + match[2].length;
          
          // Si el cursor está dentro del texto coloreado
          if (from > innerStart && from <= innerEnd) {
            const currentText = match[2];
            
            // Si solo queda 1 carácter y vamos a borrarlo, eliminar todo el patrón
            if (currentText.length === 1) {
              view.dispatch({
                changes: {
                  from: startPos,
                  to: endPos,
                  insert: ""
                },
                selection: { anchor: startPos }
              });
              return true;
            }
          }
        }
        
        return false; // Comportamiento normal de Backspace
      }
    },
    {
      key: "Delete",
      run: (view) => {
        const { from, to } = view.state.selection.main;
        if (from !== to) return false; // Si hay selección, comportamiento normal
        
        const doc = view.state.doc;
        const text = doc.toString();
        
        // Buscar si estamos dentro de un patrón de color
        const colorRegex = /\{(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|[a-zA-Z]+)\|([^}]*)\}/g;
        let match;
        
        while ((match = colorRegex.exec(text)) !== null) {
          const startPos = match.index;
          const endPos = startPos + match[0].length;
          const innerStart = startPos + match[0].indexOf('|') + 1;
          const innerEnd = innerStart + match[2].length;
          
          // Si el cursor está dentro del texto coloreado
          if (from >= innerStart && from < innerEnd) {
            const currentText = match[2];
            
            // Si solo queda 1 carácter y vamos a borrarlo, eliminar todo el patrón
            if (currentText.length === 1) {
              view.dispatch({
                changes: {
                  from: startPos,
                  to: endPos,
                  insert: ""
                },
                selection: { anchor: startPos }
              });
              return true;
            }
          }
        }
        
        return false; // Comportamiento normal de Delete
      }
    }
  ]);

  // Tema oscuro personalizado con tamaños de headers
  const customDarkTheme = EditorView.theme({
    '&': {
      color: '#abb2bf',
      backgroundColor: '#1e1e1e !important'
    },
    '.cm-content': {
      padding: '10px 20px 10px 40px',
      caretColor: '#528bff',
      backgroundColor: '#1e1e1e !important',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
      minHeight: 'calc(100vh - 200px)',
      height: 'auto'
    },
    '.cm-activeLine': {
      backgroundColor: 'transparent !important'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent !important'
    },
    // Asegurar que líneas vacías no tengan resaltado
    '.cm-line:empty': {
      backgroundColor: 'transparent !important'
    },
    '.cm-activeLine:empty': {
      backgroundColor: 'transparent !important'
    },
    '.cm-editor': {
      backgroundColor: '#1e1e1e !important'
    },
    '.cm-scroller': {
      backgroundColor: '#1e1e1e !important',
      scrollPaddingBottom: '20px',
      scrollBehavior: 'auto',
      overflowY: 'auto',
      overscrollBehavior: 'contain',
      height: 'auto',
      maxHeight: 'calc(100vh - 120px)'
    },
    '.cm-focused': {
      backgroundColor: '#1e1e1e !important'
    },
    // Hacer transparentes los símbolos # usando clase personalizada
    '.cm-header-hash': {
      opacity: '0 !important',
      transition: 'opacity 0.2s ease'
    },
    '.cm-line:hover .cm-header-hash': {
      opacity: '0.3 !important'
    },
    // Estilos para etiquetas de color - COMPLETAMENTE OCULTAS
    '.cm-color-tag-hidden': {
      position: 'absolute !important',
      left: '-9999px !important',
      top: '-9999px !important',
      display: 'inline !important',
      visibility: 'hidden !important',
      opacity: '0 !important',
      fontSize: '0 !important',
      width: '0 !important',
      height: '0 !important',
      overflow: 'hidden !important',
      pointerEvents: 'none !important'
    },
    '.cm-theme': {
      backgroundColor: '#1e1e1e !important'
    },
    // Números de línea pequeños y discretos
    '.cm-lineNumbers .cm-gutterElement': {
      fontSize: '0.75rem',
    },
    // Estilos para las flechas de plegado personalizadas
    '.header-fold-arrow': {
      transition: 'all 0.2s ease !important',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: '#528bff'
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: '#3e4451'
    },
    '.cm-selectionBackground': {
      backgroundColor: '#3e4451'
    },
    // Tamaños, colores y pesos de headers usando theme.ts
    '.cm-line.cm-h1': { fontSize: headerSizes.h1, fontWeight: headerWeights.h1, lineHeight: '1.25', color: headerColors.h1 },
    '.cm-line.cm-h2': { fontSize: headerSizes.h2, fontWeight: headerWeights.h2, lineHeight: '1.25', color: headerColors.h2 },
    '.cm-line.cm-h3': { fontSize: headerSizes.h3, fontWeight: headerWeights.h3, lineHeight: '1.25', color: headerColors.h3 },
    '.cm-line.cm-h4': { fontSize: headerSizes.h4, fontWeight: headerWeights.h4, lineHeight: '1.375', color: headerColors.h4 },
    '.cm-line.cm-h5': { fontSize: headerSizes.h5, fontWeight: headerWeights.h5, lineHeight: '1.375', color: headerColors.h5 },
    '.cm-line.cm-h6': { fontSize: headerSizes.h6, fontWeight: headerWeights.h6, lineHeight: '1.375', color: headerColors.h6 }
  }, { dark: true });

  // Estilo de sintaxis personalizado SIN headers (para evitar conflicto con headerDecorationPlugin)
  const customSyntaxHighlighting = HighlightStyle.define([
    // Otros elementos de sintaxis (copiados de oneDark)
    { tag: tags.keyword, color: '#c678dd' },
    { tag: tags.atom, color: '#d19a66' },
    { tag: tags.bool, color: '#d19a66' },
    { tag: tags.url, color: '#61afef' },
    { tag: tags.labelName, color: '#61afef' },
    { tag: tags.inserted, color: '#98c379' },
    { tag: tags.deleted, color: '#e06c75' },
    { tag: tags.literal, color: '#56b6c2' },
    { tag: tags.string, color: '#98c379' },
    { tag: tags.number, color: '#d19a66' },
    { tag: [tags.regexp, tags.escape, tags.special(tags.string)], color: '#e06c75' },
    { tag: tags.definition(tags.variableName), color: '#e06c75' },
    { tag: tags.local(tags.variableName), color: '#61afef' },
    { tag: tags.typeName, color: '#e5c07b' },
    { tag: tags.namespace, color: '#61afef' },
    { tag: tags.className, color: '#e5c07b' },
    { tag: tags.macroName, color: '#61afef' },
    { tag: tags.propertyName, color: '#56b6c2' },
    { tag: tags.operator, color: '#56b6c2' },
    { tag: tags.comment, color: '#5c6370', fontStyle: 'italic' },
    { tag: tags.meta, color: '#7f848e' },
    { tag: tags.invalid, color: '#ffffff', backgroundColor: '#e06c75' }
  ]);
  const [content, setContent] = useState(initialContent);
  const [currentNoteRef, setCurrentNoteRef] = useState(noteId);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
  const [currentWikilink, setCurrentWikilink] = useState("");
  const [editorHeight, setEditorHeight] = useState('auto');
  
  // Estados para flashcards automáticas
  const [pendingQuestion, setPendingQuestion] = useState<string>("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardCount, setFlashcardCount] = useState<number>(0);
  const [traditionalCount, setTraditionalCount] = useState<number>(0);
  const [multipleChoiceCount, setMultipleChoiceCount] = useState<number>(0);
  const [showFlashcardViewer, setShowFlashcardViewer] = useState(false);
  const [showStudyModeSelector, setShowStudyModeSelector] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [showEmojiDropdown, setShowEmojiDropdown] = useState(false);
  const [showStructureDropdown, setShowStructureDropdown] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpSection, setHelpSection] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const outlineButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  
  // Control de cambio de nota
  useEffect(() => {
    if (noteId !== currentNoteRef) {
      setCurrentNoteRef(noteId);
      setContent(initialContent);
      setPendingQuestion("");
      setFlashcards([]);
      setFlashcardCount(0);
      setTraditionalCount(0);
      setMultipleChoiceCount(0);
      loadFlashcardCount();
      loadNoteStatus();
    }
  }, [noteId, initialContent]);

  // Check if user is admin and load note status
  const checkIfUserIsAdmin = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('id')
        .eq('created_by', userId)
        .limit(1);
      
      if (error) return false;
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  };

  const loadNoteStatus = async () => {
    if (!noteId || !userId) return;
    
    try {
      // Check admin status
      const adminCheck = await checkIfUserIsAdmin(userId);
      setIsAdmin(adminCheck);
      
      // Load note public status
      const { data, error } = await supabase
        .from('notes')
        .select('is_public')
        .eq('id', noteId)
        .single();
      
      if (!error && data) {
        setIsPublic(data.is_public || false);
      }
    } catch (error) {
      console.error('Error loading note status:', error);
    }
  };

  const togglePublicStatus = async () => {
    if (!noteId || !isAdmin) return;
    
    try {
      const newPublicStatus = !isPublic;
      
      const { error } = await supabase
        .from('notes')
        .update({ is_public: newPublicStatus })
        .eq('id', noteId);
      
      if (!error) {
        setIsPublic(newPublicStatus);
      } else {
        console.error('Error updating note public status:', error);
      }
    } catch (error) {
      console.error('Error toggling public status:', error);
    }
  };
  
  const editorRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  // Cargar contador de flashcards al inicializar
  useEffect(() => {
    if (noteId) {
      loadFlashcardCount();
    }
  }, [noteId]);

  const loadFlashcardCount = async () => {
    if (!noteId) return;
    try {
      const counts = await countFlashcardsByType(noteId);
      setFlashcardCount(counts.total);
      setTraditionalCount(counts.traditional);
      setMultipleChoiceCount(counts.multipleChoice);
    } catch (error) {
      console.error("Error cargando contador de flashcards:", error);
    }
  };

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (newContent: string, targetNoteId: string) => {
      // Solo guardar si es la nota actual y el contenido cambió
      if (!targetNoteId || targetNoteId !== currentNoteRef) return;
      if (newContent === initialContent) return;
      
      setSaving(true);
      try {
        await onSave(newContent);
        setLastSaved(new Date());
      } catch (error) {
        console.error("Error saving note:", error);
      } finally {
        setSaving(false);
      }
    }, 1000),
    [onSave, initialContent, currentNoteRef]
  );

  // Auto-save when content changes
  useEffect(() => {
    if (content !== initialContent && noteId && noteId === currentNoteRef) {
      debouncedSave(content, noteId);
    }
  }, [content, debouncedSave, initialContent, noteId, currentNoteRef]);

  // Ajustar altura del editor dinámicamente basado en el contenido
  useEffect(() => {
    const updateEditorHeight = () => {
      const view = editorRef.current?.view;
      if (!view) return;

      const doc = view.state.doc;
      const lineCount = doc.lines;
      const hasContent = content.trim().length > 0;
      
      if (!hasContent) {
        // Nota vacía: altura mínima para mostrar el área de escritura
        setEditorHeight('calc(100vh - 200px)');
      } else {
        // Con contenido: altura basada en líneas + margen pequeño
        const estimatedHeight = Math.max(lineCount * 24 + 100, 300); // 24px por línea + padding
        const maxHeight = window.innerHeight - 200;
        setEditorHeight(`${Math.min(estimatedHeight, maxHeight)}px`);
      }
    };

    updateEditorHeight();
    
    // Actualizar cuando cambie el contenido
    const timeoutId = setTimeout(updateEditorHeight, 100);
    return () => clearTimeout(timeoutId);
  }, [content]);

  // Debounced search for wikilink suggestions
  const debouncedSearch = useCallback(
    debounce(async (searchTerm: string) => {
      if (!userId || !searchTerm.trim()) {
        setSuggestions([]);
        return;
      }

      const { data } = await supabase
        .from("notes")
        .select("id, title")
        .eq("owner_id", userId)
        .ilike("title", `%${searchTerm}%`)
        .limit(5);

      setSuggestions(data || []);
    }, 300),
    [userId]
  );

  // Extract title from first line if it's a heading
  useEffect(() => {
    if (onTitleChange && noteId === currentNoteRef) {
      const lines = content.split('\n');
      const firstLine = lines[0]?.trim();
      if (firstLine?.startsWith('# ')) {
        onTitleChange(firstLine.slice(2).trim());
      }
    }
  }, [content, onTitleChange, noteId, currentNoteRef]);

  // useEffect de flashcards eliminado

  const handleChange = useCallback((value: string, viewUpdate?: any) => {
    // Solo actualizar si realmente cambió y es para la nota actual
    if (value !== content) {
      setContent(value);
    }
    
    // Detectar wikilinks mientras se escribe
    if (viewUpdate && userId && noteId) {
      const cursor = viewUpdate.state.selection.main.head;
      const text = value;
      
      // Buscar si estamos dentro de un wikilink [[...
      const beforeCursor = text.slice(0, cursor);
      const afterCursor = text.slice(cursor);
      
      const wikilinkMatch = beforeCursor.match(/\[\[([^\]]*?)$/);
      if (wikilinkMatch) {
        const partialText = wikilinkMatch[1];
        setCurrentWikilink(partialText);
        setShowSuggestions(true);
        
        // Calcular posición precisa para el popup usando coordsAtPos
        const view = viewUpdate.view;
        if (view) {
          try {
            const coords = view.coordsAtPos(cursor);
            if (coords) {
              // Obtener el rect del contenedor del editor para coordenadas absolutas
              const editorRect = view.dom.getBoundingClientRect();
              setSuggestionPosition({
                top: coords.bottom + 4, // Justo debajo del cursor con pequeño margen
                left: coords.left
              });
            } else {
              // Fallback al método anterior si coordsAtPos falla
              const editorElement = editorRef.current?.view?.dom;
              if (editorElement) {
                const rect = editorElement.getBoundingClientRect();
                setSuggestionPosition({
                  top: rect.top + 100,
                  left: rect.left + 20
                });
              }
            }
          } catch (error) {
            // Fallback silencioso en caso de error
            const editorElement = editorRef.current?.view?.dom;
            if (editorElement) {
              const rect = editorElement.getBoundingClientRect();
              setSuggestionPosition({
                top: rect.top + 100,
                left: rect.left + 20
              });
            }
          }
        }
        
        debouncedSearch(partialText);
      } else {
        setShowSuggestions(false);
        setCurrentWikilink("");
      }
    }
  }, [content, userId, debouncedSearch, noteId]);

  const handleSuggestionSelect = useCallback((noteTitle: string) => {
    console.log("=== SUGGESTION SELECT START ===");
    console.log("Note title:", noteTitle);
    
    const view = editorRef.current?.view;
    if (!view) {
      console.log("ERROR: No view available");
      return;
    }

    const state = view.state;
    const { from } = state.selection.main;
    const doc = state.doc;
    const line = doc.lineAt(from);
    const lineText = line.text;
    const posInLine = from - line.from;
    
    console.log("Line text:", lineText);
    console.log("Position in line:", posInLine);
    console.log("Full cursor position:", from);
    
    // Buscar [[texto]] en la línea actual
    const beforeCursor = lineText.slice(0, posInLine);
    console.log("Before cursor in line:", beforeCursor);
    
    const wikilinkMatch = beforeCursor.match(/\[\[([^\]]*?)$/);
    console.log("Wikilink match:", wikilinkMatch);
    
    if (wikilinkMatch) {
      const matchStartInLine = posInLine - wikilinkMatch[0].length;
      const matchStart = line.from + matchStartInLine;
      
      // Buscar si hay ]] después del cursor para evitar duplicados
      const afterCursor = lineText.slice(posInLine);
      const hasClosingBrackets = afterCursor.startsWith(']]');
      
      const replacement = `[[${noteTitle}]]`;
      const endPos = hasClosingBrackets ? from + 2 : from; // Si ya hay ]], incluirlos en el reemplazo
      
      console.log("Match start in doc:", matchStart);
      console.log("Match end in doc:", endPos);
      console.log("Has closing brackets:", hasClosingBrackets);
      console.log("Replacement text:", replacement);
      
      // Aplicar cambio
      const transaction = view.state.update({
        changes: {
          from: matchStart,
          to: endPos,
          insert: replacement
        },
        selection: { anchor: matchStart + replacement.length }
      });
      
      view.dispatch(transaction);
      console.log("Transaction dispatched successfully");
      
      // Forzar actualización del estado
      setTimeout(() => {
        const newContent = view.state.doc.toString();
        console.log("New editor content:", newContent);
        setContent(newContent);
      }, 50);
    } else {
      console.log("ERROR: No wikilink pattern found");
    }
    
    setShowSuggestions(false);
    setCurrentWikilink("");
    console.log("=== SUGGESTION SELECT END ===");
  }, []);

  const handleSuggestionsClose = useCallback(() => {
    setShowSuggestions(false);
    setCurrentWikilink("");
  }, []);

  const handleRemoveColor = () => {
    const view = editorRef.current?.view;
    if (!view) return;

    const { state } = view;
    const { from, to } = state.selection.main;

    // Regex para encontrar el bloque de color completo
    const colorBlockRegex = /{#([a-fA-F0-9#]{3,7})\|(.*?)}/g;
    const docText = state.doc.toString();

    let match;
    while ((match = colorBlockRegex.exec(docText)) !== null) {
      const matchFrom = match.index;
      const matchTo = match.index + match[0].length;

      // Comprobar si la selección del usuario está dentro de este bloque de color
      if (from >= matchFrom && to <= matchTo) {
        const textContent = match[2]; // El texto dentro del bloque
        
        view.dispatch({
          changes: {
            from: matchFrom,
            to: matchTo,
            insert: textContent,
          },
          selection: { anchor: matchFrom, head: matchFrom + textContent.length },
          scrollIntoView: true,
        });
        return; // Salir después de encontrar y procesar el bloque
      }
    }
  };

  const handleToolbarInsert = useCallback((prefix: string, suffix = '', wrapSelection = false) => {
    const view = editorRef.current?.view;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const currentContent = view.state.doc.toString();
    const selectedText = currentContent.slice(from, to);
    
    let insertText = "";
    let newCursorPos = from;
    
    if (wrapSelection && selectedText) {
      // Envolver texto seleccionado
      insertText = prefix + selectedText + suffix;
      newCursorPos = from + insertText.length;
    } else if (selectedText && !wrapSelection) {
      // Para títulos y prefijos (H1, H2, listas, citas)
      insertText = prefix + selectedText + suffix;
      newCursorPos = from + insertText.length;
    } else {
      // Sin selección, insertar template
      insertText = prefix + suffix;
      newCursorPos = from + prefix.length;
    }
    
    const newContent = 
      currentContent.slice(0, from) + 
      insertText + 
      currentContent.slice(to);
    
    setContent(newContent);
    
    // Actualizar cursor después de que React actualice SIN scroll automático
    setTimeout(() => {
      if (view) {
        const scrollTop = view.scrollDOM.scrollTop; // Guardar posición actual
        view.dispatch({
          selection: { anchor: newCursorPos, head: newCursorPos }
        });
        view.scrollDOM.scrollTop = scrollTop; // Restaurar posición
        view.focus();
      }
    }, 10);
  }, []);

  const handleColorInsert = useCallback((color: string) => {
    const view = editorRef.current?.view;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const currentContent = view.state.doc.toString();
    
    const scrollTop = view.scrollDOM.scrollTop;

    // Regex para encontrar todos los bloques de color
    const colorRegex = /\{(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|[a-zA-Z]+)\|([^}]*)\}/g;
    let match;
    let replaced = false;

    // Iterar sobre todos los bloques de color para ver si la selección está dentro de uno
    while ((match = colorRegex.exec(currentContent)) !== null) {
      const startPos = match.index;
      const endPos = startPos + match[0].length;

      // Si la selección está dentro de un bloque de color existente
      if (from >= startPos && to <= endPos) {
        const innerText = match[2];
        const newColoredText = `{${color}|${innerText}}`;
        
        const newContent = 
          currentContent.slice(0, startPos) + 
          newColoredText + 
          currentContent.slice(endPos);

        setContent(newContent);
        setTimeout(() => {
          if (view) {
            view.dispatch({
              selection: { anchor: startPos + newColoredText.length }
            });
            view.scrollDOM.scrollTop = scrollTop;
            view.focus();
          }
        }, 10);
        
        replaced = true;
        break; // Salir del bucle una vez que se ha reemplazado
      }
    }

    if (replaced) return;

    // --- Comportamiento original si no se está dentro de un bloque de color ---
    const selectedText = currentContent.slice(from, to);
    
    if (!selectedText) {
      const template = `{${color}|texto}`;
      const newContent = 
        currentContent.slice(0, from) + 
        template + 
        currentContent.slice(to);
      
      setContent(newContent);
      setTimeout(() => {
        if (view) {
          const templateStart = from + `{${color}|`.length;
          const templateEnd = templateStart + 'texto'.length;
          view.dispatch({
            selection: { anchor: templateStart, head: templateEnd }
          });
          view.scrollDOM.scrollTop = scrollTop;
          view.focus();
        }
      }, 10);
    } else {
      const wrappedText = `{${color}|${selectedText}}`;
      const newContent = 
        currentContent.slice(0, from) + 
        wrappedText + 
        currentContent.slice(to);
      
      setContent(newContent);
      setTimeout(() => {
        if (view) {
          view.dispatch({
            selection: { anchor: from + wrappedText.length }
          });
          view.scrollDOM.scrollTop = scrollTop;
          view.focus();
        }
      }, 10);
    }
  }, []);

  const handleNavigateToLine = useCallback((line: number) => {
    const view = editorRef.current?.view;
    if (!view) return;

    const doc = view.state.doc;
    const lineObj = doc.line(Math.min(line, doc.lines));
    const pos = lineObj.from;

    view.dispatch({
      selection: { anchor: pos, head: pos },
      effects: EditorView.scrollIntoView(pos, { y: "center" })
    });
    view.focus();
  }, []);

  const handleWikiLinkClick = useCallback(async (noteTitle: string) => {
    console.log("=== WIKILINK NAVIGATION START ===");
    console.log("Note title:", noteTitle);
    console.log("User ID:", userId);
    console.log("Router:", router);
    
    if (!userId) {
      console.log("ERROR: No userId available");
      return;
    }

    try {
      console.log("Searching for note with title:", noteTitle);
      const { data: targetNote, error: searchError } = await supabase
        .from("notes")
        .select("id, title")
        .eq("owner_id", userId)
        .ilike("title", noteTitle)
        .limit(1)
        .single();

      console.log("Search result:", { targetNote, searchError });

      if (targetNote) {
        console.log("Found existing note, navigating to:", `/notes/${targetNote.id}?view=preview`);
        router.push(`/notes/${targetNote.id}?view=preview`);
      } else {
        console.log("Note not found, creating new note...");
        const { data: newNote, error: createError } = await supabase
          .from("notes")
          .insert({
            title: noteTitle,
            content_md: `# ${noteTitle}\n\nNueva nota creada desde wikilink.`,
            owner_id: userId,
            folder_id: currentFolderId || null,
            sort_order: 0
          })
          .select()
          .single();

        console.log("Create result:", { newNote, createError });

        if (newNote) {
          console.log("Created new note, navigating to:", `/notes/${newNote.id}?view=preview`);
          // Refrescar FileExplorer
          if (onNoteCreated) {
            onNoteCreated();
          }
          router.push(`/notes/${newNote.id}?view=preview`);
        } else {
          console.log("ERROR: Failed to create note:", createError);
        }
      }
    } catch (error) {
      console.error("ERROR in wikilink navigation:", error);
    }
    
    console.log("=== WIKILINK NAVIGATION END ===");
  }, [userId, router]);

  // Función de guardado de flashcards eliminada

  // Funciones para flashcards automáticas
  const handleCreateFlashcard = async (question: string, answer: string) => {
    if (!noteId || !noteTitle) return;

    try {
      const deckId = await getOrCreateDeckForNote(noteId, noteTitle);
      if (!deckId) return;

      const flashcard: Flashcard = { front: question, back: answer };
      const success = await saveFlashcard(flashcard, deckId);
      
      if (success) {
        setFlashcards(prev => [...prev, flashcard]);
        await loadFlashcardCount();
        console.log("✅ Flashcard guardada automáticamente");
      }
    } catch (error) {
      console.error("Error creando flashcard:", error);
    }
  };

  const getSelectedText = (): string => {
    const view = editorRef.current?.view;
    if (!view) return "";

    const { from, to } = view.state.selection.main;
    return view.state.doc.slice(from, to).toString();
  };

  const handleEmojiInsert = (emoji: string) => {
    if (!editorRef.current?.view) return;
    
    const editor = editorRef.current.view;
    const { from, to } = editor.state.selection.main;
    
    editor.dispatch({
      changes: {
        from,
        to,
        insert: emoji
      },
      selection: { anchor: from + emoji.length }
    });
  };

  const handleStructureInsert = (structure: string) => {
    if (!editorRef.current?.view) return;
    
    const editor = editorRef.current.view;
    const { from, to } = editor.state.selection.main;
    
    editor.dispatch({
      changes: {
        from,
        to,
        insert: structure
      },
      selection: { anchor: from + structure.length }
    });
  };

  // Manejadores de teclado para Alt+Q y Alt+A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'q') {
        e.preventDefault();
        const selectedText = getSelectedText();
        if (selectedText.trim()) {
          setPendingQuestion(selectedText.trim());
          console.log("⏳ Pregunta guardada:", selectedText.trim());
        }
      } else if (e.altKey && e.key === 'a') {
        e.preventDefault();
        const selectedText = getSelectedText();
        if (selectedText.trim() && pendingQuestion) {
          handleCreateFlashcard(pendingQuestion, selectedText.trim());
          setPendingQuestion("");
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [pendingQuestion, noteId, noteTitle]);

  // Scroll sincronizado mejorado con debounce
  useEffect(() => {
    const editorEl = editorContainerRef.current?.querySelector('.cm-scroller');
    const previewEl = previewContainerRef.current;

    if (!isSplitView || !editorEl || !previewEl) return;

    let editorScrollTimeout: NodeJS.Timeout | null = null;
    let previewScrollTimeout: NodeJS.Timeout | null = null;
    let isEditorScrolling = false;
    let isPreviewScrolling = false;

    const handleEditorScroll = () => {
      if (isPreviewScrolling) return;
      
      isEditorScrolling = true;
      
      if (editorScrollTimeout) {
        clearTimeout(editorScrollTimeout);
      }
      
      editorScrollTimeout = setTimeout(() => {
        if (editorEl && previewEl && editorEl.scrollHeight > editorEl.clientHeight) {
          const percentage = editorEl.scrollTop / (editorEl.scrollHeight - editorEl.clientHeight);
          const targetScrollTop = percentage * (previewEl.scrollHeight - previewEl.clientHeight);
          
          if (isFinite(targetScrollTop) && targetScrollTop >= 0) {
            previewEl.scrollTop = targetScrollTop;
          }
        }
        isEditorScrolling = false;
      }, 16); // ~60fps
    };

    const handlePreviewScroll = () => {
      if (isEditorScrolling) return;
      
      isPreviewScrolling = true;
      
      if (previewScrollTimeout) {
        clearTimeout(previewScrollTimeout);
      }
      
      previewScrollTimeout = setTimeout(() => {
        if (editorEl && previewEl && previewEl.scrollHeight > previewEl.clientHeight) {
          const percentage = previewEl.scrollTop / (previewEl.scrollHeight - previewEl.clientHeight);
          const targetScrollTop = percentage * (editorEl.scrollHeight - editorEl.clientHeight);
          
          if (isFinite(targetScrollTop) && targetScrollTop >= 0) {
            editorEl.scrollTop = targetScrollTop;
          }
        }
        isPreviewScrolling = false;
      }, 16); // ~60fps
    };

    editorEl.addEventListener('scroll', handleEditorScroll, { passive: true });
    previewEl.addEventListener('scroll', handlePreviewScroll, { passive: true });

    return () => {
      if (editorScrollTimeout) clearTimeout(editorScrollTimeout);
      if (previewScrollTimeout) clearTimeout(previewScrollTimeout);
      editorEl.removeEventListener('scroll', handleEditorScroll);
      previewEl.removeEventListener('scroll', handlePreviewScroll);
    };
  }, [isSplitView]);

  return (
    <div className="h-full flex flex-col">
      {/* Markdown Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-800/50" style={{backgroundColor: '#0a0a0a'}}>
        {/* Flecha para mostrar sidebar cuando está colapsado */}
        {isSidebarCollapsed && !isFocusMode && !isSplitView && viewMode !== "preview" && onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="w-7 h-7 text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex items-center justify-center mr-1"
            title="Mostrar explorador"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        )}
        
        {/* Separador después de la flecha del sidebar */}
        {isSidebarCollapsed && !isFocusMode && !isSplitView && viewMode !== "preview" && onToggleSidebar && (
          <div className="w-px h-4 bg-gray-600/50 mx-1"></div>
        )}
        
        {/* Botones de formato agrupados */}
        <button 
          title="Negrita" 
          onClick={() => handleToolbarInsert('**', '**', true)}
          className="w-7 h-7 text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors font-bold flex items-center justify-center"
        >
          B
        </button>
        <button 
          title="Cursiva" 
          onClick={() => handleToolbarInsert('*', '*', true)}
          className="w-7 h-7 text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors italic flex items-center justify-center"
        >
          I
        </button>
        <button 
          title="Código inline" 
          onClick={() => handleToolbarInsert('`', '`', true)}
          className="w-7 h-7 text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors font-mono flex items-center justify-center"
        >
          &lt;/&gt;
        </button>
        <button 
          title="Bloque de código" 
          onClick={() => handleToolbarInsert('```\n', '\n```', false)}
          className="w-8 h-7 text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors font-mono flex items-center justify-center"
        >
          ```
        </button>
        <button 
          title="Lista" 
          onClick={() => handleToolbarInsert('- ', '', false)}
          className="w-7 h-7 text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex items-center justify-center"
        >
          •
        </button>
        <button 
          title="Lista numerada" 
          onClick={() => handleToolbarInsert('1. ', '', false)}
          className="w-7 h-7 text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex items-center justify-center"
        >
          1.
        </button>
        <button 
          title="Cita" 
          onClick={() => handleToolbarInsert('> ', '', false)}
          className="w-7 h-7 text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex items-center justify-center"
        >
          ❝
        </button>
        <button 
          title="Enlace" 
          onClick={() => handleToolbarInsert('[', '](url)', true)}
          className="w-7 h-7 text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex items-center justify-center"
        >
          🔗
        </button>

        {/* Botón de ayuda */}
        <button
          onClick={() => {
            setShowHelp(true);
            setHelpSection(null);
          }}
          title="Guía de ayuda"
          className="w-7 h-7 text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex items-center justify-center"
        >
          ❓
        </button>
        
        {/* Separador */}
        <div className="w-px h-4 bg-gray-600/50 mx-1"></div>
        
        {/* Botones de colores */}
        <button 
          title="Texto rojo" 
          onClick={() => handleColorInsert('#ef4444')}
          className="w-6 h-6 rounded border border-gray-600 hover:border-gray-400 transition-colors"
          style={{backgroundColor: '#ef4444'}}
        ></button>
        <button 
          title="Texto azul" 
          onClick={() => handleColorInsert('#3b82f6')}
          className="w-6 h-6 rounded border border-gray-600 hover:border-gray-400 transition-colors"
          style={{backgroundColor: '#3b82f6'}}
        ></button>
        <button 
          title="Texto verde" 
          onClick={() => handleColorInsert('#22c55e')}
          className="w-6 h-6 rounded border border-gray-600 hover:border-gray-400 transition-colors"
          style={{backgroundColor: '#22c55e'}}
        ></button>
        <button 
          title="Texto amarillo" 
          onClick={() => handleColorInsert('#eab308')}
          className="w-6 h-6 rounded border border-gray-600 hover:border-gray-400 transition-colors"
          style={{backgroundColor: '#eab308'}}
        ></button>
        <button 
          title="Texto naranja" 
          onClick={() => handleColorInsert('#f97316')}
          className="w-6 h-6 rounded border border-gray-600 hover:border-gray-400 transition-colors"
          style={{backgroundColor: '#f97316'}}
        ></button>
        <button 
          title="Texto morado" 
          onClick={() => handleColorInsert('#a855f7')}
          className="w-6 h-6 rounded border border-gray-600 hover:border-gray-400 transition-colors"
          style={{backgroundColor: '#a855f7'}}
        ></button>

        <button
          title="Quitar color"
          onClick={handleRemoveColor}
          className="w-6 h-6 rounded border border-gray-600 hover:border-gray-400 transition-colors flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><line x1="2" x2="22" y1="12" y2="12"/></svg>
        </button>

        {/* Separador entre formato y controles (ajustado tras eliminar emojis/estructuras) */}
        <div className="w-px h-4 bg-gray-600/50 mx-2"></div>
        
        {/* Botones de control */}
        <div className="flex items-center gap-1">
          {/* Botón de esquema */}
          <button
            ref={outlineButtonRef}
            onClick={() => setShowOutline(!showOutline)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              showOutline 
                ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
            }`}
            title="Esquema"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" className="text-current">
              <path fill="currentColor" d="M3 9h14V7H3v2zm0 4h14v-2H3v2zm0 4h14v-2H3v2zm16 0h2v-2h-2v2zm0-10v2h2V7h-2zm0 6h2v-2h-2v2z"/>
            </svg>
          </button>

          {/* Botón de vista dividida */}
          <button
            onClick={() => onToggleSplitView && onToggleSplitView()}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              isSplitView 
                ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
            }`}
            title="Vista dividida"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2"/>
              <path d="M12 3v18"/>
            </svg>
          </button>

          {/* Botón de modo foco */}
          <button
            onClick={() => onToggleFocusMode && onToggleFocusMode()}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              isFocusMode 
                ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
            }`}
            title={isFocusMode ? "Salir del Modo Foco" : "Modo Foco"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isFocusMode ? (
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              ) : (
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              )}
            </svg>
          </button>


          {/* Botón de vista previa */}
          {onViewModeChange && (
            <button
              onClick={() => onViewModeChange(viewMode === "edit" ? "preview" : "edit")}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewMode === "preview" 
                  ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
              }`}
              title={viewMode === "edit" ? "Modo Estudio" : "Editar"}
            >
              {viewMode === "edit" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" className="text-current">
                  <path fill="currentColor" d="m20.942 4.278c-.044-.081-.114-.142-.179-.203-2.59-1.601-5.516-2.634-8.695-3.069-.045-.006-.091-.006-.136 0-3.179.436-6.104 1.469-8.695 3.069-.147.092-.237.253-.237.426s.09.334.237.426c1.264.781 2.611 1.422 4.025 1.93-.173.602-.262 1.303-.262 2.145 0 3.505 1.495 5 5 5s5-1.495 5-5c0-.841-.09-1.543-.262-2.145 1.139-.409 2.22-.927 3.262-1.513v5.158c0 .276.224.5.5.5s.5-.224.5-.5v-6.002c0-.081-.024-.155-.058-.222zm-4.942 4.722c0 2.953-1.047 4-4 4s-4-1.047-4-4c0-.739.074-1.344.218-1.851 1.197.37 2.429.669 3.715.846.045.006.091.006.136 0 1.286-.176 2.518-.476 3.715-.846.143.506.217 1.111.217 1.851zm-4-2.005c-2.722-.381-5.246-1.219-7.516-2.495 2.271-1.276 4.794-2.114 7.516-2.495 2.722.381 5.246 1.219 7.516 2.495-2.271 1.276-4.794 2.114-7.516 2.495zm8.999 15.466c.021.275-.184.516-.459.537-.014 0-.027.002-.04.002-.258 0-.477-.198-.498-.461-.246-3.11-1.351-4.93-3.566-5.839-1.99 3.104-4.118 4.2-4.211 4.246-.142.072-.309.072-.449 0-.093-.046-2.221-1.143-4.211-4.246-2.215.909-3.32 2.729-3.566 5.839-.022.276-.254.482-.538.459-.275-.021-.48-.263-.459-.537.292-3.681 1.755-5.855 4.606-6.846.224-.076.469.012.591.213 1.528 2.515 3.205 3.719 3.801 4.093.597-.374 2.273-1.578 3.801-4.093.123-.201.368-.289.591-.213 2.852.99 4.315 3.166 4.606 6.846z"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" className="text-current">
                  <path fill="currentColor" d="M22.994,5.195c-.011-.067-.277-1.662-1.378-2.774-1.111-1.09-2.712-1.355-2.779-1.366-.119-.021-.239,.005-.342,.068-.122,.075-3.047,1.913-9.049,7.886C3.12,15.305,1.482,17.791,1.415,17.894c-.045,.07-.073,.15-.079,.233l-.334,4.285c-.011,.146,.042,.289,.145,.393,.094,.094,.221,.146,.354,.146,.013,0,.026,0,.039-.001l4.306-.333c.083-.006,.162-.033,.232-.078,.103-.066,2.6-1.697,8.924-7.991,6.002-5.974,7.848-8.886,7.923-9.007,.064-.103,.089-.225,.07-.344ZM14.295,13.838c-5.54,5.514-8.14,7.427-8.661,7.792l-3.59,.278,.278-3.569c.368-.521,2.292-3.109,7.828-8.619,1.773-1.764,3.278-3.166,4.518-4.264,.484,.112,1.721,.468,2.595,1.326,.868,.851,1.23,2.046,1.346,2.526-1.108,1.24-2.525,2.75-4.314,4.531Zm5.095-5.419c-.236-.681-.669-1.608-1.427-2.352-.757-.742-1.703-1.166-2.396-1.397,1.807-1.549,2.902-2.326,3.292-2.59,.396,.092,1.362,.375,2.05,1.049,.675,.682,.963,1.645,1.058,2.042-.265,.388-1.039,1.469-2.577,3.247Z"/>
                </svg>
              )}
            </button>
          )}

          {/* Separador */}
          <div className="w-px h-4 bg-gray-600/50 mx-1"></div>

          {/* Información de flashcards */}
          <span
            className="flex items-center justify-center gap-1 text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded cursor-pointer hover:bg-blue-800/40 transition-colors"
            onClick={() => setShowFlashcardViewer(true)}
            title="Ver flashcards"
          >
            <span>📚</span>
            <span>{flashcardCount}</span>
          </span>
          <button
            onClick={() => flashcardCount > 0 && setShowStudyModeSelector(true)}
            title="Estudiar flashcards"
            disabled={flashcardCount === 0}
            className="px-2 py-1 text-xs bg-green-700 hover:bg-green-600 text-white rounded transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Estudiar
          </button>
          <div className="w-px h-4 bg-gray-600/50 mx-1"></div>


          {/* Información de palabras */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{content.trim() ? content.trim().split(/\s+/).length.toLocaleString() : 0}</span>
            <span className="text-gray-600">palabras</span>
            <span className="text-gray-600">·</span>
            <span>{content.length.toLocaleString()}</span>
            <span className="text-gray-600">caracteres</span>
          </div>
        </div>
      </div>

      {/* Editor or Preview */}
      <div className="flex-1 overflow-hidden relative flex bg-[#1e1e1e]" ref={editorContainerRef}>
        {isSplitView ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            width: '100%', 
            height: '100%',
            gap: '0px'
          }} className="split-view">
            <div style={{ 
              backgroundColor: '#1e1e1e', 
              overflow: 'auto',
              minWidth: 0,
              maxWidth: '100%'
            }}>
              <div className="px-6 h-full">
                <CodeMirror
                  ref={editorRef}
                  value={content}
                  onChange={handleChange}
                  className="h-full text-base"
                  style={{ backgroundColor: '#1e1e1e', height: '100%', width: '100%' }}
                  extensions={[
                    markdown(),
                    syntaxHighlighting(customSyntaxHighlighting),
                    customDarkTheme,
                    lineNumbers(),
                    headerDecorationPlugin,
                    hashSymbolPlugin,
                    colorTextPlugin,
                    colorKeymap,
                    codeFolding({
                      placeholderText: "...",
                      placeholderDOM: () => {
                        const span = document.createElement("span");
                        span.textContent = "...";
                        span.style.cssText = `
                          color: #666;
                          font-style: italic;
                          background: transparent;
                          border: none;
                          padding: 0;
                          margin: 0;
                        `;
                        return span;
                      }
                    })
                  ]}
                  basicSetup={{
                    lineNumbers: false,
                    foldGutter: false,
                    dropCursor: false,
                    allowMultipleSelections: false,
                    indentOnInput: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                    highlightSelectionMatches: false,
                    searchKeymap: true,
                  }}
                />
                {showSuggestions && (
                  <WikilinkSuggestions
                    suggestions={suggestions}
                    position={suggestionPosition}
                    onSelect={handleSuggestionSelect}
                    onClose={handleSuggestionsClose}
                  />
                )}
              </div>
            </div>
            <div style={{ 
              overflow: 'auto', 
              borderLeft: '1px solid #374151',
              minWidth: 0,
              maxWidth: '100%'
            }} ref={previewContainerRef}>
              <div className="px-6 py-4">
                <NotePreview content={content} onWikiLinkClick={handleWikiLinkClick} studyMode={true} noteId={noteId} userId={userId} />
              </div>
            </div>
          </div>
        ) : viewMode === "edit" ? (
          <div className="w-full h-full single-view" style={{ backgroundColor: '#1e1e1e', overflow: 'hidden' }}>
            <div className="max-w-5xl mx-auto px-6 h-full" style={{ overflow: 'auto' }}>
              <CodeMirror
                ref={editorRef}
                value={content}
                onChange={handleChange}
                className="h-full w-full text-base"
                style={{ backgroundColor: '#1e1e1e', height: editorHeight }}
                extensions={[
                  lineNumbers(),
                  markdown(),
                  EditorView.lineWrapping,
                  codeFolding({
                    placeholderText: "...",
                    placeholderDOM: () => {
                      const span = document.createElement("span");
                      span.textContent = "...";
                      span.style.cssText = `
                        color: #666;
                        font-style: italic;
                        background: transparent;
                        border: none;
                        padding: 0;
                        margin: 0;
                      `;
                      return span;
                    }
                  }),
                  scrollPastEnd(),
                  colorKeymap,
                  syntaxHighlighting(customSyntaxHighlighting),
                  headerDecorationPlugin,
                  hashSymbolPlugin,
                  colorTextPlugin,
                ]}
                theme={customDarkTheme}
                basicSetup={{
                  lineNumbers: false,
                  foldGutter: false,
                  dropCursor: false,
                  allowMultipleSelections: false,
                  indentOnInput: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: true,
                  highlightSelectionMatches: false,
                  searchKeymap: true,
                }}
              />
              {showSuggestions && (
                <WikilinkSuggestions
                  suggestions={suggestions}
                  position={suggestionPosition}
                  onSelect={handleSuggestionSelect}
                  onClose={handleSuggestionsClose}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full" style={{ overflow: 'auto' }}>
            <div className="max-w-5xl mx-auto px-6 py-4">
              <NotePreview content={content} onWikiLinkClick={handleWikiLinkClick} studyMode={true} noteId={noteId} userId={userId} />
            </div>
          </div>
        )}

        {/* Modal de flashcards */}
        {showFlashcardViewer && noteId && noteTitle && (
          <FlashcardViewer
            noteId={noteId}
            noteTitle={noteTitle}
            isOpen={showFlashcardViewer}
            onClose={() => setShowFlashcardViewer(false)}
            onFlashcardsChange={loadFlashcardCount}
          />
        )}

        {/* Selector de modo de estudio */}
        {showStudyModeSelector && noteId && (
          <StudyModeSelector
            isOpen={showStudyModeSelector}
            onClose={() => setShowStudyModeSelector(false)}
            onModeSelected={(mode, examConfig) => {
              setShowStudyModeSelector(false);
              if (mode === 'traditional') {
                window.location.href = `/study/${noteId}?mode=traditional`;
              } else if (mode === 'multiple_choice') {
                window.location.href = `/study/${noteId}?mode=multiple_choice`;
              } else if (mode === 'exam' && examConfig) {
                const params = new URLSearchParams({
                  mode: 'exam',
                  questions: examConfig.questionCount.toString(),
                  time: examConfig.timeMinutes.toString()
                });
                window.location.href = `/study/${noteId}?${params.toString()}`;
              } else {
                window.location.href = `/study/${noteId}?mode=mixed`;
              }
            }}
            traditionalCount={traditionalCount}
            multipleChoiceCount={multipleChoiceCount}
            title={noteTitle || 'Flashcards'}
          />
        )}
      </div>

      {/* Document Outline */}
      {showOutline && (
        <DocumentOutline
          content={content}
          isOpen={showOutline}
          onToggle={() => setShowOutline(false)}
          buttonRef={outlineButtonRef}
          onNavigate={(line) => {

            if (editorRef.current?.view) {
              const doc = editorRef.current.view.state.doc;
              const lineObj = doc.line(line);
              
              // Hacer scroll para mostrar el header en la primera línea
              editorRef.current.view.dispatch({
                effects: EditorView.scrollIntoView(lineObj.from, {
                  y: "start",
                  yMargin: 10
                })
              });
              
              // Luego posicionar el cursor
              setTimeout(() => {
                if (editorRef.current?.view) {
                  editorRef.current.view.dispatch({
                    selection: { anchor: lineObj.from, head: lineObj.from },
                    scrollIntoView: true
                  });
                  editorRef.current.view.focus();
                }
              }, 100);
            }
          }}
        />
      )}

      {/* Modal de ayuda */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg shadow-xl border border-gray-700 w-full max-w-4xl h-5/6 flex">
            {/* Navegación lateral */}
            <div className="w-1/3 border-r border-gray-700 p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Guía de Usuario</h3>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-gray-400 hover:text-white p-1 hover:bg-gray-700 rounded transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <nav className="space-y-2">
                <button
                  onClick={() => setHelpSection('formato')}
                  className={`w-full text-left px-3 py-2 rounded transition-colors ${
                    helpSection === 'formato' ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  Formato de Texto
                </button>
                <button
                  onClick={() => setHelpSection('preformateado')}
                  className={`w-full text-left px-3 py-2 rounded transition-colors ${
                    helpSection === 'preformateado' ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  Texto Preformateado
                </button>
                <button
                  onClick={() => setHelpSection('listas')}
                  className={`w-full text-left px-3 py-2 rounded transition-colors ${
                    helpSection === 'listas' ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  Listas
                </button>
                <button
                  onClick={() => setHelpSection('citas')}
                  className={`w-full text-left px-3 py-2 rounded transition-colors ${
                    helpSection === 'citas' ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  Citas
                </button>
                <button
                  onClick={() => setHelpSection('negrita-cursiva')}
                  className={`w-full text-left px-3 py-2 rounded transition-colors ${
                    helpSection === 'negrita-cursiva' ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  Negrita y Cursiva
                </button>
                <button
                  onClick={() => setHelpSection('codigo')}
                  className={`w-full text-left px-3 py-2 rounded transition-colors ${
                    helpSection === 'codigo' ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  Bloques de Código
                </button>
                <button
                  onClick={() => setHelpSection('enlaces')}
                  className={`w-full text-left px-3 py-2 rounded transition-colors ${
                    helpSection === 'enlaces' ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  Enlaces Externos
                </button>
                <button
                  onClick={() => setHelpSection('wikilinks')}
                  className={`w-full text-left px-3 py-2 rounded transition-colors ${
                    helpSection === 'wikilinks' ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  Wikilinks
                </button>
                <button
                  onClick={() => setHelpSection('anotaciones')}
                  className={`w-full text-left px-3 py-2 rounded transition-colors ${
                    helpSection === 'anotaciones' ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  Anotaciones en Modo Estudio
                </button>
              </nav>
            </div>

            {/* Contenido principal */}
            <div className="flex-1 p-6 overflow-y-auto">
              {!helpSection && (
                <div className="text-gray-300">
                  <h2 className="text-2xl font-bold text-white mb-4">Bienvenido a la Guía de Usuario</h2>
                  <p className="mb-4">
                    Esta guía te ayudará a aprovechar al máximo todas las funcionalidades de la plataforma de estudio.
                  </p>
                  <p>
                    Selecciona una sección del menú lateral para comenzar.
                  </p>
                </div>
              )}

              {helpSection === 'formato' && (
                <div className="text-gray-300">
                  <h2 className="text-2xl font-bold text-white mb-4">Formato de Texto</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Encabezados</h3>
                      <p className="mb-2">Usa # para crear encabezados de diferentes niveles:</p>
                      <div className="bg-gray-800 p-3 rounded font-mono text-sm">
                        # Encabezado 1<br/>
                        ## Encabezado 2<br/>
                        ### Encabezado 3
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Párrafos</h3>
                      <p>Los párrafos se crean automáticamente. Deja una línea en blanco para separar párrafos.</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Saltos de línea</h3>
                      <p>Para forzar un salto de línea, termina la línea con dos espacios o usa dos enters.</p>
                    </div>
                  </div>
                </div>
              )}

              {helpSection === 'preformateado' && (
                <div className="text-gray-300">
                  <h2 className="text-2xl font-bold text-white mb-4">Texto Preformateado</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Código inline</h3>
                      <p className="mb-2">Usa backticks para código inline:</p>
                      <div className="bg-gray-800 p-3 rounded font-mono text-sm">
                        Usa `console.log()` para imprimir en consola.
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Bloques de código</h3>
                      <p className="mb-2">Usa triple backticks para bloques de código:</p>
                      <div className="bg-gray-800 p-3 rounded font-mono text-sm">
                        ```javascript<br/>
                        function saludar() {`{`}<br/>
                        &nbsp;&nbsp;console.log("¡Hola!");<br/>
                        {`}`}<br/>
                        ```
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {helpSection === 'listas' && (
                <div className="text-gray-300">
                  <h2 className="text-2xl font-bold text-white mb-4">Listas</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Listas con guiones</h3>
                      <p className="mb-2">Usa - para crear listas:</p>
                      <div className="bg-gray-800 p-3 rounded font-mono text-sm">
                        - Primer elemento<br/>
                        - Segundo elemento<br/>
                        - Tercer elemento
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Listas numeradas</h3>
                      <p className="mb-2">Usa números seguidos de punto:</p>
                      <div className="bg-gray-800 p-3 rounded font-mono text-sm">
                        1. Primer paso<br/>
                        2. Segundo paso<br/>
                        3. Tercer paso
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {helpSection === 'citas' && (
                <div className="text-gray-300">
                  <h2 className="text-2xl font-bold text-white mb-4">Citas</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Bloques de cita</h3>
                      <p className="mb-2">Usa &gt; para crear citas:</p>
                      <div className="bg-gray-800 p-3 rounded font-mono text-sm">
                        &gt; Esta es una cita importante.<br/>
                        &gt; Puede tener múltiples líneas.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {helpSection === 'negrita-cursiva' && (
                <div className="text-gray-300">
                  <h2 className="text-2xl font-bold text-white mb-4">Negrita y Cursiva</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Texto en negrita</h3>
                      <p className="mb-2">Usa ** para texto en negrita:</p>
                      <div className="bg-gray-800 p-3 rounded font-mono text-sm">
                        **Este texto está en negrita**
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Texto en cursiva</h3>
                      <p className="mb-2">Usa * para texto en cursiva:</p>
                      <div className="bg-gray-800 p-3 rounded font-mono text-sm">
                        *Este texto está en cursiva*
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {helpSection === 'codigo' && (
                <div className="text-gray-300">
                  <h2 className="text-2xl font-bold text-white mb-4">Bloques de Código</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Sintaxis básica</h3>
                      <p className="mb-2">Usa triple backticks para crear bloques de código:</p>
                      <div className="bg-gray-800 p-3 rounded font-mono text-sm">
                        ```<br/>
                        Tu código aquí<br/>
                        ```
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Con lenguaje específico</h3>
                      <p className="mb-2">Especifica el lenguaje para resaltado de sintaxis:</p>
                      <div className="bg-gray-800 p-3 rounded font-mono text-sm">
                        ```python<br/>
                        def saludar():<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;print("¡Hola mundo!")<br/>
                        ```
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {helpSection === 'enlaces' && (
                <div className="text-gray-300">
                  <h2 className="text-2xl font-bold text-white mb-4">Enlaces Externos</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Sintaxis de enlaces</h3>
                      <p className="mb-2">Usa la sintaxis [texto](url) para crear enlaces:</p>
                      <div className="bg-gray-800 p-3 rounded font-mono text-sm">
                        [Google](https://www.google.com)<br/>
                        [Wikipedia](https://es.wikipedia.org)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {helpSection === 'wikilinks' && (
                <div className="text-gray-300">
                  <h2 className="text-2xl font-bold text-white mb-4">Wikilinks</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Enlaces internos</h3>
                      <p className="mb-2">Usa [[]] para crear enlaces a otras notas:</p>
                      <div className="bg-gray-800 p-3 rounded font-mono text-sm">
                        [[Nombre de la nota]]<br/>
                        [[Otra nota importante]]
                      </div>
                      <p className="mt-2 text-sm text-gray-400">
                        Si la nota no existe, se creará automáticamente al hacer clic.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {helpSection === 'anotaciones' && (
                <div className="text-gray-300">
                  <h2 className="text-2xl font-bold text-white mb-4">Anotaciones en Modo Estudio</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Crear flashcards rápidamente</h3>
                      <p className="mb-2">Usa estos atajos de teclado:</p>
                      <div className="bg-gray-800 p-3 rounded">
                        <p><strong>Alt + Q:</strong> Selecciona texto y guárdalo como pregunta</p>
                        <p><strong>Alt + A:</strong> Selecciona texto y guárdalo como respuesta</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Proceso paso a paso</h3>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Selecciona el texto que quieres usar como pregunta</li>
                        <li>Presiona Alt + Q para guardarlo</li>
                        <li>Selecciona el texto que quieres usar como respuesta</li>
                        <li>Presiona Alt + A para crear la flashcard</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
