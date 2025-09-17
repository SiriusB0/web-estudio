"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import FileExplorer from "@/components/notes/FileExplorer";
import NoteEditor from "@/components/notes/NoteEditor";
import NotePreview from "@/components/notes/NotePreview";
import DocumentOutline from "@/components/notes/DocumentOutline";
import { AnnotationsList } from "@/components/notes/AnnotationsList";
import MobileStudyInterface from "@/components/notes/MobileStudyInterface";
import StudyOnlyInterface from "@/components/StudyOnlyInterface";
import { extractWikiLinks, updateNoteLinks } from "@/lib/notes/wikilinks";
import { isMobileDevice } from "@/lib/utils/deviceDetection";

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

export default function EditorPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showOutline, setShowOutline] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const outlineButtonRef = useRef<HTMLButtonElement>(null);
  const annotationsButtonRef = useRef<HTMLButtonElement>(null);
  const [isSplitView, setIsSplitView] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [explorerKey, setExplorerKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [darkBackground, setDarkBackground] = useState(false);
  const router = useRouter();

  // Cerrar esquema al cambiar de modo
  useEffect(() => {
    if (viewMode === "edit" && showOutline) {
      setShowOutline(false);
    }
  }, [viewMode, showOutline]);

  useEffect(() => {
    // Detectar dispositivo móvil
    setIsMobile(isMobileDevice());
    
    // Verificar si hay parámetro note en URL ANTES de checkAuth
    const urlParams = new URLSearchParams(window.location.search);
    const noteParam = urlParams.get('note');
    
    if (noteParam) {
      // Si hay nota específica, cargar directamente sin cargar nota por defecto
      checkAuthAndLoadSpecificNote(noteParam);
    } else {
      // Solo si no hay nota específica, usar comportamiento normal
      checkAuth();
    }
  }, []);

  // Simple admin check - you can modify this logic as needed
  const checkIfUserIsAdmin = async (userId: string): Promise<boolean> => {
    try {
      console.log('🔍 Verificando si usuario es admin:', userId);
      
      // Check if user has any invitation codes (simple admin check)
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('id')
        .eq('created_by', userId)
        .limit(1);
      
      const isAdminResult = !error && data && data.length > 0;
      console.log('📊 Resultado admin check:', { data, error, dataLength: data?.length, isAdmin: isAdminResult });
      
      if (error) return false;
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  };

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      
      // Check if user is admin
      const adminCheck = await checkIfUserIsAdmin(user.id);
      console.log('🎯 Setting isAdmin to:', adminCheck);
      setIsAdmin(adminCheck);
      
      // If not admin, don't load notes - they'll see StudyOnlyInterface
      if (adminCheck) {
        await loadFirstNote(user.id);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const checkAuthAndLoadSpecificNote = async (noteId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      
      // Si ya tenemos la nota cargada, no refetch
      if (currentNote?.id === noteId) {
        setViewMode("edit");
        setLoading(false);
        return;
      }
      
      // Cargar nota específica directamente SIN limpiar estado
      const { data: note } = await supabase
        .from("notes")
        .select("*")
        .eq("id", noteId)
        .single();

      if (note) {
        setCurrentNote(note);
        setViewMode("edit");
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadFirstNote = async (userId: string) => {
    try {
      // First try to load the first note from the first folder (ordered by sort_order)
      const { data: folders } = await supabase
        .from("folders")
        .select("id")
        .eq("owner_id", userId)
        .is("parent_folder_id", null) // Only root folders
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })
        .limit(1);

      let firstNote = null;

      if (folders && folders.length > 0) {
        // Get first note from first folder
        const { data: folderNotes } = await supabase
          .from("notes")
          .select("*")
          .eq("owner_id", userId)
          .eq("folder_id", folders[0].id)
          .order("sort_order", { ascending: true })
          .order("title", { ascending: true })
          .limit(1);

        if (folderNotes && folderNotes.length > 0) {
          firstNote = folderNotes[0];
        }
      }

      // If no note found in folders, try root notes
      if (!firstNote) {
        const { data: rootNotes } = await supabase
          .from("notes")
          .select("*")
          .eq("owner_id", userId)
          .is("folder_id", null)
          .order("sort_order", { ascending: true })
          .order("title", { ascending: true })
          .limit(1);

        if (rootNotes && rootNotes.length > 0) {
          firstNote = rootNotes[0];
        }
      }

      // If still no note, try any note (fallback)
      if (!firstNote) {
        const { data: anyNotes } = await supabase
          .from("notes")
          .select("*")
          .eq("owner_id", userId)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (anyNotes && anyNotes.length > 0) {
          firstNote = anyNotes[0];
        }
      }

      if (firstNote) {
        setCurrentNote(firstNote);
      } else {
        // Create welcome note if no notes exist
        await createWelcomeNote(userId);
      }
    } catch (error) {
      console.error("Error loading first note:", error);
    }
  };

  const createWelcomeNote = async (userId: string) => {
    const welcomeContent = `# Bienvenido a tu espacio de notas

¡Hola! Esta es tu primera nota. Aquí puedes:

## Funcionalidades principales

- **Escribir en Markdown**: Usa sintaxis Markdown para formatear tu texto
- **Wikilinks**: Conecta notas con \`[[nombre de otra nota]]\`
- **Autocompletado**: Al escribir \`[[\` aparecerán sugerencias
- **Organización**: Usa carpetas para estructurar tus notas

## Ejemplo de wikilink

Conecta tus ideas escribiendo [[nombre de otra nota]] - se creará automáticamente si no existe.

## Organización

- Usa el explorador de archivos de la izquierda para navegar
- Crea carpetas para organizar tus notas
- Haz clic en cualquier nota para editarla

¡Empieza a escribir y explora todas las funcionalidades!`;

    try {
      const { data: newNote } = await supabase
        .from("notes")
        .insert({
          title: "Bienvenido a tu espacio de notas",
          content_md: welcomeContent,
          slug: "bienvenido",
          owner_id: userId,
          folder_id: null
        })
        .select()
        .single();

      if (newNote) {
        setCurrentNote(newNote);
      }
    } catch (error) {
      console.error("Error creating welcome note:", error);
    }
  };

  const handleNoteSelect = async (noteId: string) => {
    try {
      // Si ya es la nota actual, no hacer nada
      if (currentNote?.id === noteId) {
        setViewMode("edit");
        return;
      }
      
      // Forzar limpieza del estado antes de cargar nueva nota
      setCurrentNote(null);
      
      const { data: note } = await supabase
        .from("notes")
        .select("*")
        .eq("id", noteId)
        .single();

      if (note) {
        // Usar setTimeout para asegurar que el estado se limpia completamente
        setTimeout(() => {
          setCurrentNote(note);
          setViewMode("edit"); // Always start in edit mode when selecting a note
        }, 10);
      }
    } catch (error) {
      console.error("Error loading note:", error);
    }
  };

  const handleNewFolder = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newFolder, error } = await supabase
        .from('folders')
        .insert([{ name: "Nueva Carpeta", owner_id: user.id, sort_order: 0 }])
        .select()
        .single();

      if (error) throw error;
      
      // Force FileExplorer to reload
      setExplorerKey(prev => prev + 1);
    } catch (error) {
      console.error("Error creating folder:", error);
    }
  };

  const handleNewNote = async (folderId?: string) => {
    const title = "Nueva Nota";
    const content = `# ${title}

Escribe aquí tu contenido...`;

    try {
      const { data: newNote } = await supabase
        .from("notes")
        .insert({
          title,
          content_md: content,
          slug: `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          owner_id: user.id,
          folder_id: folderId || null,
          sort_order: 0
        })
        .select()
        .single();

      if (newNote) {
        setCurrentNote(newNote);
        setViewMode("edit");
        
        // Signal to FileExplorer about new note creation
        window.dispatchEvent(new CustomEvent('newNoteCreated', { 
          detail: { note: newNote } 
        }));
        
        // Signal to FileExplorer that this note should be edited
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('startEditNote', { 
            detail: { noteId: newNote.id } 
          }));
        }, 50);
      }
    } catch (error) {
      console.error("Error creating note:", error);
    }
  };

  const handleMoveNote = async (noteId: string, targetFolderId: string | null) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ folder_id: targetFolderId })
        .eq('id', noteId);

      if (error) throw error;
      
      console.log(`Note ${noteId} moved to folder ${targetFolderId}`);
      
      // Update current note if it was moved
      if (currentNote && currentNote.id === noteId) {
        setCurrentNote({...currentNote, folder_id: targetFolderId});
      }
    } catch (error) {
      console.error('Error moving note:', error);
      alert('Error al mover la nota');
    }
  };

  const handleSave = async (content: string) => {
    if (!currentNote || !user) return;

    try {
      // Extract title from first line if it's a heading
      const lines = content.split('\n');
      const firstLine = lines[0]?.trim();
      const title = firstLine?.startsWith('# ') 
        ? firstLine.slice(2).trim() 
        : currentNote.title;

      // Update note
      const { data: updatedNote } = await supabase
        .from("notes")
        .update({
          title,
          content_md: content,
          updated_at: new Date().toISOString()
        })
        .eq("id", currentNote.id)
        .select()
        .single();

      if (updatedNote) {
        setCurrentNote(updatedNote);
        
        // Update wikilinks only after note is saved
        try {
          const wikilinks = extractWikiLinks(content);
          await updateNoteLinks(updatedNote.id, wikilinks, user.id);
        } catch (linkError) {
          console.error("Error updating wikilinks:", linkError);
          // Don't throw - note was saved successfully
        }
      }
    } catch (error) {
      console.error("Error saving note:", error);
      throw error;
    };
  };


  if (loading) {
    return (
      <div className="h-screen flex" style={{backgroundColor: '#0a0a0a'}}>
        {/* Skeleton del sidebar */}
        <div className="w-80 bg-gray-950 border-r border-gray-800">
          <div className="p-4">
            <div className="h-6 bg-gray-800 rounded animate-pulse mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-800 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-800 rounded animate-pulse w-3/4"></div>
              <div className="h-4 bg-gray-800 rounded animate-pulse w-1/2"></div>
            </div>
          </div>
        </div>
        
        {/* Skeleton del contenido principal */}
        <div className="flex-1 flex flex-col">
          <div className="border-b border-gray-900 bg-gray-950 px-3 py-3">
            <div className="h-6 bg-gray-800 rounded animate-pulse w-1/3"></div>
          </div>
          <div className="flex-1 p-6">
            <div className="space-y-4">
              <div className="h-4 bg-gray-800 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-800 rounded animate-pulse w-5/6"></div>
              <div className="h-4 bg-gray-800 rounded animate-pulse w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  // DESACTIVADO: Mostrar interfaz móvil si es dispositivo móvil
  // if (isMobile) {
  //   return <MobileStudyInterface user={user} />;
  // }

  // Si no es admin, mostrar solo interfaz de estudio
  console.log('🚦 Render decision - isAdmin:', isAdmin, 'user:', user?.id);
  if (!isAdmin) {
    console.log('🎓 Rendering StudyOnlyInterface for non-admin user');
    return <StudyOnlyInterface user={user} />;
  }
  
  console.log('👑 Rendering full editor for admin user');

  return (
    <div className={`h-screen flex ${darkBackground ? 'bg-black' : ''}`} style={darkBackground ? {} : {backgroundColor: '#0a0a0a'}}>
      {/* Sidebar */}
      {!isFocusMode && !isSplitView && viewMode !== "preview" && !isSidebarCollapsed && (
        <FileExplorer
          key={explorerKey}
          onNoteSelect={handleNoteSelect}
          onNewNote={handleNewNote}
          onNewFolder={handleNewFolder}
          selectedNoteId={currentNote?.id}
          onMoveNote={handleMoveNote}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {currentNote ? (
          <>

            {/* Editor/Preview */}
            <div className="flex-1 overflow-hidden">
              {viewMode === "edit" ? (
                <NoteEditor
                  initialContent={currentNote.content_md}
                  onSave={handleSave}
                  userId={user.id}
                  noteId={currentNote.id}
                  noteTitle={currentNote.title}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  onTitleChange={(title) => {
                    if (currentNote && title !== currentNote.title) {
                      setCurrentNote({...currentNote, title});
                    }
                  }}
                  theme="dark"
                  isFocusMode={isFocusMode}
                  isSplitView={isSplitView}
                  currentFolderId={currentNote.folder_id}
                  onNoteCreated={() => setExplorerKey(prev => prev + 1)}
                  onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
                  onToggleSplitView={() => setIsSplitView(!isSplitView)}
                  isSidebarCollapsed={isSidebarCollapsed}
                  onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                />
              ) : (
                <div className="h-full flex flex-col">
                  {/* Preview Status Bar */}
                  <div className={`flex items-center px-2 py-1.5 border-b ${darkBackground ? 'border-slate-600' : 'border-gray-800/50'} text-xs text-gray-300 ${darkBackground ? 'bg-black' : ''}`} style={darkBackground ? {} : {backgroundColor: '#0a0a0a'}}>
                    <span className="text-gray-400 flex-shrink-0">Modo Estudio</span>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      {/* Botón Dark Background */}
                      <button
                        onClick={() => setDarkBackground(!darkBackground)}
                        className={`w-7 h-7 flex items-center justify-center text-xs rounded transition-colors flex-shrink-0 ${
                          darkBackground
                            ? 'bg-yellow-600/90 hover:bg-yellow-500/90 border border-yellow-500/50'
                            : 'bg-slate-800 hover:bg-slate-700 border border-slate-600/50'
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
                        ref={outlineButtonRef}
                        onClick={() => setShowOutline(!showOutline)}
                        className="w-7 h-7 flex items-center justify-center text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 rounded transition-colors flex-shrink-0"
                        title="Ver esquema"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <line x1="9" y1="9" x2="15" y2="9"/>
                          <line x1="9" y1="15" x2="15" y2="15"/>
                        </svg>
                      </button>
                      <button
                        ref={annotationsButtonRef}
                        onClick={() => setShowAnnotations(!showAnnotations)}
                        className="w-7 h-7 flex items-center justify-center text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 rounded transition-colors flex-shrink-0"
                        title="Ver anotaciones"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14,2 14,8 20,8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10,9 9,9 8,9"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => setViewMode("edit")}
                        className="w-7 h-7 flex items-center justify-center text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 rounded transition-colors flex-shrink-0"
                        title="Editar"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" className="text-white">
                          <path fill="currentColor" d="M22.994,5.195c-.011-.067-.277-1.662-1.378-2.774-1.111-1.09-2.712-1.355-2.779-1.366-.119-.021-.239,.005-.342,.068-.122,.075-3.047,1.913-9.049,7.886C3.12,15.305,1.482,17.791,1.415,17.894c-.045,.07-.073,.15-.079,.233l-.334,4.285c-.011,.146,.042,.289,.145,.393,.094,.094,.221,.146,.354,.146,.013,0,.026,0,.039-.001l4.306-.333c.083-.006,.162-.033,.232-.078,.103-.066,2.6-1.697,8.924-7.991,6.002-5.974,7.848-8.886,7.923-9.007,.064-.103,.089-.225,.07-.344ZM14.295,13.838c-5.54,5.514-8.14,7.427-8.661,7.792l-3.59,.278,.278-3.569c.368-.521,2.292-3.109,7.828-8.619,1.773-1.764,3.278-3.166,4.518-4.264,.484,.112,1.721,.468,2.595,1.326,.868,.851,1.23,2.046,1.346,2.526-1.108,1.24-2.525,2.75-4.314,4.531Zm5.095-5.419c-.236-.681-.669-1.608-1.427-2.352-.757-.742-1.703-1.166-2.396-1.397,1.807-1.549,2.902-2.326,3.292-2.59,.396,.092,1.362,.375,2.05,1.049,.675,.682,.963,1.645,1.058,2.042-.265,.388-1.039,1.469-2.577,3.247Z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Preview Content */}
                  <div className={`flex-1 overflow-y-auto ${darkBackground ? 'bg-black' : 'bg-gray-950'}`}>
                    <NotePreview 
                      content={currentNote.content_md} 
                      studyMode={true}
                      noteId={currentNote.id}
                      userId={user.id}
                      onWikiLinkClick={async (noteTitle: string) => {
                        console.log("Editor page wikilink clicked:", noteTitle);
                        if (!user?.id) return;
                        
                        // Buscar o crear nota
                        const { data: targetNote } = await supabase
                          .from("notes")
                          .select("*")
                          .eq("owner_id", user.id)
                          .ilike("title", noteTitle)
                          .limit(1)
                          .single();

                        if (targetNote) {
                          setCurrentNote(targetNote);
                        } else {
                          // Crear nueva nota
                          const { data: newNote } = await supabase
                            .from("notes")
                            .insert({
                              title: noteTitle,
                              content_md: `# ${noteTitle}\n\nNueva nota creada desde wikilink.`,
                              owner_id: user.id,
                              folder_id: currentNote?.folder_id || null,
                              sort_order: 0
                            })
                            .select()
                            .single();

                          if (newNote) {
                            setCurrentNote(newNote);
                            // Refrescar FileExplorer
                            setExplorerKey(prev => prev + 1);
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={`flex-1 ${darkBackground ? 'bg-black' : 'bg-gray-950'}`}>
            {/* Área vacía sin mensaje */}
          </div>
        )}
      </div>

      {/* Panel de Esquema */}
      {currentNote && (
        <DocumentOutline
          content={currentNote.content_md}
          isOpen={showOutline}
          onToggle={() => setShowOutline(!showOutline)}
          buttonRef={outlineButtonRef}
          onNavigate={(line) => {
            // En modo estudio, buscar el elemento por ID y hacer scroll
            const lines = currentNote.content_md.split('\n');
            const targetLine = lines[line - 1];
            
            if (targetLine && targetLine.match(/^#{1,6}\s/)) {
              const match = targetLine.match(/^(#{1,6})\s+(.+)$/);
              if (match) {
                const headerText = match[2].trim();
                // Crear ID similar al que usa ReactMarkdown
                const headerId = headerText.toLowerCase()
                  .replace(/[^\w\s-]/g, '')
                  .replace(/\s+/g, '-')
                  .substring(0, 50);
                
                // Buscar el elemento en el DOM
                const element = document.getElementById(headerId);
                if (element) {
                  element.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                  });
                } else {
                  // Fallback: buscar por texto del header
                  const allHeaders = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                  for (const header of allHeaders) {
                    if (header.textContent?.includes(headerText)) {
                      header.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                      });
                      break;
                    }
                  }
                }
              }
            }
          }}
        />
      )}

      {/* Panel de Anotaciones */}
      <AnnotationsList
        isVisible={showAnnotations}
        buttonRef={annotationsButtonRef}
        annotations={(() => {
          const stored = localStorage.getItem('simple-annotations');
          try {
            return stored ? JSON.parse(stored) : [];
          } catch {
            return [];
          }
        })()}
        onAnnotationClick={(annotation) => {
          // Buscar el párrafo que contiene la anotación y hacer clic en el icono
          const paragraphs = document.querySelectorAll('p');
          for (const paragraph of paragraphs) {
            const noteIcon = paragraph.querySelector('button[title="Ver/editar anotación"]');
            if (noteIcon && noteIcon.getAttribute('data-line-id') === annotation.lineId) {
              // Hacer scroll al párrafo
              paragraph.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
              // Hacer clic en el icono después de un breve delay
              setTimeout(() => {
                (noteIcon as HTMLElement).click();
              }, 300);
              break;
            }
          }
          setShowAnnotations(false);
        }}
        onClose={() => setShowAnnotations(false)}
      />

    </div>
  );
}
