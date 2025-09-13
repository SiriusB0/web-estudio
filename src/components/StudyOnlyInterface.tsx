"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import NotePreview from './notes/NotePreview';
import StudyModeSelector from './notes/StudyModeSelector';
import { User } from '@supabase/supabase-js';
import { 
  FolderIcon, 
  DocumentTextIcon, 
  ChevronRightIcon, 
  ChevronDownIcon
} from "@heroicons/react/24/outline";

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

  // Cargar contenido público del admin
  useEffect(() => {
    const loadPublicContent = async () => {
      try {
        console.log('🔍 Cargando contenido público...');
        
        // Consulta simple para carpetas públicas
        const { data: folders, error: foldersError } = await supabase
          .from('folders')
          .select('*')
          .eq('is_public', true)
          .order('sort_order', { ascending: true });

        console.log('📁 Carpetas públicas encontradas:', folders?.length || 0);
        if (foldersError) {
          console.error('❌ Error carpetas:', foldersError);
        }

        // Consulta para notas de carpetas públicas (JOIN con folders)
        const { data: notes, error: notesError } = await supabase
          .from('notes')
          .select(`
            *,
            folders!inner(is_public)
          `)
          .eq('folders.is_public', true)
          .order('sort_order', { ascending: true });

        console.log('📄 Notas públicas encontradas:', notes?.length || 0);
        if (notesError) {
          console.error('❌ Error notas:', notesError);
        }

        // Mapear notas para asegurar compatibilidad
        const mappedNotes = (notes || []).map(note => ({
          ...note,
          content: note.content_md || '',
          content_md: note.content_md || ''
        }));

        console.log('✅ Contenido final - Carpetas:', folders?.length || 0, 'Notas:', mappedNotes.length);

        // Usar solo contenido real
        setPublicFolders(folders || []);
        setPublicNotes(mappedNotes);
      } catch (error) {
        console.error('💥 Error loading public content:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPublicContent();
  }, []);

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
        <div key={folder.id} className="mb-1">
          <div 
            className="flex items-center py-0.5 px-2 hover:bg-slate-800/30 rounded cursor-pointer group transition-all duration-200"
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => toggleFolder(folder.id)}
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 mr-1 text-slate-400 flex-shrink-0" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 mr-1 text-slate-400 flex-shrink-0" />
            )}
            <FolderIcon className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" />
            <span className="text-slate-300 text-sm truncate">{folder.name}</span>
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
          className={`flex items-center py-0.5 px-2 cursor-pointer group transition-all duration-200 ${
            isSelected 
              ? "bg-slate-700/20 text-slate-100 border-l-2 border-blue-500" 
              : "text-slate-400 hover:bg-slate-800/30"
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={async () => {
            setSelectedNote(note);
            
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
          }}
        >
          <DocumentTextIcon className="w-4 h-4 mr-2 text-slate-500 flex-shrink-0" />
          <span className="text-sm truncate">{note.title}</span>
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
    <div className="h-screen bg-[#0B1625] flex">
      {/* Sidebar con contenido público - Colapsable */}
      <div className={`${sidebarCollapsed ? 'w-12' : 'w-80'} bg-[#0B1625] border-r border-slate-700 flex flex-col fixed left-0 top-0 h-full z-10 transition-all duration-300`}>
        <div className="p-4 border-b border-slate-700 bg-[#0B1625] flex items-center justify-between">
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-slate-200 text-lg font-semibold">📚 Biblioteca de Estudio</h1>
              <p className="text-slate-400 text-sm mt-1">Contenido público del instructor</p>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
          >
            {sidebarCollapsed ? '→' : '←'}
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
              <div className="space-y-1">
                {buildFolderTree()}
              </div>
            )}
          </div>
        )}

        {!sidebarCollapsed && (
          <div className="p-4 border-t border-slate-700">
            <button
              onClick={handleSignOut}
              className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>

      {/* Área principal - Con margen dinámico para sidebar */}
      <div className={`flex-1 flex flex-col bg-[#0B1625] ${sidebarCollapsed ? 'ml-12' : 'ml-80'} transition-all duration-300`}>
        {selectedNote ? (
          <div className="p-6 bg-[#0B1625]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {/* Contador de flashcards detallado */}
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700/50">
                  <span>📚 {traditionalCount} flashcards</span>
                  <span className="text-slate-600">•</span>
                  <span>✅ {multipleChoiceCount} múltiple choice</span>
                </div>
                
                {/* Botón de estudiar igual que en modo admin */}
                <button
                  onClick={() => setShowStudyModal(true)}
                  disabled={flashcardCount === 0}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                    flashcardCount > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  🎯 Estudiar
                </button>
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <NotePreview content={selectedNote.content_md} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#0B1625]">
            <div className="text-center">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-slate-200 text-xl font-semibold mb-2">Selecciona una nota para estudiar</h2>
              <p className="text-slate-400">Elige una nota del sidebar para ver su contenido y estudiar las flashcards</p>
            </div>
          </div>
        )}
      </div>
      
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
