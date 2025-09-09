"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import NotePreview from "./NotePreview";
import StudyMode from "./StudyMode";
import { getFlashcardsForNote } from "@/lib/notes/flashcards";

type Note = {
  id: string;
  title: string;
  content_md: string;
  slug: string;
  folder_id: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

type Folder = {
  id: string;
  name: string;
  parent_folder_id: string | null;
  owner_id: string;
  sort_order: number;
};

interface MobileStudyInterfaceProps {
  user: any;
  initialNote?: Note | null;
}

export default function MobileStudyInterface({ user, initialNote }: MobileStudyInterfaceProps) {
  const [currentNote, setCurrentNote] = useState<Note | null>(initialNote || null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [showFolders, setShowFolders] = useState(true);
  const [studyMode, setStudyMode] = useState<"read" | "flashcards">("read");
  const [loading, setLoading] = useState(true);
  const [flashcards, setFlashcards] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadFoldersAndNotes();
    }
  }, [user]);

  const loadFoldersAndNotes = async () => {
    try {
      // Cargar carpetas
      const { data: foldersData } = await supabase
        .from("folders")
        .select("*")
        .eq("owner_id", user.id)
        .is("parent_folder_id", null)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      // Cargar notas de la carpeta actual o raíz
      const { data: notesData } = await supabase
        .from("notes")
        .select("*")
        .eq("owner_id", user.id)
        .eq("folder_id", currentFolder)
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });

      setFolders(foldersData || []);
      setNotes(notesData || []);
      // No auto-seleccionar nota en móvil: el usuario elegirá
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderSelect = async (folderId: string) => {
    setCurrentFolder(folderId);
    setShowFolders(false);
    
    // Cargar notas de la carpeta seleccionada
    const { data: notesData } = await supabase
      .from("notes")
      .select("*")
      .eq("owner_id", user.id)
      .eq("folder_id", folderId)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

    setNotes(notesData || []);
    // No abrir nota automáticamente; mostrar lista
    setCurrentNote(null);
  };

  const handleNoteSelect = async (note: Note) => {
    setCurrentNote(note);
    setShowFolders(false);
    
    // Cargar flashcards para esta nota
    const noteFlashcards = await getFlashcardsForNote(note.id);
    setFlashcards(noteFlashcards);
  };

  const handleBackToFolders = () => {
    setShowFolders(true);
    setCurrentFolder(null);
  };

  const handleBackToNotes = () => {
    setCurrentNote(null);
    setShowFolders(false);
  };

  // Cargar flashcards al entrar al modo flashcards o cambiar de nota
  useEffect(() => {
    const fetchFlashcards = async () => {
      if (studyMode === "flashcards" && currentNote) {
        const fc = await getFlashcardsForNote(currentNote.id);
        setFlashcards(fc);
      }
    };
    fetchFlashcards();
  }, [studyMode, currentNote]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Cargando modo estudio...</p>
        </div>
      </div>
    );
  }

  // Vista de carpetas
  if (showFolders) {
    return (
      <div className="min-h-screen bg-slate-900">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-white">Modo Estudio</h1>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Carpetas */}
        <div className="p-4">
          <h2 className="text-base font-medium text-slate-200 mb-4">Selecciona una carpeta</h2>
          <div className="space-y-3">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleFolderSelect(folder.id)}
                className="w-full p-4 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors text-left"
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="text-slate-200 font-medium">{folder.name}</span>
                </div>
              </button>
            ))}
            
            {/* Ocultar notas sin carpeta en móvil - solo mostrar carpetas */}
          </div>
        </div>
      </div>
    );
  }

  // Vista de notas de una carpeta
  if (currentFolder && !currentNote) {
    return (
      <div className="min-h-screen bg-slate-900">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
          <div className="flex items-center">
            <button
              onClick={handleBackToFolders}
              className="mr-3 p-1 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-white">Notas</h1>
          </div>
        </div>

        {/* Lista de notas */}
        <div className="p-4">
          {notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => handleNoteSelect(note)}
                  className="w-full p-4 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors text-left"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-slate-200 font-medium">{note.title}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-400">No hay notas en esta carpeta</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vista de estudio de una nota
  if (currentNote) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => {
                  if (currentFolder) {
                    handleBackToNotes();
                  } else {
                    handleBackToFolders();
                  }
                }}
                className="mr-3 p-1 text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-base font-semibold text-white truncate">{currentNote.title}</h1>
            </div>
            
            {/* Selector de modo */}
            <div className="flex bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setStudyMode("read")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  studyMode === "read" 
                    ? "bg-blue-600 text-white" 
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Leer
              </button>
              <button
                onClick={() => setStudyMode("flashcards")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  studyMode === "flashcards" 
                    ? "bg-blue-600 text-white" 
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Flashcards
              </button>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-hidden">
          {studyMode === "read" ? (
            <div className="h-full overflow-y-auto">
              <div className="p-4 pb-8">
                <div className="prose prose-invert max-w-none">
                  <NotePreview 
                    content={currentNote.content_md} 
                    studyMode={true}
                    onWikiLinkClick={async (noteTitle: string) => {
                      // Buscar nota por título
                      const { data: targetNote } = await supabase
                        .from("notes")
                        .select("*")
                        .eq("owner_id", user.id)
                        .ilike("title", noteTitle)
                        .limit(1)
                        .single();

                      if (targetNote) {
                        setCurrentNote(targetNote);
                        // Cargar flashcards de la nueva nota
                        const fc = await getFlashcardsForNote(targetNote.id);
                        setFlashcards(fc);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            flashcards && flashcards.length > 0 ? (
              <StudyMode 
                flashcards={flashcards}
                isOpen={true}
                onClose={() => setStudyMode("read")}
                title={currentNote.title}
              />
            ) : (
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="text-4xl mb-3">🃏</div>
                  <h3 className="text-white text-lg font-semibold mb-2">No hay flashcards aún</h3>
                  <p className="text-slate-400 text-sm mb-4">Crea tarjetas desde escritorio o usa el creador manual.</p>
                  <button
                    onClick={() => setStudyMode("read")}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md text-sm"
                  >
                    Volver a Leer
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  // Estado por defecto
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-400">Selecciona una carpeta para comenzar a estudiar</p>
        <button
          onClick={() => setShowFolders(true)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
        >
          Ver Carpetas
        </button>
      </div>
    </div>
  );
}
