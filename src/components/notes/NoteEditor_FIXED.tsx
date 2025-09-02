"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { lineNumbers } from '@codemirror/view';
import { debounce } from "@/lib/notes/noteUtils";
import WikilinkSuggestions from "./WikilinkSuggestions";
import NotePreview from "./NotePreview";
import MarkdownToolbar from "./MarkdownToolbar";
import FlashcardViewer from "./FlashcardViewer";
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
  onViewModeChange
}: NoteEditorProps) {
  // Estados principales
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Estados de wikilinks
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
  const [currentWikilink, setCurrentWikilink] = useState("");
  
  // Estados para flashcards automáticas
  const [pendingQuestion, setPendingQuestion] = useState<string>("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardCount, setFlashcardCount] = useState<number>(0);
  const [showFlashcardViewer, setShowFlashcardViewer] = useState(false);
  
  // Control de inicialización
  const [currentNoteId, setCurrentNoteId] = useState<string | undefined>(noteId);
  const [isEditorReady, setIsEditorReady] = useState(false);
  
  const editorRef = useRef<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // INICIALIZACIÓN CONTROLADA - Solo cuando cambia la nota
  useEffect(() => {
    if (noteId !== currentNoteId) {
      // Nueva nota detectada - limpiar todo
      setCurrentNoteId(noteId);
      setIsEditorReady(false);
      
      // Limpiar estados
      setPendingQuestion("");
      setFlashcards([]);
      setShowFlashcardViewer(false);
      setSuggestions([]);
      setShowSuggestions(false);
      
      // Cancelar guardados pendientes
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      // Actualizar contenido
      setContent(initialContent);
      
      // Marcar editor como listo después de actualizar
      setTimeout(() => {
        setIsEditorReady(true);
      }, 100);
    }
  }, [noteId, currentNoteId, initialContent]);

  // Cargar contador de flashcards solo para nueva nota
  useEffect(() => {
    if (noteId && isEditorReady) {
      loadFlashcardCount();
    }
  }, [noteId, isEditorReady]);

  const loadFlashcardCount = async () => {
    if (!noteId) return;
    try {
      const count = await countFlashcardsForNote(noteId);
      setFlashcardCount(count);
    } catch (error) {
      console.error("Error cargando contador de flashcards:", error);
    }
  };

  // AUTOGUARDADO CONTROLADO
  const performSave = useCallback(async (contentToSave: string, targetNoteId: string) => {
    // Verificaciones de seguridad
    if (!targetNoteId || targetNoteId !== noteId) return;
    if (contentToSave === initialContent) return;
    if (!isEditorReady) return;
    
    setSaving(true);
    try {
      await onSave(contentToSave);
      setLastSaved(new Date());
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setSaving(false);
    }
  }, [onSave, initialContent, noteId, isEditorReady]);

  // Debounced save con control estricto
  const debouncedSave = useCallback((contentToSave: string) => {
    if (!noteId || !isEditorReady) return;
    
    // Cancelar guardado anterior
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Programar nuevo guardado
    saveTimeoutRef.current = setTimeout(() => {
      performSave(contentToSave, noteId);
    }, 800);
  }, [performSave, noteId, isEditorReady]);

  // Auto-save SOLO cuando editor está listo y contenido cambió
  useEffect(() => {
    if (isEditorReady && content !== initialContent && content.length > 0) {
      debouncedSave(content);
    }
  }, [content, debouncedSave, initialContent, isEditorReady]);

  // Debounced search for wikilink suggestions
  const debouncedSearch = useCallback(
    debounce(async (searchTerm: string) => {
      if (!userId || !searchTerm.trim() || !isEditorReady) {
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
    [userId, isEditorReady]
  );

  // Extract title from first line if it's a heading
  useEffect(() => {
    if (onTitleChange && isEditorReady) {
      const lines = content.split('\n');
      const firstLine = lines[0]?.trim();
      if (firstLine?.startsWith('# ')) {
        onTitleChange(firstLine.slice(2).trim());
      }
    }
  }, [content, onTitleChange, isEditorReady]);

  // HANDLER DE CAMBIOS CONTROLADO
  const handleChange = useCallback((value: string, viewUpdate?: any) => {
    // Solo procesar si el editor está listo
    if (!isEditorReady) return;
    
    // Actualizar contenido solo si realmente cambió
    if (value !== content) {
      setContent(value);
    }
    
    // Detectar wikilinks mientras se escribe
    if (viewUpdate && userId && noteId && isEditorReady) {
      const cursor = viewUpdate.state.selection.main.head;
      const text = value;
      
      // Buscar si estamos dentro de un wikilink [[...
      const beforeCursor = text.slice(0, cursor);
      
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
            top: rect.top + 100,
            left: rect.left + 20
          });
        }
        
        debouncedSearch(partialText);
      } else {
        setShowSuggestions(false);
        setCurrentWikilink("");
      }
    }
  }, [content, userId, debouncedSearch, noteId, isEditorReady]);

  const handleSuggestionSelect = useCallback((noteTitle: string) => {
    if (!isEditorReady) return;
    
    const cursor = content.length; // Simplificado por ahora
    const beforeCursor = content.slice(0, cursor);
    const afterCursor = content.slice(cursor);
    
    // Encontrar el inicio del wikilink
    const wikilinkMatch = beforeCursor.match(/\[\[([^\]]*?)$/);
    if (wikilinkMatch) {
      const startPos = cursor - wikilinkMatch[1].length;
      const newContent = 
        content.slice(0, startPos) + 
        noteTitle + 
        "]]" + 
        afterCursor;
      
      setContent(newContent);
    }
    
    setShowSuggestions(false);
    setCurrentWikilink("");
  }, [content, isEditorReady]);

  const handleSuggestionsClose = useCallback(() => {
    setShowSuggestions(false);
    setCurrentWikilink("");
  }, []);

  const handleToolbarInsert = useCallback((prefix: string, suffix: string = "", wrapSelection: boolean = false) => {
    if (!isEditorReady) return;
    
    const view = editorRef.current?.view;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const currentContent = view.state.doc.toString();
    const selectedText = currentContent.slice(from, to);
    
    let insertText = "";
    let newCursorPos = from;
    
    if (wrapSelection && selectedText) {
      insertText = prefix + selectedText + suffix;
      newCursorPos = from + insertText.length;
    } else if (selectedText && !wrapSelection) {
      insertText = prefix + selectedText + suffix;
      newCursorPos = from + insertText.length;
    } else {
      insertText = prefix + suffix;
      newCursorPos = from + prefix.length;
    }
    
    const newContent = 
      currentContent.slice(0, from) + 
      insertText + 
      currentContent.slice(to);
    
    setContent(newContent);
    
    setTimeout(() => {
      if (view) {
        view.dispatch({
          selection: { anchor: newCursorPos, head: newCursorPos }
        });
        view.focus();
      }
    }, 10);
  }, [isEditorReady]);

  // Funciones para flashcards automáticas
  const handleCreateFlashcard = async (question: string, answer: string) => {
    if (!noteId || !noteTitle || !isEditorReady) return;

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
    if (!isEditorReady) return "";
    
    const view = editorRef.current?.view;
    if (!view) return "";

    const { from, to } = view.state.selection.main;
    return view.state.doc.slice(from, to).toString();
  };

  // Manejadores de teclado para Alt+Q y Alt+A
  useEffect(() => {
    if (!isEditorReady) return;
    
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
  }, [pendingQuestion, noteId, noteTitle, isEditorReady]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-900 text-xs text-gray-300" style={{backgroundColor: '#0f0f0f'}}>
        <div className="flex items-center gap-4">
          <span>Markdown</span>
          {saving && <span className="text-blue-400">Guardando...</span>}
          <span>{content.length} caracteres</span>
          <span>•</span>
          <span>{content.split('\n').length} líneas</span>
        </div>
        <div className="flex items-center gap-2">
          {onViewModeChange && (
            <button
              onClick={() => onViewModeChange(viewMode === "edit" ? "preview" : "edit")}
              className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 rounded transition-colors"
            >
              {viewMode === "edit" ? "Vista previa" : "Editar"}
            </button>
          )}
        </div>
      </div>

      {/* Markdown Toolbar */}
      <MarkdownToolbar 
        onInsert={handleToolbarInsert} 
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

      {/* Editor or Preview */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === "edit" ? (
          <>
            <CodeMirror
              ref={editorRef}
              value={content}
              onChange={handleChange}
              placeholder="Escribe tu nota en Markdown...

Puedes usar:
- # Títulos
- **negrita** y *cursiva*
- [[wikilinks]] para enlazar notas (autocompletado disponible)

## Ejemplo de wikilink

Puedes conectar notas escribiendo [[nombre de otra nota]]"
              className="h-full"
              basicSetup={{
                lineNumbers: false,
                foldGutter: true,
                dropCursor: false,
                allowMultipleSelections: false,
                indentOnInput: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                highlightSelectionMatches: false,
              }}
              extensions={[
                markdown(),
                EditorView.lineWrapping,
                EditorView.theme({
                  "&": {
                    fontSize: "14px",
                    lineHeight: "1.6",
                    height: "100%",
                    backgroundColor: "#262626"
                  },
                  ".cm-content": {
                    padding: "16px",
                    minHeight: "100%",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    backgroundColor: "#262626",
                    color: "#e2e8f0"
                  },
                  ".cm-focused": {
                    outline: "none"
                  },
                  ".cm-editor": {
                    height: "100%",
                    overflow: "hidden",
                    backgroundColor: "#262626"
                  },
                  ".cm-scroller": {
                    fontFamily: "inherit",
                    overflow: "auto",
                    maxHeight: "100%"
                  },
                  ".cm-gutters": {
                    backgroundColor: "#262626",
                    borderRight: "1px solid #6b7280"
                  },
                  ".cm-lineNumbers": {
                    opacity: "0",
                    transition: "opacity 0.2s ease",
                    color: "#a0aec0"
                  },
                  ".cm-editor:hover .cm-lineNumbers, .cm-content:hover ~ .cm-gutters .cm-lineNumbers": {
                    opacity: "0.6"
                  },
                  ".cm-cursor": {
                    borderColor: "#ffffff"
                  },
                  ".cm-selectionBackground": {
                    backgroundColor: "#4299e1"
                  }
                }),
                lineNumbers(),
                ...(theme === "dark" ? [oneDark] : [])
              ]}
            />
            
            {/* Sugerencias de wikilinks */}
            {showSuggestions && isEditorReady && (
              <WikilinkSuggestions
                suggestions={suggestions}
                onSelect={handleSuggestionSelect}
                onClose={handleSuggestionsClose}
                position={suggestionPosition}
              />
            )}
          </>
        ) : (
          <div className="h-full overflow-y-auto">
            <NotePreview content={content} />
          </div>
        )}
      </div>
      
      {/* Modal de flashcards */}
      {showFlashcardViewer && noteId && noteTitle && isEditorReady && (
        <FlashcardViewer
          noteId={noteId}
          noteTitle={noteTitle}
          isOpen={showFlashcardViewer}
          onClose={() => setShowFlashcardViewer(false)}
          onFlashcardsChange={loadFlashcardCount}
        />
      )}
    </div>
  );
}
