"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useMemo, useState } from "react";
import { headerTextClasses, headerSizes } from "../../lib/theme";

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
}

export default function NotePreview({ content, onWikiLinkClick }: NotePreviewProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  
  console.log("=== NotePreview RENDER ===");
  console.log("Props received:", { content: content?.substring(0, 50) + "...", onWikiLinkClick });
  console.log("Stack trace:", new Error().stack);
  
  const handleWikilinkClick = (noteTitle: string) => {
    console.log("handleWikilinkClick called with:", noteTitle);
    console.log("onWikiLinkClick function:", onWikiLinkClick);
    if (onWikiLinkClick) {
      console.log("Calling onWikiLinkClick...");
      onWikiLinkClick(noteTitle);
    } else {
      console.log("ERROR: onWikiLinkClick is not defined!");
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
    code: ({ className, children }: any) => (
      <code className="bg-gray-700 text-gray-200 px-1 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ),
    p: ({ children }: any) => <p className="text-gray-300 mb-4">{children}</p>,
    li: ({ children }: any) => <li className="text-gray-300">{children}</li>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-gray-600 bg-gray-800 pl-4 py-2 my-4 text-gray-300">
        {children}
      </blockquote>
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
    
    // === Vista Previa: Configuración de tamaños y colores de encabezados ===
    // Colores:
    // - Los colores provienen de `headerTextClasses` definido en `src/lib/theme.ts`.
    // - Abajo se obtiene con: `const colorClass = headerTextClasses[section.level]`.
    // - Para cambiar COLORES en la vista previa, edita `headerTextClasses` (por nivel 1..6) en theme.ts.
    // Tamaños:
    // - Los tamaños base de cada nivel se definen en `baseHeaderClasses` usando clases Tailwind.
    // - Para cambiar TAMAÑOS en la vista previa, modifica las clases aquí por nivel.
    // - Ejemplo: aumentar H2 -> 2: "text-4xl font-bold mb-4"
    // NOTA: Ahora usando headerSizes de theme.ts para sincronizar con editor
    const baseHeaderClasses: Record<number, string> = {
      1: "font-bold mb-4",
      2: "font-bold mb-4", 
      3: "font-bold mb-3",
      4: "font-bold mb-2",
      5: "font-bold mb-2",
      6: "font-bold mb-2"
    };
    
    const colorClass = headerTextClasses[section.level] || 'text-gray-300';
    const baseClass = baseHeaderClasses[section.level] || "font-bold mb-2";
    const sizeStyle = { fontSize: headerSizes[`h${section.level}` as keyof typeof headerSizes] || '1rem' };
    const headerClass = `${colorClass} ${baseClass}`;
    
    const headerProps = {
      className: `${headerClass} cursor-pointer hover:text-blue-400 transition-colors duration-200 flex items-center gap-2 select-none`,
      style: sizeStyle,
      onClick: () => toggleSection(section.id),
      children: (
        <>
          <span className="text-gray-500 text-sm">
            {isCollapsed ? '▶' : '▼'}
          </span>
          {section.title}
        </>
      )
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
              <div className="ml-4">
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

  return (
    <div className="p-6 pr-8 max-w-full overflow-hidden">
      <div className="prose prose-invert max-w-full break-words overflow-wrap-anywhere" style={{ maxWidth: 'calc(100vw - 400px)' }}>
        {parsedSections.map((section) => renderSection(section))}
      </div>
    </div>
  );
}
