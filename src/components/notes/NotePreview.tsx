"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useMemo, useState, useEffect } from "react";
import { headerTextClasses, headerSizes, headerSizesStudy, headerWeights } from "../../lib/theme";
import { Highlight, themes } from "prism-react-renderer";
import { SimpleAnnotation } from "./SimpleAnnotation";
import MermaidRenderer from "./MermaidRenderer";

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
}

export default function NotePreview({ content, onWikiLinkClick, studyMode = false }: NotePreviewProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [annotationPosition, setAnnotationPosition] = useState({ x: 0, y: 0 });
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [hoveredLineId, setHoveredLineId] = useState<string>('');
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [currentLineId, setCurrentLineId] = useState<string>('');
  const [annotations, setAnnotations] = useState<Array<{id: string, text: string, lineId: string}>>([]);

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

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key === 'n') {
        event.preventDefault();
        // Crear anotación en la posición del cursor
        setAnnotationPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        setShowAnnotation(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  
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
      const mobileStyles = studyMode ? {
        fontSize: window.innerWidth < 640 ? '1.2rem' : '1.1rem',
        lineHeight: window.innerWidth < 640 ? '1.8' : '1.7',
        marginBottom: window.innerWidth < 640 ? '1.8rem' : '1.5rem'
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
            className={`text-gray-300 leading-relaxed mb-4 whitespace-pre-wrap ${
              studyMode ? 'text-base sm:text-lg' : ''
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
        marginBottom: window.innerWidth < 640 ? '0.8rem' : '0.5rem'
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
            studyMode ? 'text-base sm:text-lg' : ''
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
      <blockquote className={`border-l-4 border-gray-600 bg-gray-800 pl-4 py-2 my-4 text-gray-300 ${
        studyMode ? 'text-base sm:text-lg pl-3 sm:pl-4 py-3 sm:py-4 my-4 sm:my-6' : ''
      }`}>
        {children}
      </blockquote>
    ),
    ul: ({ children }: any) => (
      <ul className={`list-disc list-inside text-gray-300 mb-3 ${
        studyMode ? 'mb-4 sm:mb-6 space-y-1 sm:space-y-2' : ''
      }`}>{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className={`list-decimal list-inside text-gray-300 mb-3 ${
        studyMode ? 'mb-4 sm:mb-6 space-y-1 sm:space-y-2' : ''
      }`}>{children}</ol>
    ),
    hr: ({ ...props }: any) => (
      <hr className="my-6 border-t-2 border-gray-500 opacity-60" {...props} />
    ),
    thematicBreak: ({ ...props }: any) => (
      <hr className="my-6 border-t-2 border-gray-500 opacity-60" {...props} />
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
      1: "mb-4",
      2: "mb-4", 
      3: "mb-3",
      4: "mb-2",
      5: "mb-2",
      6: "mb-2"
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
        h1: '1.8rem',
        h2: '1.6rem', 
        h3: '1.4rem',
        h4: '1.2rem',
        h5: '1.1rem',
        h6: '1rem'
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
      1: 'hover:scale-[1.08]',
      2: 'hover:scale-[1.06]',
      3: 'hover:scale-[1.05]',
      4: 'hover:scale-[1.04]',
      5: 'hover:scale-[1.03]',
      6: 'hover:scale-[1.02]'
    };
    
    const hoverColor = hoverColors[section.level as keyof typeof hoverColors] || 'hover:text-white';
    const hoverScale = hoverScales[section.level as keyof typeof hoverScales] || 'hover:scale-[1.02]';
    
    const headerProps = {
      className: `${headerClass} ${hoverColor} ${hoverScale} cursor-pointer transition-all duration-300 ease-out select-none transform-gpu`,
      style: sizeStyle,
      onClick: () => toggleSection(section.id),
      children: section.title
    };
    
    return (
      <div key={section.id} className="mb-4" style={{ marginLeft: `${depth * 16}px` }}>
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
      <div className="relative group my-4 overflow-hidden rounded-lg border border-gray-700/60 bg-[#011627]">
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
    <div className={`${studyMode ? 'px-2 py-4 sm:px-6 sm:py-6' : 'p-6'} max-w-full overflow-hidden`}>
      {/* Contador de anotaciones en el header */}
      {annotations.length > 0 && (
        <div className="mb-4 text-sm text-gray-400">
          📝 {annotations.length} anotación{annotations.length > 1 ? 'es' : ''}
        </div>
      )}
      
      <div className="prose prose-invert max-w-full break-words overflow-wrap-anywhere">
        {parsedSections.map((section) => renderSection(section))}
      </div>
      
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
      
    </div>
  );
}
