"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting, syntaxTree, foldGutter, foldEffect, unfoldEffect, codeFolding } from "@codemirror/language";
import { lineNumbers } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { headerColors, headerSizes } from "../../lib/theme";
import { debounce } from "@/lib/notes/noteUtils";
import WikilinkSuggestions from "./WikilinkSuggestions";
import NotePreview from "./NotePreview";
import MarkdownToolbar from "./MarkdownToolbar";
import FlashcardViewer from "./FlashcardViewer";
import DocumentOutline from "./DocumentOutline";
import { supabase } from "@/lib/supabaseClient";
import { Flashcard, getOrCreateDeckForNote, saveFlashcard, countFlashcardsForNote } from "@/lib/notes/flashcards";

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
  onToggleSplitView
}: NoteEditorProps) {
  // Estado para controlar qué headers están plegados
  const [foldedHeaders, setFoldedHeaders] = useState<Set<number>>(new Set());

  // Función para encontrar líneas de una sección
  const findSectionLines = useCallback((content: string, headerLineNumber: number, headerLevel: number) => {
    const lines = content.split('\n');
    const sectionLines: number[] = [];
    
    console.log('findSectionLines input:', { headerLineNumber, headerLevel, totalLines: lines.length });
    console.log('Header line content:', lines[headerLineNumber]);
    
    // Empezar desde la línea SIGUIENTE al header
    for (let i = headerLineNumber + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      console.log(`Checking line ${i}: "${line}"`);
      
      // Si encontramos otro header
      if (line.startsWith('#')) {
        const match = line.match(/^(#{1,6})\s/);
        if (match) {
          const currentLevel = match[1].length;
          console.log(`Found header level ${currentLevel} at line ${i}`);
          // Si es del mismo nivel o superior, termina la sección
          if (currentLevel <= headerLevel) {
            console.log(`Section ends at line ${i} (level ${currentLevel} <= ${headerLevel})`);
            break;
          }
        }
      }
      
      // Añadir esta línea a la sección (usar número de línea 1-indexed)
      sectionLines.push(i + 1);
      console.log(`Added line ${i + 1} to section`);
    }
    
    console.log('Final sectionLines:', sectionLines);
    return sectionLines;
  }, []);

  // Función para plegar/desplegar sección
  const toggleSection = useCallback((headerLineNumber: number, headerLevel: number) => {
    const editor = editorRef.current?.view;
    if (!editor) return;
    
    const content = editor.state.doc.toString();
    const lines = content.split('\n');
    
    console.log('Toggling section:', { headerLineNumber, headerLevel });
    
    const isFolded = foldedHeaders.has(headerLineNumber);
    
    // Encontrar el rango de líneas para plegar
    let startLine = headerLineNumber + 1;
    let endLine = lines.length;
    
    // Buscar dónde termina la sección
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#')) {
        const match = line.match(/^(#{1,6})\s/);
        if (match && match[1].length <= headerLevel) {
          endLine = i;
          break;
        }
      }
    }
    
    if (startLine >= endLine) {
      console.log('No hay contenido para plegar');
      return;
    }
    
    // Calcular posiciones en el documento
    let fromPos = 0;
    let toPos = 0;
    
    // Calcular posición de inicio (final de la línea del header)
    for (let i = 0; i <= headerLineNumber; i++) {
      if (i === headerLineNumber) {
        fromPos += lines[i].length;
      } else {
        fromPos += lines[i].length + 1; // +1 por el \n
      }
    }
    
    // Calcular posición de fin
    toPos = fromPos;
    for (let i = startLine; i < endLine; i++) {
      toPos += lines[i].length + 1; // +1 por el \n
    }
    
    console.log('Fold range:', { fromPos, toPos, startLine, endLine });
    
    try {
      if (isFolded) {
        // Desplegar usando la API de CodeMirror
        console.log('Desplegando con unfoldEffect');
        editor.dispatch({
          effects: unfoldEffect.of({ from: fromPos, to: toPos })
        });
      } else {
        // Plegar usando la API de CodeMirror
        console.log('Plegando con foldEffect');
        editor.dispatch({
          effects: foldEffect.of({ from: fromPos, to: toPos })
        });
      }
      
      // Actualizar estado
      setFoldedHeaders(prev => {
        const newSet = new Set(prev);
        if (isFolded) {
          newSet.delete(headerLineNumber);
        } else {
          newSet.add(headerLineNumber);
        }
        console.log('Estado actualizado:', newSet);
        return newSet;
      });
    } catch (error) {
      console.error('Error en plegado:', error);
    }
  }, [foldedHeaders]);

  // Widget personalizado para flecha de plegado
  class HeaderFoldWidget extends WidgetType {
    constructor(
      private level: number, 
      private lineNumber: number, 
      private isFolded: boolean,
      private onToggle: (lineNumber: number, level: number) => void
    ) {
      super();
    }

    toDOM() {
      const span = document.createElement("span");
      span.className = "header-fold-arrow";
      span.textContent = this.isFolded ? "▶" : "▼";
      span.style.cssText = `
        cursor: pointer;
        font-size: 16px;
        color: rgba(171, 178, 191, 0.8);
        margin-right: 8px;
        font-weight: bold;
        display: inline-block;
        width: 20px;
        text-align: center;
        user-select: none;
        transition: all 0.2s ease;
      `;
      
      span.onmouseenter = () => {
        span.style.transform = "scale(1.2)";
        span.style.color = "rgba(171, 178, 191, 1)";
      };
      
      span.onmouseleave = () => {
        span.style.transform = "scale(1)";
        span.style.color = "rgba(171, 178, 191, 0.8)";
      };
      
      span.onclick = (e) => {
        console.log("Flecha clickeada!", { level: this.level, lineNumber: this.lineNumber, folded: this.isFolded });
        e.preventDefault();
        e.stopPropagation();
        this.onToggle(this.lineNumber, this.level);
      };
      
      return span;
    }

    eq(other: HeaderFoldWidget) {
      return this.level === other.level && 
             this.lineNumber === other.lineNumber && 
             this.isFolded === other.isFolded;
    }
  }

  // Plugin para aplicar clases CSS a líneas de headers y añadir flechas de plegado
  const headerDecorationPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet = Decoration.none;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        // Usar requestAnimationFrame para asegurar que el DOM se actualice
        requestAnimationFrame(() => {
          this.decorations = this.buildDecorations(update.view);
          update.view.requestMeasure();
        });
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
          
          // Decoración de línea para el color del header + indentación
          decorations.push(
            Decoration.line({ 
              attributes: { 
                class: `cm-h${level}`,
                style: `padding-left: ${indentPixels}px;`
              } 
            }).range(line.from)
          );
          
          // Widget de flecha de plegado después de los símbolos #
          const isFolded = foldedHeaders.has(line.number - 1);
          const hashEnd = line.from + hashSymbols.length;
          decorations.push(
            Decoration.widget({
              widget: new HeaderFoldWidget(level, line.number - 1, isFolded, toggleSection),
              side: 1
            }).range(hashEnd)
          );
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

    constructor(view: EditorView) {
      this.decorations = this.buildColorDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildColorDecorations(update.view);
      }
    }

    buildColorDecorations(view: EditorView) {
      const decorations: any[] = [];
      const doc = view.state.doc;
      
      // OPTIMIZACIÓN: Solo procesar el rango visible + un buffer pequeño
      const visibleRanges = view.visibleRanges;
      if (visibleRanges.length === 0) return Decoration.set([]);
      
      // Calcular rango extendido con buffer de 500 caracteres
      const bufferSize = 500;
      const firstVisible = Math.max(0, visibleRanges[0].from - bufferSize);
      const lastVisible = Math.min(doc.length, visibleRanges[visibleRanges.length - 1].to + bufferSize);
      
      // Extraer solo el texto del rango visible
      const visibleText = doc.sliceString(firstVisible, lastVisible);
      
      // Buscar patrones de <span style="color: #...">texto</span>
      const colorRegex = /<span\s+style="color:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|[a-zA-Z]+)"\s*>(.*?)<\/span>/g;
      let match;
      const matches = [];
      
      // Recopilar coincidencias en el rango visible
      while ((match = colorRegex.exec(visibleText)) !== null) {
        const fullMatch = match[0];
        const color = match[1];
        const innerText = match[2];
        const relativeStartPos = match.index;
        const relativeEndPos = relativeStartPos + fullMatch.length;
        const relativeInnerStart = relativeStartPos + fullMatch.indexOf(innerText);
        const relativeInnerEnd = relativeInnerStart + innerText.length;
        
        // Convertir posiciones relativas a absolutas
        const startPos = firstVisible + relativeStartPos;
        const endPos = firstVisible + relativeEndPos;
        const innerStart = firstVisible + relativeInnerStart;
        const innerEnd = firstVisible + relativeInnerEnd;
        
        matches.push({
          startPos,
          innerStart,
          innerEnd,
          endPos,
          color,
          innerText
        });
      }
      
      // Crear decoraciones en orden (ya están ordenadas por el regex)
      for (const match of matches) {
        // Etiqueta de apertura
        decorations.push(
          Decoration.mark({
            attributes: { 
              class: 'cm-color-tag',
              style: 'opacity: 0.3; font-size: 0.8em;'
            }
          }).range(match.startPos, match.innerStart)
        );
        
        // Texto coloreado
        decorations.push(
          Decoration.mark({
            attributes: { 
              style: `color: ${match.color} !important;`
            }
          }).range(match.innerStart, match.innerEnd)
        );
        
        // Etiqueta de cierre
        decorations.push(
          Decoration.mark({
            attributes: { 
              class: 'cm-color-tag',
              style: 'opacity: 0.3; font-size: 0.8em;'
            }
          }).range(match.innerEnd, match.endPos)
        );
      }
      
      return Decoration.set(decorations);
    }
  }, {
    decorations: v => v.decorations
  });

  // Tema oscuro personalizado con tamaños de headers
  const customDarkTheme = EditorView.theme({
    '&': {
      color: '#abb2bf',
      backgroundColor: '#1e1e1e !important'
    },
    '.cm-content': {
      padding: '10px 0 10px 40px',
      caretColor: '#528bff',
      backgroundColor: '#1e1e1e !important'
    },
    '.cm-activeLine': {
      backgroundColor: 'transparent !important'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent !important'
    },
    '.cm-editor': {
      backgroundColor: '#1e1e1e !important'
    },
    '.cm-scroller': {
      backgroundColor: '#1e1e1e !important'
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
    // Estilos para etiquetas de color
    '.cm-color-tag': {
      opacity: '0.3 !important',
      fontSize: '0.8em !important',
      color: '#666 !important'
    },
    '.cm-line:hover .cm-color-tag': {
      opacity: '0.6 !important'
    },
    '.cm-theme': {
      backgroundColor: '#1e1e1e !important'
    },
    // Ocultar completamente el foldGutter nativo
    '.cm-foldGutter': {
      display: 'none !important'
    },
    // Gutter styling - alineación correcta con headers
    '.cm-gutters': {
      color: 'rgba(171, 178, 191, 0.4)',
      borderRight: '1px solid #33373f',
    },
    '.cm-gutterElement': {
      fontSize: '0.75rem',
      padding: '0 8px 0 0',
      textAlign: 'right',
      // Clave: usar line-height inherit para que coincida con el contenido
      lineHeight: 'inherit',
      minHeight: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end'
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
    // Tamaños y colores de headers usando headerSizes y headerColors de theme.ts
    '.cm-line.cm-h1': { fontSize: headerSizes.h1, fontWeight: 'bold', color: headerColors.h1 },
    '.cm-line.cm-h2': { fontSize: headerSizes.h2, fontWeight: 'bold', color: headerColors.h2 },
    '.cm-line.cm-h3': { fontSize: headerSizes.h3, fontWeight: 'bold', color: headerColors.h3 },
    '.cm-line.cm-h4': { fontSize: headerSizes.h4, fontWeight: 'bold', color: headerColors.h4 },
    '.cm-line.cm-h5': { fontSize: headerSizes.h5, fontWeight: 'bold', color: headerColors.h5 },
    '.cm-line.cm-h6': { fontSize: headerSizes.h6, fontWeight: 'bold', color: headerColors.h6 }
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
  
  // Estados para flashcards automáticas
  const [pendingQuestion, setPendingQuestion] = useState<string>("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardCount, setFlashcardCount] = useState<number>(0);
  const [showFlashcardViewer, setShowFlashcardViewer] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const outlineButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  
  // Control de cambio de nota
  useEffect(() => {
    if (noteId !== currentNoteRef) {
      setCurrentNoteRef(noteId);
      setContent(initialContent);
      setPendingQuestion("");
      setFlashcards([]);
      setShowFlashcardViewer(false);
    }
  }, [noteId, currentNoteRef, initialContent]);
  
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
      const count = await countFlashcardsForNote(noteId);
      setFlashcardCount(count);
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
        
        // Calcular posición para el popup
        const editorElement = editorRef.current?.view?.dom;
        if (editorElement) {
          const rect = editorElement.getBoundingClientRect();
          setSuggestionPosition({
            top: rect.top + 100, // Aproximado
            left: rect.left + 20
          });
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

  const handleToolbarInsert = useCallback((prefix: string, suffix: string = "", wrapSelection: boolean = false) => {
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
    
    // Actualizar cursor después de que React actualice
    setTimeout(() => {
      if (view) {
        view.dispatch({
          selection: { anchor: newCursorPos, head: newCursorPos }
        });
        view.focus();
      }
    }, 10);
  }, []);

  const handleColorInsert = useCallback((color: string) => {
    const view = editorRef.current?.view;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const currentContent = view.state.doc.toString();
    const selectedText = currentContent.slice(from, to);
    
    if (!selectedText) {
      // Sin selección, insertar template
      const template = `<span style="color: ${color}">texto</span>`;
      const newContent = 
        currentContent.slice(0, from) + 
        template + 
        currentContent.slice(to);
      
      setContent(newContent);
      
      setTimeout(() => {
        if (view) {
          const templateStart = from + `<span style="color: ${color}">`.length;
          const templateEnd = templateStart + 'texto'.length;
          view.dispatch({
            selection: { anchor: templateStart, head: templateEnd }
          });
          view.focus();
        }
      }, 10);
    } else {
      // Con selección, envolver el texto
      const wrappedText = `<span style="color: ${color}">${selectedText}</span>`;
      const newContent = 
        currentContent.slice(0, from) + 
        wrappedText + 
        currentContent.slice(to);
      
      setContent(newContent);
      
      setTimeout(() => {
        if (view) {
          view.dispatch({
            selection: { anchor: from + wrappedText.length, head: from + wrappedText.length }
          });
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

  // Scroll sincronizado
  useEffect(() => {
    const editorEl = editorContainerRef.current?.querySelector('.cm-scroller');
    const previewEl = previewContainerRef.current;

    if (!isSplitView || !editorEl || !previewEl) return;

    let editorScrolling = false;
    let previewScrolling = false;

    const handleEditorScroll = () => {
      if (previewScrolling) return;
      editorScrolling = true;
      const percentage = editorEl.scrollTop / (editorEl.scrollHeight - editorEl.clientHeight);
      previewEl.scrollTop = percentage * (previewEl.scrollHeight - previewEl.clientHeight);
      setTimeout(() => { editorScrolling = false; }, 100);
    };

    const handlePreviewScroll = () => {
      if (editorScrolling) return;
      previewScrolling = true;
      const percentage = previewEl.scrollTop / (previewEl.scrollHeight - previewEl.clientHeight);
      editorEl.scrollTop = percentage * (editorEl.scrollHeight - editorEl.clientHeight);
      setTimeout(() => { previewScrolling = false; }, 100);
    };

    editorEl.addEventListener('scroll', handleEditorScroll);
    previewEl.addEventListener('scroll', handlePreviewScroll);

    return () => {
      editorEl.removeEventListener('scroll', handleEditorScroll);
      previewEl.removeEventListener('scroll', handlePreviewScroll);
    };
  }, [isSplitView, content]);

  return (
    <div className="h-full flex flex-col">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-900 text-xs text-gray-300" style={{backgroundColor: '#0f0f0f'}}>
        <div className="flex items-center gap-4">
          <span>Markdown</span>
          {saving && <span className="text-blue-400">Guardando...</span>}
          <span>{content.length} caracteres</span>
          <span>•</span>
          <span>{content.trim() ? content.trim().split(/\s+/).length : 0} palabras</span>
          <span>•</span>
          <span>{content.split('\n').length} líneas</span>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === "edit" && (
            <button
              ref={outlineButtonRef}
              onClick={() => setShowOutline(!showOutline)}
              className={`px-3 py-2 text-sm rounded transition-colors ${
                showOutline 
                  ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
              }`}
              title="Mostrar/ocultar esquema del documento"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" className="text-current">
                <path fill="currentColor" d="M3 9h14V7H3v2zm0 4h14v-2H3v2zm0 4h14v-2H3v2zm16 0h2v-2h-2v2zm0-10v2h2V7h-2zm0 6h2v-2h-2v2z"/>
              </svg>
            </button>
          )}
          {viewMode === "edit" && (
            <>
              <button
                onClick={() => onToggleFocusMode && onToggleFocusMode()}
                className="p-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-200 rounded transition-colors"
                title={isFocusMode ? "Salir del Modo Foco" : "Entrar al Modo Foco"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isFocusMode ? (
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  ) : (
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  )}
                </svg>
              </button>

              <button
                onClick={() => onToggleSplitView && onToggleSplitView()}
                className={`p-2 rounded-md hover:bg-gray-700 ${isSplitView ? 'bg-gray-600 text-gray-100' : 'bg-gray-800 text-gray-200'}`}
                title="Toggle Split View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-columns-2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/></svg>
              </button>
            </>
          )}
          {onViewModeChange && (
            <button
              onClick={() => onViewModeChange(viewMode === "edit" ? "preview" : "edit")}
              className="px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-200 rounded transition-colors"
              title={viewMode === "edit" ? "Vista previa" : "Editar"}
            >
{viewMode === "edit" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" className="text-white">
                  <path fill="currentColor" d="m20.942 4.278c-.044-.081-.114-.142-.179-.203-2.59-1.601-5.516-2.634-8.695-3.069-.045-.006-.091-.006-.136 0-3.179.436-6.104 1.469-8.695 3.069-.147.092-.237.253-.237.426s.09.334.237.426c1.264.781 2.611 1.422 4.025 1.93-.173.602-.262 1.303-.262 2.145 0 3.505 1.495 5 5 5s5-1.495 5-5c0-.841-.09-1.543-.262-2.145 1.139-.409 2.22-.927 3.262-1.513v5.158c0 .276.224.5.5.5s.5-.224.5-.5v-6.002c0-.081-.024-.155-.058-.222zm-4.942 4.722c0 2.953-1.047 4-4 4s-4-1.047-4-4c0-.739.074-1.344.218-1.851 1.197.37 2.429.669 3.715.846.045.006.091.006.136 0 1.286-.176 2.518-.476 3.715-.846.143.506.217 1.111.217 1.851zm-4-2.005c-2.722-.381-5.246-1.219-7.516-2.495 2.271-1.276 4.794-2.114 7.516-2.495 2.722.381 5.246 1.219 7.516 2.495-2.271 1.276-4.794 2.114-7.516 2.495zm8.999 15.466c.021.275-.184.516-.459.537-.014 0-.027.002-.04.002-.258 0-.477-.198-.498-.461-.246-3.11-1.351-4.93-3.566-5.839-1.99 3.104-4.118 4.2-4.211 4.246-.142.072-.309.072-.449 0-.093-.046-2.221-1.143-4.211-4.246-2.215.909-3.32 2.729-3.566 5.839-.022.276-.254.482-.538.459-.275-.021-.48-.263-.459-.537.292-3.681 1.755-5.855 4.606-6.846.224-.076.469.012.591.213 1.528 2.515 3.205 3.719 3.801 4.093.597-.374 2.273-1.578 3.801-4.093.123-.201.368-.289.591-.213 2.852.99 4.315 3.166 4.606 6.846z"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" className="text-white">
                  <path fill="currentColor" d="M22.994,5.195c-.011-.067-.277-1.662-1.378-2.774-1.111-1.09-2.712-1.355-2.779-1.366-.119-.021-.239,.005-.342,.068-.122,.075-3.047,1.913-9.049,7.886C3.12,15.305,1.482,17.791,1.415,17.894c-.045,.07-.073,.15-.079,.233l-.334,4.285c-.011,.146,.042,.289,.145,.393,.094,.094,.221,.146,.354,.146,.013,0,.026,0,.039-.001l4.306-.333c.083-.006,.162-.033,.232-.078,.103-.066,2.6-1.697,8.924-7.991,6.002-5.974,7.848-8.886,7.923-9.007,.064-.103,.089-.225,.07-.344ZM14.295,13.838c-5.54,5.514-8.14,7.427-8.661,7.792l-3.59,.278,.278-3.569c.368-.521,2.292-3.109,7.828-8.619,1.773-1.764,3.278-3.166,4.518-4.264,.484,.112,1.721,.468,2.595,1.326,.868,.851,1.23,2.046,1.346,2.526-1.108,1.24-2.525,2.75-4.314,4.531Zm5.095-5.419c-.236-.681-.669-1.608-1.427-2.352-.757-.742-1.703-1.166-2.396-1.397,1.807-1.549,2.902-2.326,3.292-2.59,.396,.092,1.362,.375,2.05,1.049,.675,.682,.963,1.645,1.058,2.042-.265,.388-1.039,1.469-2.577,3.247Z"/>
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Markdown Toolbar */}
      {isFocusMode ? (
        <div className="flex items-center gap-1 p-2 border-b border-gray-900 relative" style={{backgroundColor: '#0f0f0f'}}>
          <button 
            title="Negrita" 
            onClick={() => handleToolbarInsert('**', '**', true)}
            className="px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors font-bold"
          >
            B
          </button>
          <button 
            title="Cursiva" 
            onClick={() => handleToolbarInsert('*', '*', true)}
            className="px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors italic"
          >
            I
          </button>
          <button 
            title="Título 1" 
            onClick={() => handleToolbarInsert('# ', '')}
            className="px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors text-lg font-bold"
          >
            H1
          </button>
          <button 
            title="Título 2" 
            onClick={() => handleToolbarInsert('## ', '')}
            className="px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors text-base font-bold"
          >
            H2
          </button>
          <button 
            title="Código inline" 
            onClick={() => handleToolbarInsert('`', '`', true)}
            className="px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors font-mono text-xs"
          >
            &lt;/&gt;
          </button>
          <button 
            title="Bloque de código" 
            onClick={() => handleToolbarInsert('```\n', '\n```')}
            className="px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors font-mono text-xs"
          >
            ```
          </button>
          <button 
            title="Lista" 
            onClick={() => handleToolbarInsert('- ', '')}
            className="px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            •
          </button>
          <button 
            title="Lista numerada" 
            onClick={() => handleToolbarInsert('1. ', '')}
            className="px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            1.
          </button>
          <button 
            title="Cita" 
            onClick={() => handleToolbarInsert('> ', '')}
            className="px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            ❝
          </button>
          <button 
            title="Enlace" 
            onClick={() => handleToolbarInsert('[', '](url)')}
            className="px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            🔗
          </button>
          <div className="w-px h-4 bg-gray-600 mx-1"></div>
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
        </div>
      ) : (
        <MarkdownToolbar 
          onInsert={handleToolbarInsert}
          onColorInsert={handleColorInsert}
          viewMode={viewMode}
          flashcardCount={flashcardCount}
          pendingQuestion={pendingQuestion}
          onViewFlashcards={() => setShowFlashcardViewer(true)}
          onStudyFlashcards={() => {
            if (noteId) {
              window.location.href = `/study/${noteId}`;
            }
          }}
        />
      )}

      {/* Editor or Preview */}
      <div className="flex-1 overflow-hidden relative flex" ref={editorContainerRef}>
        {isSplitView ? (
          <div className="flex w-full h-full">
            <div className="w-1/2 h-full overflow-auto relative" style={{ backgroundColor: '#1e1e1e' }}>
              <CodeMirror
                ref={editorRef}
                value={content}
                onChange={handleChange}
                className="h-full w-full text-base"
                style={{ backgroundColor: '#1e1e1e' }}
                extensions={[
                  lineNumbers(),
                  markdown(),
                  EditorView.lineWrapping,
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
            <div className="w-1/2 h-full overflow-y-auto border-l border-gray-700 p-4" ref={previewContainerRef}>
              <NotePreview content={content} onWikiLinkClick={handleWikiLinkClick} />
            </div>
          </div>
        ) : viewMode === "edit" ? (
          <div className="flex-1 overflow-auto relative h-full" style={{ backgroundColor: '#1e1e1e' }}>
            <CodeMirror
              ref={editorRef}
              value={content}
              onChange={handleChange}
              className="h-full w-full text-base"
              style={{ backgroundColor: '#1e1e1e' }}
              extensions={[
                lineNumbers(),
                markdown(),
                EditorView.lineWrapping,
                codeFolding(),
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
        ) : (
          <div className="h-full overflow-y-auto p-4">
            <NotePreview content={content} onWikiLinkClick={handleWikiLinkClick} />
          </div>
        )}
      </div>
      
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
              
              // Primero hacer scroll al área
              editorRef.current.view.dispatch({
                effects: EditorView.scrollIntoView(lineObj.from, {
                  y: "center",
                  yMargin: 50
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
    </div>
  );
}
