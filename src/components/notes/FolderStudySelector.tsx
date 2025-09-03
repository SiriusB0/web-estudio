"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { countFlashcardsForNote, getAllNotesFromFolderRecursive } from "@/lib/notes/flashcards";

interface Note {
  id: string;
  title: string;
  flashcardCount: number;
}

interface FolderStudySelectorProps {
  folderId: string | null;
  folderName: string;
  isOpen: boolean;
  onClose: () => void;
  onStartStudy: (noteIds: string[]) => void;
}

export default function FolderStudySelector({
  folderId,
  folderName,
  isOpen,
  onClose,
  onStartStudy
}: FolderStudySelectorProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadNotesWithFlashcards();
    }
  }, [isOpen, folderId]);

  const loadNotesWithFlashcards = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener todas las notas de la carpeta y subcarpetas recursivamente
      const allNoteIds = await getAllNotesFromFolderRecursive(folderId, user.id);
      
      if (allNoteIds.length === 0) {
        setNotes([]);
        return;
      }

      // Obtener detalles de las notas
      const { data: notesData } = await supabase
        .from('notes')
        .select('id, title, folder_id')
        .in('id', allNoteIds)
        .order('title');

      if (!notesData) return;

      // Contar flashcards para cada nota
      const notesWithCounts = await Promise.all(
        notesData.map(async (note) => {
          const count = await countFlashcardsForNote(note.id);
          return {
            id: note.id,
            title: note.title,
            flashcardCount: count
          };
        })
      );

      // Filtrar solo notas que tienen flashcards
      const notesWithFlashcards = notesWithCounts.filter(note => note.flashcardCount > 0);
      setNotes(notesWithFlashcards);
      
      // Seleccionar todas por defecto
      setSelectedNotes(new Set(notesWithFlashcards.map(note => note.id)));
    } catch (error) {
      console.error("Error cargando notas:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const selectAllNotes = () => {
    setSelectedNotes(new Set(notes.map(note => note.id)));
  };

  const deselectAllNotes = () => {
    setSelectedNotes(new Set());
  };

  const handleStartStudy = () => {
    if (selectedNotes.size > 0) {
      onStartStudy(Array.from(selectedNotes));
    }
  };

  const totalFlashcards = notes
    .filter(note => selectedNotes.has(note.id))
    .reduce((total, note) => total + note.flashcardCount, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            Estudiar flashcards: {folderName} (incluye subcarpetas)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">
              Cargando notas...
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No hay notas con flashcards en esta carpeta.
              <br />
              Crea flashcards en las notas usando Alt+Q y Alt+A.
            </div>
          ) : (
            <>
              {/* Actions */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300">
                    {notes.length} notas disponibles
                  </span>
                  {selectedNotes.size > 0 && (
                    <span className="text-sm text-blue-400">
                      ({selectedNotes.size} seleccionadas, {totalFlashcards} flashcards)
                    </span>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={selectAllNotes}
                    className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
                  >
                    Todas
                  </button>
                  <button
                    onClick={deselectAllNotes}
                    className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
                  >
                    Ninguna
                  </button>
                </div>
              </div>

              {/* Notes list */}
              <div className="space-y-2 max-h-[40vh] overflow-y-auto mb-4">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedNotes.has(note.id)
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-gray-700 bg-gray-800 hover:bg-gray-750'
                    }`}
                    onClick={() => toggleNoteSelection(note.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedNotes.has(note.id)}
                      onChange={() => toggleNoteSelection(note.id)}
                      className="cursor-pointer"
                    />
                    
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{note.title}</h3>
                      <p className="text-sm text-gray-400">
                        {note.flashcardCount} flashcards
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Start study button */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleStartStudy}
                  disabled={selectedNotes.size === 0}
                  className={`px-6 py-2 rounded font-medium transition-colors ${
                    selectedNotes.size > 0
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Estudiar {totalFlashcards} flashcards
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
