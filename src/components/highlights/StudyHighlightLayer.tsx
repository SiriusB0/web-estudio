"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
// Implementación manual de text-quote selectors
const createTextQuoteSelector = (container: Element, range: Range) => {
  const text = range.toString().trim();
  if (!text) return null;
  
  // Calcular la posición real del texto seleccionado en el contenedor
  const containerText = container.textContent || '';
  
  // Crear un rango temporal para calcular el offset exacto
  const tempRange = document.createRange();
  tempRange.setStart(container, 0);
  tempRange.setEnd(range.startContainer, range.startOffset);
  const actualStartOffset = tempRange.toString().length;
  
  console.log('🎯 Creating selector:', {
    selectedText: text,
    actualStartOffset,
    containerTextLength: containerText.length
  });
  
  // Verificar que el offset es válido
  if (actualStartOffset < 0 || actualStartOffset >= containerText.length) {
    console.log('❌ Invalid offset calculated');
    return null;
  }
  
  // Extraer texto exacto desde la posición calculada
  const exactText = containerText.slice(actualStartOffset, actualStartOffset + text.length);
  
  // Verificar que coincide con el texto seleccionado
  if (exactText.trim() !== text) {
    console.log('❌ Text mismatch:', { exactText: exactText.trim(), selectedText: text });
    // Fallback: buscar el texto en el contexto cercano
    const searchStart = Math.max(0, actualStartOffset - 50);
    const searchEnd = Math.min(containerText.length, actualStartOffset + text.length + 50);
    const searchArea = containerText.slice(searchStart, searchEnd);
    const foundIndex = searchArea.indexOf(text);
    
    if (foundIndex !== -1) {
      const correctedOffset = searchStart + foundIndex;
      const prefixStart = Math.max(0, correctedOffset - 32);
      const suffixEnd = Math.min(containerText.length, correctedOffset + text.length + 32);
      
      return {
        type: 'TextQuoteSelector' as const,
        exact: text,
        prefix: containerText.slice(prefixStart, correctedOffset),
        suffix: containerText.slice(correctedOffset + text.length, suffixEnd)
      };
    }
    
    return null;
  }
  
  // Calcular prefix y suffix
  const prefixStart = Math.max(0, actualStartOffset - 32);
  const suffixEnd = Math.min(containerText.length, actualStartOffset + text.length + 32);
  
  const selector = {
    type: 'TextQuoteSelector' as const,
    exact: text,
    prefix: containerText.slice(prefixStart, actualStartOffset),
    suffix: containerText.slice(actualStartOffset + text.length, suffixEnd)
  };
  
  console.log('✅ Selector created:', selector);
  return selector;
};

const findTextInContainer = (container: Element, selector: any) => {
  const containerText = container.textContent || '';
  const { exact, prefix, suffix } = selector;
  
  console.log('🔍 Finding text in container:', { exact, prefix: prefix.slice(-10), suffix: suffix.slice(0, 10) });
  
  // Buscar el texto exacto con contexto completo
  let searchText = prefix + exact + suffix;
  let index = containerText.indexOf(searchText);
  
  if (index !== -1) {
    // Ajustar índice para apuntar al texto exacto
    index += prefix.length;
    console.log('✅ Found with full context at index:', index);
  } else {
    // Fallback 1: buscar con prefix más corto
    const shortPrefix = prefix.slice(-16);
    const shortSuffix = suffix.slice(0, 16);
    searchText = shortPrefix + exact + shortSuffix;
    index = containerText.indexOf(searchText);
    
    if (index !== -1) {
      index += shortPrefix.length;
      console.log('✅ Found with short context at index:', index);
    } else {
      // Fallback 2: buscar solo el texto exacto
      index = containerText.indexOf(exact);
      if (index === -1) {
        console.log('❌ Text not found in container');
        return null;
      }
      console.log('✅ Found exact text only at index:', index);
    }
  }
  
  // Crear range manualmente usando TreeWalker
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let currentOffset = 0;
  let node;
  let startNode = null;
  let startOffset = 0;
  let endNode = null;
  let endOffset = 0;
  let remainingLength = exact.length;
  
  while (node = walker.nextNode()) {
    const nodeText = node.textContent || '';
    const nodeLength = nodeText.length;
    
    // Encontrar el nodo de inicio
    if (!startNode && currentOffset + nodeLength > index) {
      startNode = node;
      startOffset = index - currentOffset;
    }
    
    // Encontrar el nodo de fin
    if (startNode && remainingLength > 0) {
      const availableInNode = nodeLength - (startNode === node ? startOffset : 0);
      const toTakeFromNode = Math.min(remainingLength, availableInNode);
      
      remainingLength -= toTakeFromNode;
      
      if (remainingLength === 0) {
        endNode = node;
        endOffset = (startNode === node ? startOffset : 0) + toTakeFromNode;
        break;
      }
    }
    
    currentOffset += nodeLength;
  }
  
  if (startNode && endNode) {
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    
    console.log('✅ Range created:', {
      rangeText: range.toString(),
      expectedText: exact,
      matches: range.toString().trim() === exact.trim()
    });
    
    return range;
  }
  
  console.log('❌ Could not create range');
  return null;
};

// Usar la interfaz de Supabase
import type { HighlightRecord } from '../../lib/supabase/highlights';

interface AnchoredHighlight extends HighlightRecord {
  rects: DOMRect[];
  range: Range | null;
  isAnchored: boolean;
}

interface StudyHighlightLayerProps {
  rootRef: React.RefObject<HTMLDivElement | null>;
  docId: string;
  userId: string;
  onHighlightClick: (highlight: HighlightRecord, position?: { x: number; y: number }) => void;
  onCreateHighlight: (selector: any, range: Range) => void;
  highlights: HighlightRecord[];
  isEnabled: boolean;
}

export const StudyHighlightLayer: React.FC<StudyHighlightLayerProps> = ({
  rootRef,
  docId,
  userId,
  onHighlightClick,
  onCreateHighlight,
  highlights,
  isEnabled
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [anchoredHighlights, setAnchoredHighlights] = useState<AnchoredHighlight[]>([]);
  const [containerBounds, setContainerBounds] = useState<DOMRect | null>(null);
  const [hoveredHighlight, setHoveredHighlight] = useState<{ id: string; rectIndex: number } | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('🎯 StudyHighlightLayer - Props:', {
      docId,
      userId,
      highlightsCount: highlights.length,
      isEnabled,
      rootRefCurrent: !!rootRef.current
    });
    console.log('📋 Highlights data:', highlights);
  }, [docId, userId, highlights, isEnabled, rootRef.current]);

  // Función para crear highlight desde selección
  const createHighlightFromSelection = useCallback(() => {
    console.log('🖱️ Creating highlight from selection...');
    
    if (!isEnabled || !rootRef.current) {
      console.log('❌ Cannot create highlight - disabled or no rootRef');
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      console.log('❌ No valid selection');
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    console.log('📝 Selection info:', {
      text: selectedText.slice(0, 100) + '...',
      rangeStartContainer: range.startContainer.nodeName,
      rangeEndContainer: range.endContainer.nodeName
    });
    
    // Verificar que la selección está dentro del contenedor
    if (!rootRef.current.contains(range.commonAncestorContainer)) {
      console.log('❌ Selection not within container');
      return;
    }

    try {
      // Crear selector text-quote
      const selector = createTextQuoteSelector(rootRef.current, range);
      
      console.log('🎯 Generated selector:', selector);
      
      if (selector && selector.type === 'TextQuoteSelector') {
        console.log('✅ Valid selector created, calling onCreateHighlight');
        onCreateHighlight(selector, range);
        selection.removeAllRanges();
      } else {
        console.log('❌ Invalid selector generated');
      }
    } catch (error) {
      console.error('💥 Error creating highlight:', error);
    }
  }, [isEnabled, rootRef, onCreateHighlight]);

  // Re-anclar highlights después del render
  const reanchorHighlights = useCallback(() => {
    console.log('🔄 Reanchoring highlights...', {
      hasRootRef: !!rootRef.current,
      isEnabled,
      highlightsCount: highlights.length
    });

    if (!rootRef.current || !isEnabled) {
      console.log('❌ Cannot reanchor - missing rootRef or disabled');
      setAnchoredHighlights([]);
      return;
    }

    const container = rootRef.current;
    const containerRect = container.getBoundingClientRect();
    setContainerBounds(containerRect);

    // Verificar si el contenedor es visible
    const containerStyle = window.getComputedStyle(container);
    const isContainerVisible = containerStyle.display !== 'none' && 
                              containerStyle.visibility !== 'hidden' && 
                              containerStyle.opacity !== '0' &&
                              containerRect.height > 0 &&
                              containerRect.width > 0;

    console.log('📦 Container info:', {
      containerRect: {
        width: containerRect.width,
        height: containerRect.height,
        top: containerRect.top,
        left: containerRect.left
      },
      containerHTML: container.innerHTML.slice(0, 200) + '...'
    });

    const anchored: AnchoredHighlight[] = highlights.map(highlight => {
      console.log('🎯 Processing highlight:', {
        id: highlight.id,
        exact: highlight.selector_exact.slice(0, 50) + '...',
        prefix: highlight.selector_prefix,
        suffix: highlight.selector_suffix
      });

      try {
        const selector = {
          type: 'TextQuoteSelector' as const,
          exact: highlight.selector_exact,
          prefix: highlight.selector_prefix,
          suffix: highlight.selector_suffix
        };
        
        const range = findTextInContainer(container, selector);
        if (range) {
          // Verificar si el rango está en un elemento visible
          const rangeContainer = range.commonAncestorContainer;
          const parentElement = rangeContainer.nodeType === Node.TEXT_NODE 
            ? rangeContainer.parentElement 
            : rangeContainer as Element;
          
          let isRangeVisible = true;
          if (parentElement) {
            // Verificar si algún ancestro está oculto
            let currentElement: Element | null = parentElement;
            while (currentElement && currentElement !== container) {
              const style = window.getComputedStyle(currentElement);
              if (style.display === 'none' || 
                  style.visibility === 'hidden' || 
                  style.opacity === '0') {
                isRangeVisible = false;
                break;
              }
              currentElement = currentElement.parentElement;
            }
          }

          if (!isRangeVisible) {
            console.log('❌ Range is in hidden element:', highlight.id);
            return {
              ...highlight,
              rects: [],
              range: null,
              isAnchored: false
            };
          }

          const clientRects = range.getClientRects();
          console.log('✅ Range found:', {
            highlightId: highlight.id,
            rangeText: range.toString().slice(0, 50) + '...',
            rectsCount: clientRects.length
          });

          // Filtrar rectángulos que están fuera del área visible del contenedor
          const visibleRects = Array.from(clientRects).filter((rect: any) => {
            const relativeTop = rect.top - containerRect.top;
            const relativeBottom = rect.bottom - containerRect.top;
            const relativeLeft = rect.left - containerRect.left;
            const relativeRight = rect.right - containerRect.left;
            
            // Verificar si el rectángulo está dentro del área visible del contenedor
            return relativeTop < containerRect.height && 
                   relativeBottom > 0 && 
                   relativeLeft < containerRect.width && 
                   relativeRight > 0 &&
                   rect.width > 0 && 
                   rect.height > 0;
          });

          if (visibleRects.length === 0) {
            console.log('❌ No visible rects for highlight:', highlight.id);
            return {
              ...highlight,
              rects: [],
              range: null,
              isAnchored: false
            };
          }

          const rects = visibleRects.map((rect: any) => ({
            x: rect.x - containerRect.x,
            y: rect.y - containerRect.y,
            width: rect.width,
            height: rect.height,
            top: rect.top - containerRect.top,
            right: rect.right - containerRect.left,
            bottom: rect.bottom - containerRect.top,
            left: rect.left - containerRect.left,
            toJSON: rect.toJSON
          }));

          console.log('📐 Calculated visible rects:', rects);

          return {
            ...highlight,
            rects,
            range,
            isAnchored: true
          };
        } else {
          console.warn('❌ No range found for highlight:', highlight.id);
        }
      } catch (error) {
        console.error('💥 Error anchoring highlight:', highlight.id, error);
      }

      return {
        ...highlight,
        rects: [],
        range: null,
        isAnchored: false
      };
    });

    console.log('🎯 Final anchored highlights:', {
      total: anchored.length,
      anchored: anchored.filter(h => h.isAnchored).length,
      failed: anchored.filter(h => !h.isAnchored).length
    });

    setAnchoredHighlights(anchored);
  }, [highlights, rootRef, isEnabled]);

  // Efectos para re-anclado
  useEffect(() => {
    if (!isEnabled) {
      console.log('❌ Reanchor effect disabled');
      return;
    }
    
    console.log('⏰ Setting reanchor timer...');
    const timer = setTimeout(() => {
      console.log('⏰ Reanchor timer fired');
      reanchorHighlights();
    }, 100);
    
    return () => {
      console.log('⏰ Clearing reanchor timer');
      clearTimeout(timer);
    };
  }, [highlights, reanchorHighlights, isEnabled]);

  useEffect(() => {
    if (!isEnabled) return;

    const handleResize = () => {
      const timer = setTimeout(reanchorHighlights, 150);
      return () => clearTimeout(timer);
    };

    const handleScroll = () => {
      requestAnimationFrame(reanchorHighlights);
    };

    // Observer para detectar cambios en la visibilidad de elementos
    const observer = new MutationObserver((mutations) => {
      let shouldReanchor = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'style' || 
             mutation.attributeName === 'class')) {
          shouldReanchor = true;
        }
        if (mutation.type === 'childList') {
          shouldReanchor = true;
        }
      });
      
      if (shouldReanchor) {
        requestAnimationFrame(reanchorHighlights);
      }
    });

    if (rootRef.current) {
      observer.observe(rootRef.current, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['style', 'class']
      });
    }

    window.addEventListener('resize', handleResize);
    rootRef.current?.addEventListener('scroll', handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      rootRef.current?.removeEventListener('scroll', handleScroll);
    };
  }, [reanchorHighlights, rootRef, isEnabled]);

  // Atajos de teclado
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        createHighlightFromSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [createHighlightFromSelection, isEnabled]);

  // Event delegation para clicks en highlights
  useEffect(() => {
    if (!overlayRef.current || !isEnabled) {
      console.log('❌ No overlay ref or disabled for click handler');
      return;
    }
    
    console.log('🖱️ Setting up click handler for highlights');
    
    const handleHighlightClick = (e: MouseEvent) => {
      console.log('🖱️ Click detected on overlay:', e.target);
      
      const target = e.target as HTMLElement;
      const highlightEl = target.closest('[data-highlight-id]');
      
      console.log('🎯 Highlight element found:', highlightEl);
      
      if (highlightEl) {
        e.preventDefault();
        e.stopPropagation();
        
        const highlightId = highlightEl.getAttribute('data-highlight-id');
        console.log('🆔 Highlight ID:', highlightId);
        
        if (highlightId) {
          const highlight = anchoredHighlights.find(h => h.id === highlightId);
          console.log('📋 Found highlight data:', highlight);
          
          if (highlight) {
            console.log('✅ Calling onHighlightClick');
            onHighlightClick(highlight);
          } else {
            console.log('❌ No highlight data found for ID:', highlightId);
          }
        }
      } else {
        console.log('❌ No highlight element found in click target');
      }
    };
    
    overlayRef.current.addEventListener('click', handleHighlightClick);
    
    return () => {
      overlayRef.current?.removeEventListener('click', handleHighlightClick);
    };
  }, [anchoredHighlights, onHighlightClick, isEnabled]);

  if (!isEnabled) {
    console.log('❌ StudyHighlightLayer disabled');
    return null;
  }

  console.log('🎨 Rendering highlights overlay:', {
    anchoredHighlightsCount: anchoredHighlights.length,
    totalRects: anchoredHighlights.reduce((sum, h) => sum + h.rects.length, 0)
  });

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        overflow: 'hidden'
      }}
    >
      {anchoredHighlights.map(highlight => {
        console.log('🎨 Rendering highlight:', {
          id: highlight.id,
          rectsCount: highlight.rects.length,
          isAnchored: highlight.isAnchored,
          color: highlight.color
        });
        
        return highlight.rects.map((rect, index) => {
          console.log('📐 Rendering rect:', {
            highlightId: highlight.id,
            rectIndex: index,
            rect: {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height
            }
          });
          
          const isHovered = hoveredHighlight?.id === highlight.id && hoveredHighlight?.rectIndex === index;
          
          return (
            <div
              key={`${highlight.id}-${index}`}
              data-highlight-id={highlight.id}
              className="absolute pointer-events-auto cursor-pointer"
              onMouseEnter={() => setHoveredHighlight({ id: highlight.id, rectIndex: index })}
              onMouseLeave={() => setHoveredHighlight(null)}
              onClick={(e) => {
                console.log('🖱️ Direct click on highlight:', highlight.id);
                e.preventDefault();
                e.stopPropagation();
                onHighlightClick(highlight, {
                  x: e.clientX,
                  y: e.clientY
                });
              }}
              style={{
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                background: `rgba(59, 130, 246, ${isHovered ? 0.25 : 0.15})`,
                borderRadius: '2px',
                border: `1px solid rgba(59, 130, 246, ${isHovered ? 0.4 : 0.25})`,
                boxShadow: isHovered 
                  ? `rgba(59, 130, 246, 0.2) 0px 1px 4px, rgba(59, 130, 246, 0.15) 0px 0px 0px 1px`
                  : `rgba(59, 130, 246, 0.1) 0px 0px 0px 1px`,
                backdropFilter: 'blur(0.5px)',
                zIndex: 20,
                transform: isHovered ? 'scale(1.01)' : 'scale(1)',
                transition: isHovered ? 'transform 0.1s ease-out' : 'none'
              }}
              title={highlight.note_text ? `Nota: ${highlight.note_text.slice(0, 100)}${highlight.note_text.length > 100 ? '...' : ''}` : 'Click para agregar nota'}
              role="button"
              aria-label={`Highlight: ${highlight.selector_exact.slice(0, 50)}${highlight.selector_exact.length > 50 ? '...' : ''}`}
            />
          );
        });
      })}
    </div>
  );
};
