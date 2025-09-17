"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TextSizeContextType {
  textSize: number;
  setTextSize: (size: number) => void;
  increaseTextSize: () => void;
  decreaseTextSize: () => void;
  resetTextSize: () => void;
}

const TextSizeContext = createContext<TextSizeContextType | undefined>(undefined);

interface TextSizeProviderProps {
  children: ReactNode;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  step?: number;
}

export function TextSizeProvider({ 
  children, 
  defaultSize = 0.85, 
  minSize = 0.6, 
  maxSize = 1.4, 
  step = 0.1 
}: TextSizeProviderProps) {
  const [textSize, setTextSizeState] = useState<number>(defaultSize);

  // Aplicar el tamaño de texto globalmente usando CSS custom properties
  useEffect(() => {
    document.documentElement.style.setProperty('--dynamic-text-size', `${textSize}rem`);
    
    // También aplicar a elementos específicos que necesiten override
    const noteContent = document.querySelector('[data-note-content]');
    if (noteContent) {
      (noteContent as HTMLElement).style.fontSize = `${textSize}rem`;
    }
    
    // Aplicar a elementos de markdown
    const markdownElements = document.querySelectorAll('[data-markdown-content] p, [data-markdown-content] li, [data-markdown-content] span');
    markdownElements.forEach(el => {
      (el as HTMLElement).style.fontSize = `${textSize}rem`;
    });
  }, [textSize]);

  const setTextSize = (size: number) => {
    const clampedSize = Math.max(minSize, Math.min(maxSize, size));
    setTextSizeState(clampedSize);
  };

  const increaseTextSize = () => {
    setTextSize(textSize + step);
  };

  const decreaseTextSize = () => {
    setTextSize(textSize - step);
  };

  const resetTextSize = () => {
    setTextSize(defaultSize);
  };

  return (
    <TextSizeContext.Provider value={{
      textSize,
      setTextSize,
      increaseTextSize,
      decreaseTextSize,
      resetTextSize
    }}>
      {children}
    </TextSizeContext.Provider>
  );
}

export function useTextSize() {
  const context = useContext(TextSizeContext);
  if (context === undefined) {
    throw new Error('useTextSize must be used within a TextSizeProvider');
  }
  return context;
}

// Componente de controles de texto
interface TextSizeControlsProps {
  showPercentage?: boolean;
  compact?: boolean;
  className?: string;
}

export function TextSizeControls({ 
  showPercentage = true, 
  compact = false, 
  className = "" 
}: TextSizeControlsProps) {
  const { textSize, increaseTextSize, decreaseTextSize } = useTextSize();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={decreaseTextSize}
        className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} bg-slate-700/50 hover:bg-slate-600/50 rounded-lg flex items-center justify-center text-white font-bold transition-colors`}
        title="Reducir texto"
        aria-label="Reducir tamaño de texto"
      >
        -
      </button>
      
      {showPercentage && (
        <span className="text-xs text-slate-400 px-1 min-w-[2.5rem] text-center">
          {Math.round(textSize * 100)}%
        </span>
      )}
      
      <button
        onClick={increaseTextSize}
        className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} bg-slate-700/50 hover:bg-slate-600/50 rounded-lg flex items-center justify-center text-white font-bold transition-colors`}
        title="Aumentar texto"
        aria-label="Aumentar tamaño de texto"
      >
        +
      </button>
    </div>
  );
}
