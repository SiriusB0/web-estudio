"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useMemo, useState, useEffect, useRef } from "react";
import { headerTextClasses, headerSizes, headerSizesStudy, headerWeights } from "../../lib/theme";
import { Highlight, themes } from "prism-react-renderer";
import { SimpleAnnotation } from "./SimpleAnnotation";
import { supabase } from '@/lib/supabaseClient';
import { HighlightRecord } from '@/lib/supabase/highlights';
import { useStudyHighlights } from '@/hooks/useStudyHighlights';
import { StudyHighlightLayer } from '@/components/highlights/StudyHighlightLayer';
import { uploadFlashcardImage } from '@/lib/notes/flashcards';
import MermaidRenderer from "./MermaidRenderer";

// Interface para datos de highlight con imágenes
interface StudyHighlight extends Omit<HighlightRecord, 'images'> {
  images?: { [key: string]: any };
}

// Función para subir imágenes específica para notas
async function uploadImageToSupabase(file: File): Promise<string> {
  const imageUrl = await uploadFlashcardImage(file, `note_${Date.now()}`, 'front');
  if (!imageUrl) {
    throw new Error('Failed to upload image');
  }
  return imageUrl;
}

interface Section {
  id: string;
  level: number;
  title: string;
  content: string[];
  children: Section[];
}

interface NotePreviewProps {
  content: string;
  onWikiLinkClick?: (linkText: string) => void;
  studyMode?: boolean; // Nuevo prop para alternar entre rem y em
  noteId?: string; // ID de la nota para highlights
  userId?: string; // ID del usuario para highlights
}

export default function NotePreview({ content, onWikiLinkClick, studyMode = false, noteId, userId }: NotePreviewProps) {
  console.log('🎨 NotePreview render - studyMode:', studyMode, 'Content preview:', content?.substring(0, 50));
  const contentRef = useRef<HTMLDivElement>(null);
  // Estado inicial de secciones colapsadas - calculado inmediatamente
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    // Si es modo estudio, inicializar inmediatamente con secciones colapsadas
    if (studyMode && content) {
      const sectionsToCollapse = new Set<string>();
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const title = headerMatch[2].trim();
          const sectionId = `section-${index}-${title.replace(/\s+/g, '-').toLowerCase()}`;
          
          // Solo colapsar H2, H3, H4, H5, H6 - NO H1
          if (level > 1) {
            sectionsToCollapse.add(sectionId);
          }
        }
      });
      
      return sectionsToCollapse;
    }
    return new Set();
  });
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [annotationPosition, setAnnotationPosition] = useState({ x: 0, y: 0 });
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [selectedHighlight, setSelectedHighlight] = useState<StudyHighlight | null>(null);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showNotePanel, setShowNotePanel] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [currentNotaId, setCurrentNotaId] = useState<string | null>(null);
  const [currentNotaText, setCurrentNotaText] = useState('');
  const [noteEditorContent, setNoteEditorContent] = useState('');
  
  // Funciones globales para el editor
  useEffect(() => {
    (window as any).openImageModal = (imageUrl: string) => {
      setSelectedImage(imageUrl);
      setShowImageModal(true);
    };
    
    (window as any).deleteImage = (imageId: string) => {
      if (selectedHighlight) {
        const currentText = selectedHighlight.note_text || '';
        const newText = currentText.replace(`[IMG:${imageId}]`, '');
        const newImages = { ...selectedHighlight.images };
        delete newImages[imageId];
        
        setSelectedHighlight({
          ...selectedHighlight,
          note_text: newText,
          images: newImages
        });
      }
    };
    
    return () => {
      delete (window as any).openImageModal;
      delete (window as any).deleteImage;
    };
  }, [selectedHighlight]);

  // Función para abrir panel de notas
  const openNotePanel = async (notaId: string, text: string) => {
    setCurrentNotaId(notaId);
    setCurrentNotaText(text);
    
    // Cargar nota existente desde Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Buscar highlight existente para esta nota
      const existingHighlight = highlights.find(h => h.selector_exact === text);
      if (existingHighlight) {
        // Cargar imágenes desde la base de datos si existen
        const highlightWithImages = {
          ...existingHighlight,
          images: existingHighlight.images ? 
            (typeof existingHighlight.images === 'string' ? 
              JSON.parse(existingHighlight.images) : 
              existingHighlight.images) : {}
        };
        setSelectedHighlight(highlightWithImages);
      } else {
        // Crear nuevo highlight temporal
        setSelectedHighlight({
          id: `temp_${Date.now()}`,
          doc_id: noteId || '',
          user_id: user.id,
          selector_exact: text,
          note_text: `Texto seleccionado: "${text}"\n\n`,
          color: '#3b82f6',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          images: {}
        });
      }
      
      setShowNotePanel(true);
    } catch (error) {
      console.error('Error opening note panel:', error);
    }
  };

  // Función para cerrar panel y guardar
  const closeNotePanel = async () => {
    if (currentNotaId && noteEditorContent.trim()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const docId = `note_${currentNotaId}`;
          
          // Intentar actualizar o crear nueva nota
          const { error } = await supabase
            .from('study_highlights')
            .upsert({
              doc_id: docId,
              user_id: user.id,
              selector_exact: currentNotaText,
              note_text: noteEditorContent,
              color: '#e0f2fe'
            });
            
          if (error) {
            console.error('Error saving note:', error);
          }
        }
      } catch (error) {
        console.error('Error saving note:', error);
      }
    }
    
    setShowNotePanel(false);
    setCurrentNotaId(null);
    setCurrentNotaText('');
    setNoteEditorContent('');
  };

  // Función para subir imagen a Supabase Storage
  const uploadImageToSupabase = async (file: File): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/notes/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('flashcard-images')
        .upload(fileName, file);

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from('flashcard-images')
        .getPublicUrl(fileName);

      return publicUrl.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };
  const [hoveredLineId, setHoveredLineId] = useState<string>('');
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [currentLineId, setCurrentLineId] = useState<string>('');
  const [annotations, setAnnotations] = useState<Array<{id: string, text: string, lineId: string}>>([]);

  // Hook para highlights - solo en modo estudio
  const {
    highlights,
    loading: highlightsLoading,
    createHighlight,
    updateHighlight,
    deleteHighlight
  } = useStudyHighlights(studyMode && noteId ? noteId : '');

  // Cargar anotaciones al iniciar
  useEffect(() => {
    const stored = localStorage.getItem('simple-annotations');
    if (stored) {
      try {
        setAnnotations(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading annotations:', e);
      }
    }
  }, []);

  // Atajos de teclado - SOLO en modo NO estudio
  useEffect(() => {
    console.log('🔍 NotePreview: studyMode prop value:', studyMode);
    
    if (studyMode) {
      console.log('🚫 NotePreview: Keyboard shortcuts disabled in study mode');
      return; // No agregar event listeners en modo estudio
    }

    console.log('✅ NotePreview: Adding keyboard shortcuts (NOT in study mode)');
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key === 'n') {
        event.preventDefault();
        console.log('📝 NotePreview: Creating legacy annotation');
        // Crear anotación en la posición del cursor
        setAnnotationPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        setShowAnnotation(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [studyMode]);
  
  
  const handleWikilinkClick = (noteTitle: string) => {
    if (onWikiLinkClick) {
      onWikiLinkClick(noteTitle);
    }
  };

  // Función para alternar colapso de sección
  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Parsear contenido en secciones basadas en headers con jerarquía
  const parsedSections = useMemo(() => {
    if (!content) return [];
    const lines = content.split('\n');
    const sections: Section[] = [];
    
    let introContent: string[] = [];
    let currentSection: Section | null = null;
    let sectionStack: Section[] = [];
    
    lines.forEach((line, index) => {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();
        const sectionId = `section-${index}-${title.replace(/\s+/g, '-').toLowerCase()}`;
        
        const newSection = {
          id: sectionId,
          level,
          title,
          content: [],
          children: []
        };
        
        // Encontrar el padre correcto en la jerarquía
        while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level >= level) {
          sectionStack.pop();
        }
        
        if (sectionStack.length === 0) {
          // Es una sección de nivel raíz
          sections.push(newSection);
        } else {
          // Es una subsección
          sectionStack[sectionStack.length - 1].children.push(newSection);
        }
        
        sectionStack.push(newSection);
        currentSection = newSection;
      } else if (currentSection) {
        // Agregar línea al contenido de la sección actual
        currentSection.content.push(line);
      } else {
        // Contenido antes del primer header
        introContent.push(line);
      }
    });
    
    // Agregar contenido introductorio si existe
    if (introContent.some(line => line.trim())) {
      sections.unshift({
        id: 'intro',
        level: 0,
        title: '',
        content: introContent,
        children: []
      });
    }
    
    return sections;
  }, [content]);

  // Actualizar secciones colapsadas cuando cambia el contenido o modo
  useEffect(() => {
    if (studyMode && parsedSections.length > 0) {
      const sectionsToCollapse = new Set<string>();
      
      const collectSectionIds = (sections: Section[]) => {
        sections.forEach(section => {
          // Solo colapsar H2, H3, H4, H5, H6 - NO H1 ni intro (level 0)
          if (section.level > 1) {
            sectionsToCollapse.add(section.id);
          }
          if (section.children) {
            collectSectionIds(section.children);
          }
        });
      };
      
      collectSectionIds(parsedSections);
      // Solo actualizar si hay cambios para evitar re-renders innecesarios
      setCollapsedSections(prev => {
        const prevArray = Array.from(prev).sort();
        const newArray = Array.from(sectionsToCollapse).sort();
        if (prevArray.join(',') !== newArray.join(',')) {
          return sectionsToCollapse;
        }
        return prev;
      });
    } else if (!studyMode) {
      // En modo normal, expandir todas las secciones
      setCollapsedSections(new Set());
    }
  }, [studyMode, parsedSections]);

  // Procesar contenido para reemplazar wikilinks y colores manteniendo markdown
  const processContent = (text: string) => {
    // Limpiar corchetes extra múltiples
    let cleanContent = text
      .replace(/\]\]\]\]+/g, ']]')  // Múltiples ]] extra
      .replace(/\[\[\[\[+/g, '[[');  // Múltiples [[ extra
    
    // Procesar wikilinks normales
    cleanContent = cleanContent.replace(/\[\[([^\]]+)\]\]/g, (match, linkText) => {
      const cleaned = linkText.trim();
      const linkId = cleaned.replace(/\s+/g, '_');
      return `[${cleaned}](wikilink-${linkId})`;
    });

    // Procesar colores {#hex|texto} -> <span style="color: hex">texto</span>
    cleanContent = cleanContent.replace(/\{(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|[a-zA-Z]+)\|([^}]*)\}/g, (match, color, text) => {
      return `<span style="color: ${color}">${text}</span>`;
    });
    
    // Primero procesar divisores antes de convertir saltos de línea
    cleanContent = cleanContent.replace(/^([-*]{3,})\s*$/gm, '<hr class="my-6 border-t-2 border-gray-500 opacity-60">');
    
    // Luego convertir todos los saltos de línea en <br> tags para preservar múltiples saltos
    cleanContent = cleanContent.replace(/\n/g, '<br>');
    
    return cleanContent;
  };

  const renderMarkdownComponents = {
    a: ({ href, children, ...props }: any) => {
      if (href?.startsWith('wikilink-')) {
        const noteTitle = href.replace('wikilink-', '').replace(/_/g, ' ');
        return (
          <span 
            className="text-blue-400 bg-blue-400/10 px-2 py-1 rounded underline cursor-pointer hover:text-blue-300 hover:bg-blue-400/20 transition-all duration-200 font-medium"
            onClick={(e: any) => {
              e.preventDefault();
              e.stopPropagation();
              handleWikilinkClick(noteTitle);
            }}
          >
            {children}
          </span>
        );
      }
      return (
        <a 
          href={href} 
          className="text-green-400 bg-green-400/10 px-2 py-1 rounded underline hover:text-green-300 hover:bg-green-400/20 transition-all duration-200 font-medium"
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    },
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "");
      if (!inline && match) {
        const language = match[1] as any;
        const code = String(children).replace(/\n$/, "");
        
        // Renderizar diagramas Mermaid
        if (language === 'mermaid') {
          return <MermaidRenderer chart={code} />;
        }
        
        return <CodeBlock code={code} language={language} />;
      }
      return (
        <code className={`bg-gray-700 text-gray-200 px-1 py-0.5 rounded font-mono ${
          studyMode ? 'text-sm sm:text-base px-2 sm:px-3 py-1 sm:py-1.5' : 'text-sm'
        }`}>
          {children}
        </code>
      );
    },
    p: ({ children }: any) => {
      // Crear ID estable basado en el contenido del párrafo
      const textContent = typeof children === 'string' ? children : 
        Array.isArray(children) ? children.join('') : String(children);
      const lineId = `paragraph-${textContent.slice(0, 50).replace(/\s+/g, '-').toLowerCase()}`;
      const hasAnnotation = annotations.some(ann => ann.lineId === lineId);
      const showButton = hoveredLineId === lineId;

      // Estilos optimizados para móvil cuando studyMode es true
      const dynamicSize = getComputedStyle(document.documentElement).getPropertyValue('--dynamic-text-size') || '1rem';
      const mobileStyles = studyMode ? {
        fontSize: dynamicSize,
        lineHeight: window.innerWidth < 640 ? '1.8' : '1.7',
        marginBottom: window.innerWidth < 640 ? '1.2rem' : '1rem'
      } : {};

      const handleMouseEnter = () => {
        // Limpiar timeout anterior si existe
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
        }
        
        // Crear nuevo timeout de 2 segundos
        const timeout = setTimeout(() => {
          setHoveredLineId(lineId);
        }, 2000);
        
        setHoverTimeout(timeout);
      };

      const handleMouseLeave = () => {
        // Limpiar timeout y ocultar botón
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
          setHoverTimeout(null);
        }
        setHoveredLineId('');
      };

      return (
        <div 
          className="relative inline-block w-full"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <p 
            className={`text-gray-300 leading-relaxed mb-3 whitespace-pre-wrap ${
              studyMode ? 'text-base sm:text-lg text-justify' : ''
            }`}
            style={mobileStyles}
          >
            {children}
            
            {/* Icono de nota existente */}
            {hasAnnotation && (
              <button
                className="ml-2 w-4 h-4 text-gray-400 hover:text-gray-200 opacity-50 hover:opacity-80 transition-all inline-flex items-center justify-center align-top"
                data-line-id={lineId}
                onClick={(e) => {
                  const annotation = annotations.find(ann => ann.lineId === lineId);
                  if (annotation) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setAnnotationPosition({ x: rect.left - 320, y: rect.top });
                    setEditingAnnotationId(annotation.id);
                    setShowAnnotation(true);
                    setCurrentLineId(lineId);
                  }
                }}
                title="Ver/editar anotación"
              >
                📄
              </button>
            )}
          </p>
        </div>
      );
    },
    li: ({ children }: any) => {
      // Crear ID específico para elementos de lista
      const textContent = typeof children === 'string' ? children : 
        Array.isArray(children) ? children.join('') : String(children);
      const lineId = `listitem-${textContent.slice(0, 50).replace(/\s+/g, '-').toLowerCase()}`;
      const hasAnnotation = annotations.some(ann => ann.lineId === lineId);
      const showButton = hoveredLineId === lineId;
      
      // Estilos móviles para elementos de lista
      const listItemStyles = studyMode ? {
        fontSize: window.innerWidth < 640 ? '1.1rem' : '1rem',
        lineHeight: window.innerWidth < 640 ? '1.7' : '1.6',
        marginBottom: window.innerWidth < 640 ? '0.8rem' : '0.6rem'
      } : {};

      const handleMouseEnter = () => {
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
        }
        
        const timeout = setTimeout(() => {
          setHoveredLineId(lineId);
        }, 2000);
        
        setHoverTimeout(timeout);
      };

      const handleMouseLeave = () => {
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
          setHoverTimeout(null);
        }
        setHoveredLineId('');
      };

      return (
        <li 
          className={`text-gray-300 relative ${
            studyMode ? 'text-base sm:text-lg text-justify' : ''
          }`}
          style={listItemStyles}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {children}
          
          {/* Icono de nota existente para lista */}
          {hasAnnotation && (
            <button
              className="ml-2 w-4 h-4 text-gray-400 hover:text-gray-200 opacity-50 hover:opacity-80 transition-all inline-flex items-center justify-center align-top"
              onClick={(e) => {
                const annotation = annotations.find(ann => ann.lineId === lineId);
                if (annotation) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setAnnotationPosition({ x: rect.left - 320, y: rect.top });
                  setEditingAnnotationId(annotation.id);
                  setShowAnnotation(true);
                  setCurrentLineId(lineId);
                }
              }}
              title="Ver/editar anotación"
            >
              📄
            </button>
          )}
          
          {/* Botón + para nueva anotación en lista */}
          {!hasAnnotation && showButton && (
            <button
              className="ml-2 w-5 h-5 text-white hover:text-gray-200 bg-white/20 hover:bg-white/30 rounded-full transition-all inline-flex items-center justify-center text-sm align-top border border-white/40"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setAnnotationPosition({ x: rect.left - 320, y: rect.top });
                setEditingAnnotationId(null);
                setShowAnnotation(true);
                setCurrentLineId(lineId);
              }}
              title="Agregar anotación a este elemento"
            >
              +
            </button>
          )}
        </li>
      );
    },
    blockquote: ({ children }: any) => (
      <blockquote className={`border-l-4 border-gray-600 bg-gray-800 pl-4 py-2 my-6 text-gray-300 ${
        studyMode ? 'text-base sm:text-lg pl-3 sm:pl-4 py-3 sm:py-4 my-6 sm:my-8 text-justify' : ''
      }`}>
        {children}
      </blockquote>
    ),
    ul: ({ children }: any) => (
      <ul className={`list-disc list-inside text-gray-300 mb-3 ${
        studyMode ? 'mb-3 sm:mb-4 space-y-1 sm:space-y-2' : ''
      }`}>{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className={`list-decimal list-inside text-gray-300 mb-3 ${
        studyMode ? 'mb-3 sm:mb-4 space-y-1 sm:space-y-2' : ''
      }`}>{children}</ol>
    ),
    hr: ({ ...props }: any) => (
      <hr className="my-8 border-t-2 border-gray-500 opacity-60" {...props} />
    ),
    thematicBreak: ({ ...props }: any) => (
      <hr className="my-8 border-t-2 border-gray-500 opacity-60" {...props} />
    )
  };

  // Función recursiva para renderizar secciones con jerarquía
  const renderSection = (section: Section, depth = 0): React.ReactElement => {
    const isCollapsed = collapsedSections.has(section.id);
    const hasContent = section.content.some((line: string) => line.trim());
    const hasChildren = section.children && section.children.length > 0;
    
    if (section.level === 0) {
      // Contenido introductorio sin header
      return (
        <div key={section.id}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={renderMarkdownComponents}
          >
            {processContent(section.content.join('\n'))}
          </ReactMarkdown>
        </div>
      );
    }
    
    // === Modo Estudio: Configuración de tamaños y colores de encabezados ===
    // Colores: definidos en headerTextClasses (theme.ts)
    // Tamaños: headerSizes (rem) para vista normal, headerSizesStudy (em) para modo estudio
    // Pesos: headerWeights para cada nivel
    
    const baseHeaderClasses: Record<number, string> = {
      1: "mb-8", // H1 mantiene su espaciado amplio
      2: "mb-3", // H2 con más espacio (antes mb-1)
      3: "mb-3", // H3 con más espacio (antes mb-1)
      4: "mb-2", // H4 con más espacio (antes mb-0.5)
      5: "mb-2", // H5 con más espacio (antes mb-0.5)
      6: "mb-2"  // H6 con más espacio (antes mb-0.5)
    };
    
    const colorClass = headerTextClasses[section.level] || 'text-gray-300';
    const baseClass = baseHeaderClasses[section.level] || "mb-2";
    
    // Usar tamaños em para modo estudio, rem para vista normal
    const currentSizes = studyMode ? headerSizesStudy : headerSizes;
    let fontSize = currentSizes[`h${section.level}` as keyof typeof currentSizes] || '1rem';
    const fontWeight = headerWeights[`h${section.level}` as keyof typeof headerWeights] || '500';
    
    // Ajustar tamaños para móvil en modo estudio
    if (studyMode && typeof window !== 'undefined' && window.innerWidth < 640) {
      const mobileSizes = {
        h1: '1.4rem', // Reducido de 1.8rem para móvil
        h2: '1.3rem', // Reducido de 1.6rem para móvil
        h3: '1.2rem', // Reducido de 1.4rem para móvil
        h4: '1.1rem', // Reducido de 1.2rem para móvil
        h5: '1.0rem', // Reducido de 1.1rem para móvil
        h6: '0.95rem' // Reducido de 1.0rem para móvil
      };
      fontSize = mobileSizes[`h${section.level}` as keyof typeof mobileSizes] || fontSize;
    }
    
    const sizeStyle = { 
      fontSize: fontSize,
      fontWeight: fontWeight
    };
    const headerClass = `${colorClass} ${baseClass}`;
    
    // Definir colores hover y escalas según el nivel
    const hoverColors = {
      1: 'hover:text-white',
      2: 'hover:text-white', 
      3: 'hover:text-white',
      4: 'hover:text-[#E8E8E8]',
      5: 'hover:text-[#C0C0C0]',
      6: 'hover:text-[#A0A0A0]'
    };
    
    const hoverScales = {
      1: 'hover:scale-[1.005]', // H1 con escala mínima para evitar cortes
      2: 'hover:scale-[1.02]',
      3: 'hover:scale-[1.01]',
      4: 'hover:scale-[1.01]',
      5: 'hover:scale-[1.005]',
      6: 'hover:scale-[1.005]'
    };
    
    const hoverColor = hoverColors[section.level as keyof typeof hoverColors] || 'hover:text-white';
    const hoverScale = hoverScales[section.level as keyof typeof hoverScales] || 'hover:scale-[1.005]';
    
    const headerProps = {
      className: `${headerClass} ${hoverColor} ${hoverScale} cursor-pointer transition-all duration-300 ease-out select-none transform-gpu`,
      style: {
        ...sizeStyle,
        transformOrigin: 'center'
      },
      onClick: () => toggleSection(section.id),
      children: section.title
    };
    
    return (
      <div key={section.id} className="mb-3" style={{ marginLeft: `${depth * 16}px` }}>
        {section.level === 1 && <h1 {...headerProps} />}
        {section.level === 2 && <h2 {...headerProps} />}
        {section.level === 3 && <h3 {...headerProps} />}
        {section.level === 4 && <h4 {...headerProps} />}
        {section.level === 5 && <h5 {...headerProps} />}
        {section.level === 6 && <h6 {...headerProps} />}
        
        {!isCollapsed && (
          <>
            {hasContent && (
              <div className={`ml-4 ${studyMode ? 'ml-2 sm:ml-4' : ''}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={renderMarkdownComponents}
                >
                  {processContent(section.content.join('\n'))}
                </ReactMarkdown>
              </div>
            )}
            
            {hasChildren && (
              <div>
                {section.children.map((child: any) => renderSection(child, depth + 1))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Bloque de código con Prism (tema Night Owl) y botón copiar
  function CodeBlock({ code, language }: { code: string; language: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      } catch (e) {
        console.error("Copy failed", e);
      }
    };

    return (
      <div className="relative group my-3 overflow-hidden rounded-lg border border-gray-700/60 bg-[#011627]">
        <button
          onClick={handleCopy}
          className="absolute right-2 top-2 z-10 rounded-md bg-gray-800/80 px-2 py-1 text-xs text-gray-200 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-700"
          aria-label="Copiar código"
          type="button"
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
        <Highlight
          code={code}
          language={language as any}
          theme={themes.nightOwl}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={`${className} m-0 max-h-[600px] overflow-auto p-4 text-sm`} style={style}>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    );
  }

  const handleSaveAnnotation = (note: string) => {
    let updatedAnnotations;
    
    if (editingAnnotationId) {
      // Editar anotación existente
      updatedAnnotations = annotations.map(ann => 
        ann.id === editingAnnotationId 
          ? { ...ann, text: note }
          : ann
      );
    } else {
      // Crear nueva anotación
      const newAnnotation = {
        id: Date.now().toString(),
        text: note,
        lineId: currentLineId
      };
      updatedAnnotations = [...annotations, newAnnotation];
    }
    
    setAnnotations(updatedAnnotations);
    setShowAnnotation(false);
    setEditingAnnotationId(null);
    setCurrentLineId('');
    
    // Guardar en localStorage
    localStorage.setItem('simple-annotations', JSON.stringify(updatedAnnotations));
  };

  const handleDeleteAnnotation = () => {
    if (editingAnnotationId) {
      const updatedAnnotations = annotations.filter(ann => ann.id !== editingAnnotationId);
      setAnnotations(updatedAnnotations);
      localStorage.setItem('simple-annotations', JSON.stringify(updatedAnnotations));
    }
    setShowAnnotation(false);
    setEditingAnnotationId(null);
    setCurrentLineId('');
  };

  const handleCloseAnnotation = () => {
    setShowAnnotation(false);
    setEditingAnnotationId(null);
    setCurrentLineId('');
  };

  return (
    <div className={`${studyMode ? 'px-0 py-1 sm:px-1 md:px-2 sm:py-2' : 'p-4'} max-w-full overflow-hidden`}>
      {/* Contador de anotaciones en el header - SOLO en modo NO estudio */}
      {!studyMode && annotations.length > 0 && (
        <div className="mb-4 text-sm text-gray-400">
          📝 {annotations.length} anotación{annotations.length > 1 ? 'es' : ''}
        </div>
      )}
      
      <div ref={contentRef} className={`prose prose-invert max-w-full break-words overflow-wrap-anywhere relative ${
        studyMode ? 'prose-sm sm:prose-base' : ''
      }`} style={studyMode ? { margin: 0, padding: '0.25rem' } : {}}>
        {parsedSections.map((section) => renderSection(section))}
        
        {/* StudyHighlightLayer - SOLO en modo estudio */}
        {studyMode && noteId && userId && (
          <StudyHighlightLayer
            rootRef={contentRef}
            docId={noteId}
            userId={userId}
            highlights={highlights}
            isEnabled={true}
            onHighlightClick={(highlight, position) => {
              console.log('🎯 NotePreview: Highlight clicked:', highlight, 'Position:', position);
              // Convertir HighlightRecord a StudyHighlight
              const studyHighlight: StudyHighlight = {
                ...highlight,
                images: highlight.images ? 
                  (typeof highlight.images === 'string' ? 
                    JSON.parse(highlight.images) : 
                    highlight.images) : {}
              };
              setSelectedHighlight(studyHighlight);
              if (position) {
                // Ajustar posición relativa al contenedor de la nota
                const contentRect = contentRef.current?.getBoundingClientRect();
                if (contentRect) {
                  setModalPosition({
                    x: position.x - contentRect.left,
                    y: position.y - contentRect.top
                  });
                } else {
                  setModalPosition(position);
                }
              }
              setShowHighlightModal(true);
            }}
            onCreateHighlight={async (selector, range) => {
              console.log('🎯 NotePreview: Creating highlight:', selector);
              createHighlight(selector, range);
            }}
          />
        )}
      </div>
      
      {/* SimpleAnnotation - SOLO en modo NO estudio */}
      {!studyMode && (
        <SimpleAnnotation
          onSave={handleSaveAnnotation}
          onClose={handleCloseAnnotation}
          onDelete={editingAnnotationId ? handleDeleteAnnotation : undefined}
          position={annotationPosition}
          isVisible={showAnnotation}
          existingNote={editingAnnotationId ? annotations.find(a => a.id === editingAnnotationId)?.text : undefined}
          lineContent={currentLineId ? 
            // Extraer contenido de la línea basado en el lineId
            (() => {
              const lineMatch = currentLineId.match(/^line-(.+)$/);
              if (lineMatch) {
                return lineMatch[1].replace(/-/g, ' ');
              }
              return 'Anotación';
            })()
            : undefined
          }
        />
      )}

      {/* Modal para editar highlights - SOLO en modo estudio */}
      {studyMode && showHighlightModal && selectedHighlight && (
        <>
          <style jsx>{`
            @keyframes slideInFromRight {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
            
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
          `}</style>
          
          {/* Drawer lateral */}
          <div 
            className="fixed right-0 top-0 h-full w-96 bg-slate-800 border-l border-slate-700 shadow-2xl z-50 flex flex-col"
            style={{
              animation: 'slideInFromRight 0.3s ease-out'
            }}
          >
            {/* Botones arriba */}
            <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800/50">
              <button
                onClick={() => {
                  setShowHighlightModal(false);
                  setSelectedHighlight(null);
                }}
                className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Botones de acción - Solo para propietario */}
              {userId === selectedHighlight?.user_id && (
                <div className="flex items-center gap-2">
                  {/* Botón eliminar */}
                  <button
                    onClick={async () => {
                      if (!selectedHighlight) return;
                      
                      if (window.confirm('¿Eliminar esta mini nota?')) {
                        try {
                          await deleteHighlight(selectedHighlight.id);
                          setShowHighlightModal(false);
                          setSelectedHighlight(null);
                        } catch (error) {
                          console.error('Error eliminando highlight:', error);
                          alert('Error al eliminar la mini nota.');
                        }
                      }
                    }}
                    className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
                    title="Eliminar mini nota"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  
                  {/* Botón guardar */}
                  <button
                    onClick={async () => {
                      try {
                        // Guardado completo: texto, color e imágenes
                        const highlightData = {
                          note_text: selectedHighlight?.note_text || '',
                          color: selectedHighlight?.color,
                          images: JSON.stringify(selectedHighlight?.images || {})
                        } as any;
                        await updateHighlight(selectedHighlight!.id, highlightData);
                        setShowHighlightModal(false);
                        setSelectedHighlight(null);
                      } catch (error) {
                        console.error('Error guardando highlight:', error);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Guardar
                  </button>
                </div>
              )}
            </div>

            {/* Texto resaltado */}
            <div className="p-4 border-b border-slate-700">
              <p className="text-slate-300 text-base mb-3 font-medium">Texto resaltado:</p>
              <p className="text-slate-200 bg-blue-500/20 border border-blue-500/30 rounded px-3 py-2 text-sm">
                "{selectedHighlight.selector_exact}"
              </p>
            </div>
            
            {/* Área de contenido expandida */}
            <div className="flex-1 flex flex-col p-4">
              {/* Botones de herramientas - Solo para propietario */}
              {userId === selectedHighlight?.user_id && (
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file && selectedHighlight) {
                        try {
                          // Subir imagen a Supabase Storage
                          const imageUrl = await uploadImageToSupabase(file);
                          const imageId = Date.now().toString();
                          
                          console.log('Image uploaded:', { imageId, imageUrl });
                          
                          // Guardar URL de Supabase directamente
                          const newImages = { ...selectedHighlight.images, [imageId]: imageUrl };
                          const currentText = selectedHighlight.note_text || '';
                          const newText = currentText + `\n[IMG:${imageId}]`;
                          
                          console.log('Updating highlight:', { newText, newImages });
                          
                          setSelectedHighlight({
                            ...selectedHighlight,
                            note_text: newText,
                            images: newImages
                          });
                        } catch (error) {
                          console.error('Error uploading image:', error);
                          // Fallback a almacenamiento local temporal
                          const imageId = Date.now().toString();
                          const newImages = { ...selectedHighlight.images, [imageId]: file };
                          const currentText = selectedHighlight.note_text || '';
                          const newText = currentText + `\n[IMG:${imageId}]`;
                          
                          setSelectedHighlight({
                            ...selectedHighlight,
                            note_text: newText,
                            images: newImages
                          });
                        }
                      }
                      e.target.value = '';
                    }}
                    className="hidden"
                    id="image-upload"
                  />
                  <label 
                    htmlFor="image-upload"
                    className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer transition-colors"
                    aria-label="Subir imagen"
                    title="Subir imagen"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </label>
                </div>
              )}
              
              {/* Editor con imágenes integradas */}
              <div className="flex-1 relative">
                <div className="w-full h-full bg-slate-700 border border-slate-600 rounded-lg overflow-hidden">
                  {/* Área de contenido renderizado */}
                  <div 
                    className="w-full h-full p-3 text-slate-200 overflow-y-auto"
                    style={{ minHeight: 'calc(100vh - 280px)' }}
                  >
                    {(selectedHighlight.note_text || '').split('\n').map((line, index) => {
                      // Detectar imágenes
                      const imageMatch = line.match(/^\[IMG:([^\]]+)\]$/);
                      if (imageMatch) {
                        const imageId = imageMatch[1];
                        const imageData = selectedHighlight.images?.[imageId];
                        if (imageData) {
                          let imageUrl: string;
                          if (typeof imageData === 'string') {
                            imageUrl = imageData;
                          } else if (imageData?.url) {
                            imageUrl = imageData.url;
                          } else if (imageData instanceof File) {
                            imageUrl = URL.createObjectURL(imageData);
                          } else {
                            return (
                              <div key={index} className="my-4 p-2 bg-slate-600 rounded text-slate-400 text-sm font-mono">
                                [IMG:{imageId}] - Error loading
                              </div>
                            );
                          }
                          
                          return (
                            <div key={index} className="my-4 relative inline-block max-w-full">
                              <img
                                src={imageUrl}
                                alt={`Image ${imageId}`}
                                className="max-w-full h-auto rounded-lg"
                                style={{ maxHeight: '200px' }}
                              />
                              
                              {/* Botón para expandir imagen */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('🔍 CLICK EN BOTÓN EXPANDIR:', imageUrl);
                                  setSelectedImage(imageUrl);
                                  setShowImageModal(true);
                                }}
                                className="absolute top-1 left-1 bg-blue-600 hover:bg-blue-500 text-white rounded-full w-7 h-7 text-xs opacity-90 hover:opacity-100 transition-all hover:scale-110 flex items-center justify-center"
                                style={{ zIndex: 20 }}
                                title="Ver imagen en grande"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                              </button>
                              
                              {/* Botón para eliminar imagen */}
                              <button
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('🗑️ CLICK EN BOTÓN ELIMINAR:', imageId);
                                  
                                  // Eliminar imagen de Supabase Storage si es una URL
                                  const imageData = selectedHighlight.images?.[imageId];
                                  if (imageData && typeof imageData === 'string' && imageData.includes('supabase')) {
                                    try {
                                      const { deleteFlashcardImage } = await import('@/lib/notes/flashcards');
                                      await deleteFlashcardImage(imageData);
                                      console.log('✅ Imagen eliminada de Storage');
                                    } catch (error) {
                                      console.error('❌ Error eliminando imagen de Storage:', error);
                                    }
                                  }
                                  
                                  // Eliminar de la interfaz
                                  const newText = selectedHighlight.note_text?.replace(`[IMG:${imageId}]`, '') || '';
                                  const newImages = { ...selectedHighlight.images };
                                  delete newImages[imageId];
                                  setSelectedHighlight({
                                    ...selectedHighlight,
                                    note_text: newText,
                                    images: newImages
                                  });
                                }}
                                className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white rounded-full w-7 h-7 text-xs opacity-90 hover:opacity-100 transition-all hover:scale-110 flex items-center justify-center"
                                style={{ zIndex: 20 }}
                                title="Eliminar imagen"
                              >
                                ×
                              </button>
                            </div>
                          );
                        }
                        return (
                          <div key={index} className="my-4 p-2 bg-slate-600 rounded text-slate-400 text-sm font-mono">
                            [IMG:{imageId}] - Not found
                          </div>
                        );
                      }
                      
                      // Línea de texto normal
                      return (
                        <div 
                          key={index} 
                          className="min-h-[1.5rem] leading-6 my-2"
                          dangerouslySetInnerHTML={{
                            __html: line
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\b(Markdown|Git|API REST|JavaScript|React|TypeScript|HTML|CSS|Node\.js|Python|SQL|Docker|AWS|Firebase|Supabase)\b/gi, '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold">$1</span>') || '&nbsp;'
                          }}
                        />
                      );
                    })}
                  </div>
                  
                  {/* Textarea invisible para capturar input */}
                  <textarea
                    className="absolute inset-0 w-full h-full p-3 bg-transparent border-none resize-none text-transparent placeholder-slate-400 focus:outline-none overflow-y-auto"
                    style={{
                      caretColor: '#f1f5f9',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      zIndex: 5
                    }}
                    value={selectedHighlight.note_text || ''}
                    onChange={(e) => {
                      setSelectedHighlight({
                        ...selectedHighlight,
                        note_text: e.target.value
                      });
                    }}
                    placeholder="Escribe tu nota aquí..."
                    autoFocus
                  />
                </div>
              </div>
            </div>
            
          </div>
        </>
      )}

      {/* Modal para ver imágenes en pantalla completa */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]"
          onClick={() => {
            console.log('🔒 Cerrando modal de imagen');
            setShowImageModal(false);
            setSelectedImage(null);
          }}
        >
          <div className="relative max-w-[98vw] max-h-[98vh] flex items-center justify-center">
            <img
              src={selectedImage}
              alt="Imagen ampliada"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => {
                e.stopPropagation();
                console.log('🖼️ Click en imagen - no cerrar modal');
              }}
              onLoad={() => console.log('✅ Imagen cargada en modal')}
              onError={() => console.error('❌ Error cargando imagen en modal')}
            />
            <button
              onClick={() => {
                console.log('❌ Cerrando modal con botón X');
                setShowImageModal(false);
                setSelectedImage(null);
              }}
              className="absolute top-2 right-2 text-white bg-orange-500 hover:bg-orange-400 rounded-full p-1.5 transition-all duration-200 hover:scale-110 shadow-lg"
              title="Cerrar imagen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}
