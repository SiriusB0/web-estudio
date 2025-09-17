"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import NotePreview from './notes/NotePreview';
import StudyModeSelector from './notes/StudyModeSelector';
import { SimpleAnnotation } from './notes/SimpleAnnotation';
import { StudyHighlightLayer } from './highlights/StudyHighlightLayer';
import { useStudyHighlights } from '../hooks/useStudyHighlights';
import { User } from '@supabase/supabase-js';
import { 
  FolderIcon, 
  DocumentTextIcon, 
  ChevronRightIcon, 
  ChevronDownIcon
} from "@heroicons/react/24/outline";
import type { HighlightRecord } from '../lib/supabase/highlights';

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  is_public: boolean;
  sort_order: number;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  content_md: string;
  folder_id: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  sort_order: number;
}

interface StudyOnlyInterfaceProps {
  user: User;
}

export default function StudyOnlyInterface({ user }: StudyOnlyInterfaceProps) {
  const [publicFolders, setPublicFolders] = useState<Folder[]>([]);
  const [publicNotes, setPublicNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showStudyModal, setShowStudyModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [flashcardCount, setFlashcardCount] = useState(0);
  const [traditionalCount, setTraditionalCount] = useState(0);
  const [multipleChoiceCount, setMultipleChoiceCount] = useState(0);
  const [darkBackground, setDarkBackground] = useState(false);
  
  // Highlights system
  const contentRef = useRef<HTMLDivElement>(null);
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [annotationPosition, setAnnotationPosition] = useState({ x: 0, y: 0 });
  const [currentHighlight, setCurrentHighlight] = useState<HighlightRecord | null>(null);
  
  // Use highlights hook
  const {
    highlights,
    loading: highlightsLoading,
    error: highlightsError,
    createHighlight,
    updateHighlight,
    deleteHighlight
  } = useStudyHighlights(selectedNote?.id || '');

  // Debug logging for StudyOnlyInterface
  useEffect(() => {
    console.log('🏠 StudyOnlyInterface - State:', {
      selectedNoteId: selectedNote?.id,
      highlightsCount: highlights.length,
      highlightsLoading,
      highlightsError,
      contentRefCurrent: !!contentRef.current
    });
  }, [selectedNote?.id, highlights.length, highlightsLoading, highlightsError, contentRef.current]);

  // Logout handler
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error during sign out:', error);
      }
      // Redirigir al inicio o login
      window.location.href = '/';
    } catch (err) {
      console.error('Unexpected error during sign out:', err);
      window.location.href = '/';
    }
  };

  // Cargar contenido basado en permisos del usuario
  useEffect(() => {
    const loadContent = async () => {
      try {
        console.log('🔍 Cargando contenido para usuario:', user?.id);

        // Si el usuario NO está autenticado, mostrar solo contenido público
        if (!user?.id) {
          console.log('👤 Usuario NO autenticado - mostrando contenido público');

          // Consulta simple para carpetas públicas
          const { data: folders, error: foldersError } = await supabase
            .from('folders')
            .select('*')
            .eq('is_public', true)
            .order('sort_order', { ascending: true });

          console.log('📁 Carpetas públicas encontradas:', folders?.length || 0);
          if (folders) {
            folders.forEach(f => console.log('  -', f.name, '(ID:', f.id + ')'));
          }

          // Consulta para TODAS las notas en carpetas públicas
          // (independientemente de si la nota individual es pública o no)
          const { data: notes, error: notesError } = await supabase
            .from('notes')
            .select(`
              *,
              folders!inner(owner_id, name, is_public)
            `)
            .eq('folders.is_public', true)
            .order('sort_order', { ascending: true });

          console.log('📄 Notas públicas encontradas:', notes?.length || 0);
          if (notes) {
            notes.forEach(n => console.log('  -', n.title, '(folder_id:', n.folder_id + ')'));
          }

          // Mapear notas para asegurar compatibilidad
          const mappedNotes = (notes || []).map(note => ({
            ...note,
            content: note.content_md || '',
            content_md: note.content_md || ''
          }));

          console.log('✅ Contenido público - Carpetas:', folders?.length || 0, 'Notas:', mappedNotes.length);

          // Usar solo contenido público
          setPublicFolders(folders || []);
          setPublicNotes(mappedNotes);
        } else {
          // Usuario autenticado - verificar si es propietario o usuario común
          console.log('🔐 Usuario autenticado, verificando permisos...');

          // Primero intentar cargar contenido del usuario (si es propietario)
          const { data: userFolders, error: userFoldersError } = await supabase
            .from('folders')
            .select('*')
            .eq('owner_id', user.id)
            .order('sort_order', { ascending: true });

          const { data: userNotes, error: userNotesError } = await supabase
            .from('notes')
            .select('*')
            .eq('owner_id', user.id)
            .order('sort_order', { ascending: true });

          console.log('👑 Contenido del propietario:', {
            folders: userFolders?.length || 0,
            notes: userNotes?.length || 0,
            userId: user.id
          });

          // Verificar si es el propietario del contenido público
          // (tiene carpetas públicas O es el owner de carpetas públicas)
          const { data: publicFoldersByOwner, error: publicOwnerError } = await supabase
            .from('folders')
            .select('id, name, owner_id')
            .eq('is_public', true)
            .eq('owner_id', user.id);

          const isPublicContentOwner = publicFoldersByOwner && publicFoldersByOwner.length > 0;

          console.log('🌐 Contenido público del que es owner:', {
            publicFolders: publicFoldersByOwner?.length || 0,
            isPublicContentOwner
          });

          // Verificar si realmente es propietario del contenido público
          const isOwner = isPublicContentOwner;
          console.log('🔍 ¿Es propietario de contenido público?', isOwner);

          if (isOwner) {
            // Usuario es propietario - mostrar todo su contenido
            console.log('✅ Usuario es PROPIETARIO - mostrando todo su contenido');

            // Mapear notas para asegurar compatibilidad
            const mappedUserNotes = (userNotes || []).map(note => ({
              ...note,
              content: note.content_md || '',
              content_md: note.content_md || ''
            }));

            setPublicFolders(userFolders || []);
            setPublicNotes(mappedUserNotes);
          } else {
            // Usuario autenticado pero no es propietario - mostrar contenido público
            console.log('👤 Usuario autenticado pero NO es propietario - mostrando contenido público');

            // Consulta simple para carpetas públicas
            const { data: publicFolders, error: publicFoldersError } = await supabase
              .from('folders')
              .select('*')
              .eq('is_public', true)
              .order('sort_order', { ascending: true });

            console.log('📁 Carpetas públicas encontradas:', publicFolders?.length || 0);
            if (publicFolders) {
              publicFolders.forEach(f => console.log('  -', f.name, '(ID:', f.id + ')'));
            }

            // Consulta para TODAS las notas en carpetas públicas
            // (independientemente de si la nota individual es pública o no)
            const { data: publicNotes, error: publicNotesError } = await supabase
              .from('notes')
              .select(`
                *,
                folders!inner(owner_id, name, is_public)
              `)
              .eq('folders.is_public', true)
              .order('sort_order', { ascending: true });

            console.log('📄 Notas públicas encontradas:', publicNotes?.length || 0);
            if (publicNotes) {
              publicNotes.forEach(n => console.log('  -', n.title, '(folder_id:', n.folder_id + ')'));
            }

            console.log('📁 Contenido público para usuario común:', { folders: publicFolders?.length || 0, notes: publicNotes?.length || 0 });

            // Mapear notas para asegurar compatibilidad
            const mappedPublicNotes = (publicNotes || []).map(note => ({
              ...note,
              content: note.content_md || '',
              content_md: note.content_md || ''
            }));

            setPublicFolders(publicFolders || []);
            setPublicNotes(mappedPublicNotes);
          }
        }
      } catch (error) {
        console.error('💥 Error loading content:', error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [user]);

  // Modificar la función de selección de nota para cerrar el sidebar automáticamente en móvil
  const selectNote = async (note: Note) => {
    setSelectedNote(note);
    
    // Cerrar sidebar automáticamente cuando se selecciona una nota (solo en móvil)
    if (window.innerWidth < 768) { // md breakpoint
      setSidebarCollapsed(true);
    }
    
    try {
      // Obtener decks vinculados a la nota
      const { data: deckLinks, error: linksError } = await supabase
        .from('note_deck_links')
        .select('deck_id')
        .eq('note_id', note.id);

      if (linksError) throw linksError;

      if (deckLinks && deckLinks.length > 0) {
        const deckIds = deckLinks.map(link => link.deck_id);
        
        // Contar cards por tipo
        const { data: cards, error: cardsError } = await supabase
          .from('cards')
          .select('id, type')
          .in('deck_id', deckIds);

        if (cardsError) throw cardsError;

        const traditional = cards?.filter(card => !card.type || card.type === 'traditional').length || 0;
        const multipleChoice = cards?.filter(card => card.type === 'multiple_choice').length || 0;
        const total = cards?.length || 0;

        console.log('📊 Conteo de flashcards:', { traditional, multipleChoice, total });

        setTraditionalCount(traditional);
        setMultipleChoiceCount(multipleChoice);
        setFlashcardCount(total);
      } else {
        setTraditionalCount(0);
        setMultipleChoiceCount(0);
        setFlashcardCount(0);
      }
    } catch (error) {
      console.error('Error contando flashcards:', error);
      setTraditionalCount(0);
      setMultipleChoiceCount(0);
      setFlashcardCount(0);
    }
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const buildFolderTree = (parentId: string | null | undefined = null): React.ReactElement[] => {
    const folders = publicFolders
      .filter(f => f.parent_id === parentId || (parentId === null && (f.parent_id === null || f.parent_id === undefined)))
      .sort((a, b) => a.sort_order - b.sort_order);
    const notes = publicNotes
      .filter(n => n.folder_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order);
    
    console.log('🏗️ Construyendo árbol para parentId:', parentId);
    console.log('📁 Carpetas filtradas:', folders.map(f => ({ id: f.id, name: f.name, parent_id: f.parent_id })));
    console.log('📄 Notas filtradas:', notes.map(n => ({ id: n.id, title: n.title, folder_id: n.folder_id })));

    const elements: React.ReactElement[] = [];

    const renderFolderItem = (folder: Folder, level: number = 0) => {
      const isExpanded = expandedFolders.has(folder.id);
      const folderNotes = publicNotes.filter(note => note.folder_id === folder.id);
      
      return (
        <div key={folder.id} className="mb-2">
          <div 
            className="flex items-center py-1.5 px-2 hover:bg-slate-800/30 rounded cursor-pointer group transition-all duration-200"
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => toggleFolder(folder.id)}
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 mr-1 text-slate-400 flex-shrink-0" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 mr-1 text-slate-400 flex-shrink-0" />
            )}
            <FolderIcon className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" />
            <span className="text-slate-300 text-sm truncate" title={folder.name}>
              {folder.name.length > 18 ? `${folder.name.substring(0, 18)}...` : folder.name}
            </span>
          </div>
          
          {isExpanded && (
            <div className="ml-4">
              {folderNotes.map(note => renderNoteItem(note, level + 1))}
            </div>
          )}
        </div>
      );
    };

    const renderNoteItem = (note: Note, level: number = 0) => {
      const isSelected = selectedNote?.id === note.id;
      
      return (
        <div 
          key={note.id}
          className={`flex items-center py-1.5 px-2 cursor-pointer group transition-all duration-200 ${
            isSelected 
              ? "bg-slate-700/20 text-slate-100 border-l-2 border-blue-500" 
              : "text-slate-400 hover:bg-slate-800/30"
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={async () => {
            await selectNote(note);
          }}
        >
          <DocumentTextIcon className="w-4 h-4 mr-2 text-slate-500 flex-shrink-0" />
          <span className="text-sm truncate" title={note.title}>
            {note.title.length > 20 ? `${note.title.substring(0, 20)}...` : note.title}
          </span>
        </div>
      );
    };

    // Folders first
    folders.forEach(folder => {
      elements.push(renderFolderItem(folder));
    });

    // Then notes at this level
    notes.forEach(note => {
      elements.push(renderNoteItem(note));
    });

    return elements;
  };

  const startStudy = async () => {
    if (!selectedNote) return;

    try {
      // Verificar que la nota tenga flashcards
      if (flashcardCount > 0) {
        // Navegar usando noteId como en modo admin
        window.location.href = `/study/${selectedNote.id}`;
      } else {
        alert('Esta nota no tiene flashcards para estudiar.');
      }
    } catch (error) {
      console.error('Error starting study:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#0B1625] flex items-center justify-center">
        <div className="text-slate-200">Cargando contenido de estudio...</div>
      </div>
    );
  }

  return (
    <div className={`h-screen ${darkBackground ? 'bg-black' : 'bg-[#0B1625]'} flex`}>
      {/* Overlay oscuro cuando sidebar está abierto en móvil */}
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Sidebar con contenido público - Colapsable - Pantalla completa en móvil */}
      <div className={`${sidebarCollapsed ? 'w-0' : 'w-full md:w-64'} ${darkBackground ? 'bg-black' : 'bg-[#0B1625]'} border-r ${darkBackground ? 'border-slate-600' : 'border-slate-700'} flex flex-col fixed left-0 top-0 h-full z-20 transition-all duration-300 overflow-hidden`}>
        <div className={`p-4 border-b ${darkBackground ? 'border-slate-600' : 'border-slate-700'} ${darkBackground ? 'bg-black' : 'bg-[#0B1625]'} flex items-center justify-between`}>
          {!sidebarCollapsed && (
            <h1 className="text-slate-200 text-lg font-semibold">📚 Radio UTN Estudio</h1>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="flex-1 overflow-auto p-2">
            <div className="text-slate-400 text-xs mb-2">
              Debug: {publicFolders.length} carpetas, {publicNotes.length} notas
            </div>
            {loading ? (
              <div className="text-slate-500 text-center mt-8">
                <p>Cargando contenido...</p>
              </div>
            ) : publicFolders.length === 0 && publicNotes.length === 0 ? (
              <div className="text-slate-500 text-center mt-8">
                <p>No hay contenido público disponible</p>
                <p className="text-xs mt-2">Verifica que haya carpetas/notas marcadas como públicas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {buildFolderTree()}
              </div>
            )}
          </div>
        )}

        {!sidebarCollapsed && (
          <div className={`p-4 border-t ${darkBackground ? 'border-slate-600' : 'border-slate-700'}`}>
            <button
              onClick={handleSignOut}
              className="w-full px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>


      {/* Área de contenido principal - Oculta cuando sidebar está abierto en móvil */}
      <div className={`flex-1 flex flex-col ${sidebarCollapsed ? 'ml-0' : 'md:ml-64'} transition-all duration-300 ${!sidebarCollapsed ? 'md:block hidden' : ''}`}>
        {/* Menú de botones - Siempre visible en la parte superior */}
        <div className={`flex items-center gap-2 p-4 ${darkBackground ? 'bg-black' : 'bg-[#0B1625]'} border-b ${darkBackground ? 'border-slate-600' : 'border-slate-700'}`}>
          {/* 1. Botón para abrir sidebar - Solo visible cuando está colapsado */}
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="p-2 bg-slate-800/90 hover:bg-slate-700/90 rounded-lg transition-all duration-200 text-slate-300 hover:text-white border border-slate-600/50 hover:border-slate-500/50 shadow-lg backdrop-blur-sm"
              title="Abrir sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* 2. Botón Dark Background */}
          <button
            onClick={() => setDarkBackground(!darkBackground)}
            className={`p-2 rounded-lg transition-colors border shadow-lg backdrop-blur-sm ${
              darkBackground
                ? 'bg-yellow-600/90 hover:bg-yellow-500/90 border-yellow-500/50 hover:border-yellow-400/50'
                : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-600/50 hover:border-slate-500/50'
            }`}
            title={darkBackground ? "Modo claro" : "Modo oscuro"}
          >
            {darkBackground ? (
              <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* 3. Botón Estudiar */}
          {selectedNote && (
            <button
              onClick={() => setShowStudyModal(true)}
              disabled={flashcardCount === 0}
              className={`px-3 py-2 rounded-lg transition-colors font-medium border shadow-lg backdrop-blur-sm ${
                flashcardCount > 0
                  ? 'bg-blue-600/90 hover:bg-blue-700/90 text-white border-blue-500/50 hover:border-blue-400/50'
                  : 'bg-slate-700/90 text-slate-500 cursor-not-allowed border-slate-600/50'
              }`}
              title="Estudiar flashcards"
            >
              <div className="flex items-center gap-1">
                <span className="text-sm">🎯 {flashcardCount}</span>
                <span className="text-xs">Estudiar</span>
              </div>
            </button>
          )}
        </div>

        {selectedNote ? (
          <div className={`px-1 md:p-6 ${darkBackground ? 'bg-black' : 'bg-[#0B1625]'}`}>
            <div className={`${darkBackground ? 'bg-black' : 'bg-slate-800'} w-full md:rounded-lg md:p-6 md:border ${darkBackground ? 'border-transparent' : 'border-slate-700'} border-0 px-1 md:px-0 relative`}>
              <div ref={contentRef} className="relative">
                <NotePreview content={selectedNote.content_md} studyMode={true} />
                
                {/* Overlay de highlights - solo visible en modo estudio */}
                <StudyHighlightLayer
                  rootRef={contentRef}
                  docId={selectedNote.id}
                  userId={user.id}
                  highlights={highlights}
                  isEnabled={true}
                  onHighlightClick={(highlight) => {
                    const rect = contentRef.current?.getBoundingClientRect();
                    if (rect) {
                      setAnnotationPosition({ 
                        x: rect.left + rect.width / 2 - 200, 
                        y: rect.top + 100 
                      });
                      setCurrentHighlight(highlight);
                      setShowAnnotation(true);
                    }
                  }}
                  onCreateHighlight={async (selector, range) => {
                    console.log('🏠 StudyOnlyInterface - onCreateHighlight called:', {
                      selector,
                      selectedNoteId: selectedNote.id
                    });
                    
                    try {
                      console.log('📝 Creating highlight with selector:', selector);
                      const newHighlight = await createHighlight(selector, range);
                      console.log('✅ Highlight created successfully:', newHighlight);
                      
                      // Abrir modal para agregar nota
                      const rect = range.getBoundingClientRect();
                      const containerRect = contentRef.current?.getBoundingClientRect();
                      if (containerRect) {
                        setAnnotationPosition({ 
                          x: rect.left - containerRect.left - 160, 
                          y: rect.top - containerRect.top - 50 
                        });
                        setCurrentHighlight(newHighlight);
                        setShowAnnotation(true);
                      }
                    } catch (error) {
                      console.error('💥 Error creating highlight:', error);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className={`flex-1 flex items-center justify-center ${darkBackground ? 'bg-black' : 'bg-[#0B1625]'} min-h-screen`}>
            <div className="text-center">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-slate-200 text-xl font-semibold mb-2">Selecciona una nota para estudiar</h2>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de anotación */}
      {showAnnotation && currentHighlight && (
        <SimpleAnnotation
          position={annotationPosition}
          onSave={async (noteText) => {
            try {
              await updateHighlight(currentHighlight.id, { note_text: noteText });
              setShowAnnotation(false);
              setCurrentHighlight(null);
            } catch (error) {
              console.error('Error saving annotation:', error);
            }
          }}
          onClose={() => {
            setShowAnnotation(false);
            setCurrentHighlight(null);
          }}
          onDelete={async () => {
            try {
              await deleteHighlight(currentHighlight.id);
              setShowAnnotation(false);
              setCurrentHighlight(null);
            } catch (error) {
              console.error('Error deleting highlight:', error);
            }
          }}
          isVisible={true}
          existingNote={currentHighlight.note_text}
          lineContent={currentHighlight.selector_exact.slice(0, 100)}
        />
      )}
      
      {/* Modal de selección de modo de estudio */}
      {showStudyModal && selectedNote && (
        <StudyModeSelector
          isOpen={showStudyModal}
          onClose={() => setShowStudyModal(false)}
          onModeSelected={async (mode, examConfig) => {
            console.log('🎯 Modo seleccionado:', mode, examConfig);
            
            if (!selectedNote) return;
            
            // Buscar decks vinculados a la nota seleccionada
            const { data: flashcards, error } = await supabase
              .from('note_deck_links')
              .select(`
                deck_id,
                decks!inner(id, name)
              `)
              .eq('note_id', selectedNote.id);
              
            console.log('📚 Flashcards de la nota:', flashcards);
            
            if (!flashcards || flashcards.length === 0) {
              alert('Esta nota no tiene flashcards para estudiar.');
              return;
            }
            
            // Navegar usando noteId como en modo admin, no deckId
            let url = `/study/${selectedNote.id}`;
            
            if (mode === 'traditional') {
              url += '?mode=traditional';
            } else if (mode === 'multiple_choice') {
              url += '?mode=multiple_choice';
            } else if (mode === 'mixed') {
              url += '?mode=mixed';
            } else if (mode === 'exam') {
              const params = new URLSearchParams({
                mode: 'exam',
                questions: (examConfig?.questionCount || 10).toString(),
                time: (examConfig?.timeMinutes || 30).toString()
              });
              url += `?${params.toString()}`;
            }
            
            console.log('🚀 Navegando a:', url);
            console.log('🔍 Note ID que se enviará:', selectedNote.id);
            window.location.href = url;
          }}
          traditionalCount={traditionalCount}
          multipleChoiceCount={multipleChoiceCount}
          title={selectedNote.title}
        />
      )}
    </div>
  );
}
