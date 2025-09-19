"use client";

import { useState, useEffect, useRef } from "react";
import { Highlight, themes } from "prism-react-renderer";

interface UnifiedCodeBlockProps {
  code: string;
  language: string;
  showCopyButton?: boolean;
  maxHeight?: string;
  className?: string;
  showModalButton?: boolean;
  onOpenModal?: (code: string, language: string) => void;
  isMultipleChoice?: boolean; // Nueva prop para identificar preguntas de múltiple choice
}

export default function UnifiedCodeBlock({ 
  code, 
  language, 
  showCopyButton = true, 
  maxHeight = "400px",
  className = "",
  showModalButton = false,
  onOpenModal,
  isMultipleChoice = false // Nueva prop con valor por defecto
}: UnifiedCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleCopy = async () => {
    try {
      // Intentar primero con Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
          return;
        } catch (clipboardError) {
          console.log("Clipboard API falló, usando fallback:", clipboardError);
        }
      }
      
      // Fallback usando document.execCommand
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      textArea.remove();
      
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      } else {
        throw new Error("execCommand falló");
      }
    } catch (e) {
      console.error("Copy failed completamente:", e);
      // Mostrar mensaje de error al usuario
      alert("No se pudo copiar automáticamente. Selecciona el código manualmente y usa Ctrl+C.");
    }
  };

  // Manejadores inteligentes de eventos para scroll
  const handleScrollStart = () => {
    setIsScrolling(true);
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
  };

  const handleScrollEnd = () => {
    const timeout = setTimeout(() => {
      setIsScrolling(false);
    }, 150); // Pequeño delay para detectar fin de scroll
    setScrollTimeout(timeout);
  };

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    // Solo prevenir propagación si NO estamos en proceso de scroll
    if (!isScrolling) {
      e.stopPropagation();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Siempre permitir scroll con rueda del mouse
    e.stopPropagation();
    handleScrollStart();
    handleScrollEnd();
  };

  // Funciones para scroll manual
  const scrollUp = () => {
    if (preRef.current) {
      preRef.current.scrollBy({ top: -30, behavior: 'smooth' });
    }
  };

  const scrollDown = () => {
    if (preRef.current) {
      preRef.current.scrollBy({ top: 30, behavior: 'smooth' });
    }
  };

  // Funciones para scroll continuo
  const startScrollUp = () => {
    scrollUp();
    scrollIntervalRef.current = setInterval(scrollUp, 100);
  };

  const startScrollDown = () => {
    scrollDown();
    scrollIntervalRef.current = setInterval(scrollDown, 100);
  };

  const stopScroll = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  // Cleanup del timeout e interval al desmontar
  useEffect(() => {
    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [scrollTimeout]);

  return (
    <div 
      className={`relative group my-3 overflow-hidden transition-all duration-300 ${className}`}
      style={{
        background: '#1e1e2e',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
      }}
      onMouseEnter={() => {
        setShowToolbar(true);
        setShowNavigation(true);
      }}
      onMouseLeave={() => {
        setShowToolbar(false);
        setShowNavigation(false);
      }}
    >
      {/* Toolbar flotante - aparece solo en hover */}
      {showToolbar && (
        <div 
          className={`absolute right-2 top-2 z-10 flex gap-1.5 items-center opacity-0 transition-all duration-300 group-hover:opacity-100 ${isMultipleChoice ? '' : ''}`}
          style={isMultipleChoice ? {} : {
            background: 'linear-gradient(90deg, #667eea, #764ba2)',
            padding: '6px 12px',
            borderRadius: '20px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(10px)'
          }}
        >
          {showModalButton && onOpenModal && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenModal(code, language);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              className="transition-all duration-200 hover:transform hover:-translate-y-0.5"
              style={isMultipleChoice ? {
                background: '#1e1e2e', // Color de fondo del código
                color: '#e0e0e0',
                border: '1px solid #666',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: '500'
              } : {
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: '600',
                backdropFilter: 'blur(10px)'
              }}
              aria-label="Ver en pantalla completa"
              type="button"
            >
              🖥️ Abrir
            </button>
          )}
          {showCopyButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              className="transition-all duration-200 hover:transform hover:-translate-y-0.5"
              style={isMultipleChoice ? {
                background: '#1e1e2e', // Color de fondo del código
                color: '#e0e0e0',
                border: '1px solid #666',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: '500'
              } : {
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: '500',
                backdropFilter: 'blur(10px)'
              }}
              aria-label="Copiar código"
              type="button"
            >
              📋 {copied ? "Copiado" : "Copiar"}
            </button>
          )}
        </div>
      )}

      {/* Botones de navegación - aparecen solo en hover y solo si NO es múltiple choice */}
      {!isMultipleChoice && showNavigation && (
        <div 
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-5 flex flex-col gap-3 opacity-0 transition-all duration-300 group-hover:opacity-100"
        >
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startScrollUp();
            }}
            onMouseUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
              stopScroll();
            }}
            onMouseLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              stopScroll();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startScrollUp();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              stopScroll();
            }}
            className="transition-all duration-200 hover:scale-110"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(45, 45, 58, 0.8)',
              border: '1px solid rgba(74, 74, 90, 0.6)',
              color: '#e0e0e0',
              fontSize: '14px',
              fontWeight: 'bold',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Scroll hacia arriba"
          >
            ↑
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startScrollDown();
            }}
            onMouseUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
              stopScroll();
            }}
            onMouseLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              stopScroll();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startScrollDown();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              stopScroll();
            }}
            className="transition-all duration-200 hover:scale-110"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(45, 45, 58, 0.8)',
              border: '1px solid rgba(74, 74, 90, 0.6)',
              color: '#e0e0e0',
              fontSize: '14px',
              fontWeight: 'bold',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Scroll hacia abajo"
          >
            ↓
          </button>
        </div>
      )}

      {/* Contenido del código con scroll interno optimizado */}
      <div 
        style={{ 
          padding: '20px', 
          overflow: 'hidden' // Oculta el scroll del div exterior para evitar conflictos
        }}
        onWheel={(e) => {
          // Evita que el scroll de la rueda del mouse se propague a la página
          e.stopPropagation();
        }}
        onClick={(e) => {
          // Evita que el clic dentro del código voltee la flashcard
          e.stopPropagation();
        }}
      >
        <Highlight
          code={code}
          language={language as any}
          theme={themes.nightOwl}
        >
          {({ className: prismClassName, style, tokens, getLineProps, getTokenProps }) => (
            <pre 
              ref={preRef} // El ref se mantiene aquí para que los botones ↑↓ puedan controlarlo
              className={`${prismClassName} m-0 p-0`}
              style={{ 
                fontFamily: "var(--font-fira-code, 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace)",
                fontSize: '13px',
                lineHeight: '1.5',
                color: '#e0e0e0',
                tabSize: 4,
                margin: 0,
                padding: '0 10px', // Padding interno para que el scrollbar no se pegue al código
                background: 'transparent',
                overflowY: 'auto', // Habilita el scroll vertical
                maxHeight: maxHeight,
                WebkitOverflowScrolling: 'touch', // Scroll suave en iOS
                touchAction: 'pan-y', // Permite el scroll vertical en dispositivos táctiles
                scrollbarWidth: 'thin',
                scrollbarColor: '#6c7086 transparent',
                display: 'block',
                minWidth: '100%',
                whiteSpace: 'pre'
              }}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })} style={{ display: 'flex' }}>
                  <span 
                    style={{
                      color: '#6c7086',
                      display: 'inline-block',
                      width: '35px',
                      userSelect: 'none',
                      marginRight: '12px',
                      textAlign: 'right',
                      fontSize: '12px'
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ flex: 1 }}>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>

      {/* Notificación de copiado */}
      {copied && (
        <div 
          className="fixed top-5 right-5 z-50 transition-transform duration-300"
          style={{
            background: '#27c93f',
            color: 'white',
            padding: '10px 16px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            fontSize: '13px'
          }}
        >
          ¡Código copiado al portapapeles!
        </div>
      )}
    </div>
  );
}
