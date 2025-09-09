"use client";

import { useState, useMemo, useRef, useEffect } from "react";

interface HeadingItem {
  level: number;
  text: string;
  id: string;
  line: number;
}

interface DocumentOutlineProps {
  content: string;
  onNavigate?: (line: number) => void;
  isOpen: boolean;
  onToggle: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

export default function DocumentOutline({ content, onNavigate, isOpen, onToggle, buttonRef }: DocumentOutlineProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Calcular posición del panel flotante
  useEffect(() => {
    if (isOpen && buttonRef?.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const panelWidth = 320;
      const viewportWidth = window.innerWidth;
      
      // Calcular posición horizontal para evitar que se salga de la pantalla
      let leftPosition = buttonRect.left;
      if (leftPosition + panelWidth > viewportWidth - 16) {
        leftPosition = buttonRect.right - panelWidth;
      }
      
      setPosition({
        top: buttonRect.bottom + 4,
        left: Math.max(16, leftPosition) // Mínimo 16px del borde izquierdo
      });
      setIsPositioned(true);
    } else {
      setIsPositioned(false);
    }
  }, [isOpen, buttonRef]);


  // Extraer títulos del contenido Markdown
  const headings = useMemo(() => {
    const lines = content.split('\n');
    const headingItems: HeadingItem[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
      
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        const id = text.toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .substring(0, 50);
        
        headingItems.push({
          level,
          text,
          id,
          line: index + 1
        });
      }
    });
    
    return headingItems;
  }, [content]);

  // Si no hay títulos, no mostrar nada
  if (headings.length === 0) return null;

  const handleHeadingClick = (line: number) => {
    if (onNavigate) {
      onNavigate(line);
      // onToggle(); // No cerrar después de navegar
    }
  };

  // Si no hay títulos, no mostrar nada
  if (headings.length === 0 || !isOpen || !isPositioned) return null;

  return (
    <div 
      ref={panelRef}
      className="fixed z-50 bg-gray-900/95 border border-gray-700 rounded-lg shadow-2xl backdrop-blur-sm w-80"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Header */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between w-full px-3 py-2 border-b border-gray-700 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            className="text-gray-400"
          >
            <path 
              fill="currentColor" 
              d="M3 9h14V7H3v2zm0 4h14v-2H3v2zm0 4h14v-2H3v2zm16 0h2v-2h-2v2zm0-10v2h2V7h-2zm0 6h2v-2h-2v2z"
            />
          </svg>
          <span className="text-xs font-medium text-gray-300">Esquema</span>
          <span className="text-xs text-gray-500">({headings.length})</span>
        </div>
        <svg 
          width="16"
          height="16"
          viewBox="0 0 24 24" 
          className={`text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}>
          <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9l6 6l6-6"/>
        </svg>
      </button>

      {/* Lista de títulos */}
      {!isCollapsed && (
      <div className="max-h-64 overflow-y-auto">
        {headings.map((heading, index) => (
          <button
            key={`${heading.id}-${index}`}
            onClick={() => handleHeadingClick(heading.line)}
            className="w-full text-left px-3 py-1.5 hover:bg-gray-800/50 transition-colors group flex items-start gap-2"
            title={`Ir a línea ${heading.line}: ${heading.text}`}
          >
            {/* Indicador de nivel */}
            <div 
              className="flex-shrink-0 mt-1"
              style={{ marginLeft: `${(heading.level - 1) * 8}px` }}
            >
              <div 
                className={`w-1 h-1 rounded-full ${
                  heading.level === 1 ? 'bg-blue-400' :
                  heading.level === 2 ? 'bg-green-400' :
                  heading.level === 3 ? 'bg-yellow-400' :
                  heading.level === 4 ? 'bg-orange-400' :
                  heading.level === 5 ? 'bg-red-400' :
                  'bg-purple-400'
                }`}
              />
            </div>
            
            {/* Texto del título */}
            <div className="flex-1 min-w-0">
              <div 
                className={`text-xs truncate ${
                  heading.level === 1 ? 'text-gray-200 font-medium' :
                  heading.level === 2 ? 'text-gray-300' :
                  'text-gray-400'
                } group-hover:text-white transition-colors`}
              >
                {heading.text}
              </div>
              <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                L{heading.line}
              </div>
            </div>
          </button>
        ))}
      </div>
      )}
    </div>
  );
}
