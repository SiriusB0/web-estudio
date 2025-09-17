"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  AcademicCapIcon, 
  ArrowLeftIcon, 
  DocumentTextIcon, 
  ChevronDownIcon, 
  ChevronRightIcon, 
  FolderIcon, 
  DocumentIcon, 
  TrashIcon, 
  PlusIcon,
  ArrowLeftOnRectangleIcon,
  BookOpenIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import NotePreview from './NotePreview';
import StudyComponent from './StudyComponent';
import ExamModeSelector from './ExamModeSelector';
import { TextSizeProvider, TextSizeControls } from './TextSizeController';

interface Note {
  id: string;
  title: string;
  content_md: string;
  folder_id?: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
}

interface Folder {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  parent_folder_id?: string;
  color?: string;
  sort_order?: number;
}

interface MobileStudyInterfaceProps {
  user: any;
}

// Componente principal con TextSizeProvider
export default function MobileStudyInterface({ user }: MobileStudyInterfaceProps) {
  return (
    <TextSizeProvider defaultSize={0.85} minSize={0.6} maxSize={1.4} step={0.1}>
      <MobileStudyInterfaceContent user={user} />
    </TextSizeProvider>
  );
}

function MobileStudyInterfaceContent({ user }: MobileStudyInterfaceProps) {
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  
  // Estados para controles móviles
  const [darkBackground, setDarkBackground] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'menu' | 'folder' | 'reading' | 'study'>('menu');
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [studyMode, setStudyMode] = useState<'traditional' | 'multiple_choice' | 'mixed' | 'exam'>('traditional');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [examConfig, setExamConfig] = useState<{ questionCount: number; timeMinutes: number } | null>(null);
  const [flashcardCounts, setFlashcardCounts] = useState({ traditional: 0, multipleChoice: 0 });
  const [showExamConfig, setShowExamConfig] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar carpetas
      const { data: foldersData } = await supabase
        .from("folders")
        .select("*")
        .eq("owner_id", user.id)
        .is("parent_folder_id", null)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      // Cargar todas las notas
      const { data: notesData, error: notesError } = await supabase
        .from("notes")
        .select("id, title, content_md, folder_id, created_at, updated_at, owner_id")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false });

      console.log('=== DEBUG CARGA DE DATOS ===');
      console.log('Carpetas cargadas:', foldersData?.length || 0, foldersData);
      console.log('Notas cargadas:', notesData?.length || 0, notesData);
      console.log('Error notas:', notesError);

      setFolders(foldersData || []);
      setNotes(notesData || []);
      
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFlashcardCounts = async (noteId: string) => {
    try {
      const { data } = await supabase
        .from('note_deck_links')
        .select(`
          deck_id,
          decks!inner (
            cards (
              type
            )
          )
        `)
        .eq('note_id', noteId);

      if (!data) {
        console.error('No data returned from note_deck_links');
        setFlashcardCounts({ traditional: 0, multipleChoice: 0 });
        return { traditional: 0, multipleChoice: 0 };
      }

      // Extraer todas las flashcards de todos los decks vinculados a la nota
      const allCards = data.flatMap(link => 
        (link.decks as any)?.cards || []
      );

      console.log('Flashcards encontradas:', allCards);
      console.log('Total flashcards:', allCards.length);

      const traditional = allCards.filter(f => f.type !== 'multiple_choice').length;
      const multipleChoice = allCards.filter(f => f.type === 'multiple_choice').length;
      
      console.log('Conteo por tipo:', { traditional, multipleChoice, total: traditional + multipleChoice });
      
      const newCounts = { traditional, multipleChoice };
      setFlashcardCounts(newCounts);
      return newCounts;
    } catch (error) {
      console.error("Error loading flashcard counts:", error);
      const errorCounts = { traditional: 0, multipleChoice: 0 };
      setFlashcardCounts(errorCounts);
      return errorCounts;
    }
  };

  const handleExamModeClick = async () => {
    if (currentNote) {
      console.log('Cargando flashcards para nota:', currentNote.id);
      const counts = await loadFlashcardCounts(currentNote.id);
      console.log('Counts devueltos:', counts);
      console.log('Estado flashcardCounts antes de abrir modal:', flashcardCounts);
      setShowExamConfig(true);
    }
  };

  const handleExamConfigured = (config: { questionCount: number; timeMinutes: number }) => {
    setExamConfig(config);
    setStudyMode('exam');
    setShowExamConfig(false);
    setCurrentScreen('study');
  };

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

  // PANTALLA 1: MENÚ PRINCIPAL
  if (currentScreen === 'menu') {
    return (
      <div className="min-h-screen bg-slate-900 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="bg-slate-800 px-3 py-4 sm:p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <BookOpenIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
              <h1 className="text-lg sm:text-2xl font-bold text-white">Modo Estudio</h1>
            </div>
            <button
              onClick={() => {
                window.location.href = "/login";
              }}
              className="p-2 sm:p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeftOnRectangleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>


        {/* Lista de carpetas y notas */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:p-6">
          {folders.length === 0 && notes.length === 0 ? (
            <div className="text-center py-12 sm:py-20">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <FolderIcon className="w-8 h-8 sm:w-10 sm:h-10 text-slate-500" />
              </div>
              <h3 className="text-white text-lg sm:text-xl font-medium mb-2 sm:mb-3">No hay contenido</h3>
              <p className="text-slate-400 text-base sm:text-lg px-2 sm:px-4">Crea carpetas y notas desde la versión de escritorio</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {/* Carpetas */}
              {folders.map((folder) => {
                const folderNotes = notes.filter(note => note.folder_id === folder.id);
                const isExpanded = expandedFolders.has(folder.id);
                
                return (
                  <div key={folder.id}>
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedFolders);
                        if (expandedFolders.has(folder.id)) {
                          newExpanded.delete(folder.id);
                        } else {
                          newExpanded.add(folder.id);
                        }
                        setExpandedFolders(newExpanded);
                      }}
                      className="w-full flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-slate-800 hover:bg-slate-700 rounded-lg sm:rounded-xl transition-colors text-left max-w-full overflow-hidden"
                    >
                      <FolderIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 flex-shrink-0" />
                      <span className="text-white text-base sm:text-lg font-medium truncate flex-1 min-w-0">{folder.name}</span>
                      <span className="text-slate-400 text-sm sm:text-base">({folderNotes.length})</span>
                      {isExpanded ? (
                        <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 ml-auto" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 ml-auto" />
                      )}
                    </button>
                    
                    {isExpanded && folderNotes.length > 0 && (
                      <div className="ml-6 sm:ml-10 mt-2 sm:mt-3 space-y-1 sm:space-y-2">
                        {folderNotes.map((note) => (
                          <button
                            key={note.id}
                            onClick={() => {
                              setCurrentNote(note);
                              setCurrentScreen('reading');
                            }}
                            className="w-full flex items-center space-x-3 sm:space-x-4 p-2 sm:p-3 bg-slate-700 hover:bg-slate-600 rounded-lg sm:rounded-xl transition-colors text-left max-w-full overflow-hidden"
                          >
                            <DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
                            <span className="text-white text-sm sm:text-base truncate flex-1 min-w-0">{note.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Notas sin carpeta */}
              {notes.filter(note => !note.folder_id).map((note) => (
                <button
                  key={note.id}
                  onClick={() => {
                    setCurrentNote(note);
                    setCurrentScreen('reading');
                  }}
                  className="w-full flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-slate-800 hover:bg-slate-700 rounded-lg sm:rounded-xl transition-colors text-left max-w-full overflow-hidden"
                >
                  <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 flex-shrink-0" />
                  <span className="text-white text-base sm:text-lg truncate flex-1 min-w-0">{note.title}</span>
                  <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 ml-auto" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // PANTALLA 2: LECTURA DE NOTA
  if (currentScreen === 'reading' && currentNote) {
    return (
      <div className={`min-h-screen max-w-full overflow-x-hidden ${
        darkBackground ? 'bg-black' : 'bg-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-3 py-4 sm:p-6 border-b border-slate-700 ${
          darkBackground ? 'bg-black' : 'bg-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <button
                onClick={() => setCurrentScreen('menu')}
                className="p-1 sm:p-2 text-slate-400 hover:text-white rounded-lg flex-shrink-0"
              >
                <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <h1 className="hidden sm:block text-base sm:text-xl font-semibold text-white truncate flex-1 min-w-0">{currentNote.title}</h1>
              
            </div>
            {/* Controles de texto y botón estudiar */}
            <div className="flex items-center gap-2">
              {/* Botón Dark Mode - Visible en móvil y escritorio */}
              <button
                onClick={() => setDarkBackground(!darkBackground)}
                className={`w-10 h-8 rounded-lg transition-colors flex items-center justify-center mr-2 sm:mr-4 ${
                  darkBackground 
                    ? 'bg-yellow-600/50 hover:bg-yellow-500/50' 
                    : 'bg-slate-700/50 hover:bg-slate-600/50'
                }`}
                title={darkBackground ? "Modo claro" : "Modo oscuro"}
              >
                {darkBackground ? (
                  <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              
              <button
                onClick={() => setCurrentScreen('study')}
                className="flex items-center space-x-1 sm:space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 sm:px-5 sm:py-3 rounded-lg sm:rounded-xl transition-colors flex-shrink-0"
              >
                <AcademicCapIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base font-medium">Estudiar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Contenido de la nota - SIN márgenes horizontales en móvil, texto al 100% del viewport */}
        <div className={`px-0 py-1 sm:p-6 max-w-full overflow-x-hidden ${
          darkBackground ? 'bg-black' : ''
        }`} data-note-content>
          {currentNote.content_md && currentNote.content_md.trim() ? (
            <NotePreview 
              content={currentNote.content_md}
              studyMode={true}
            />
          ) : (
            <div className="text-center py-12 sm:py-20">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <DocumentTextIcon className="w-8 h-8 sm:w-10 sm:h-10 text-slate-500" />
              </div>
              <h3 className="text-white text-lg sm:text-xl font-medium mb-2 sm:mb-3">Nota vacía</h3>
              <p className="text-slate-400 text-base sm:text-lg">Esta nota no tiene contenido aún</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // PANTALLA 4: MODO ESTUDIO
  if (currentScreen === 'study' && currentNote) {
    return (
      <StudyComponent
        noteId={currentNote.id}
        onBack={() => setCurrentScreen('reading')}
        studyMode={studyMode}
        examConfig={examConfig || undefined}
      />
    );
  }

  // Estado por defecto
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center max-w-full overflow-x-hidden px-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpenIcon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-white text-xl sm:text-2xl font-medium mb-2 sm:mb-3">Modo Estudio</h3>
        <p className="text-slate-400 text-base sm:text-lg mb-6 sm:mb-8 px-2 sm:px-4 max-w-sm mx-auto">Interfaz optimizada para dispositivos móviles</p>
        <button
          onClick={() => setCurrentScreen('menu')}
          className="px-6 py-3 sm:px-8 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white text-base sm:text-lg rounded-lg sm:rounded-xl transition-colors font-medium"
        >
          Comenzar
        </button>
      </div>
    </div>
  );
}
