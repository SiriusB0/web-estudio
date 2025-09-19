"use client";

import { useState } from "react";
import { Highlight, themes } from "prism-react-renderer";

interface CodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  language: string;
}

export default function CodeModal({ isOpen, onClose, code, language }: CodeModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      } else {
        // Fallback para navegadores que no soportan clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }
    } catch (e) {
      console.error("Copy failed", e);
      alert("No se pudo copiar el código. Selecciona y copia manualmente.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#011627] rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">
            Código - {language.toUpperCase()}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
            >
              {copied ? "Copiado" : "Copiar"}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
        
        {/* Code Content */}
        <div className="overflow-auto max-h-[calc(90vh-80px)]">
          <Highlight
            code={code}
            language={language as any}
            theme={themes.nightOwl}
          >
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
              <pre 
                className={`${className} m-0 p-6 text-base`} 
                style={{
                  ...style,
                  fontSize: '1rem',
                  lineHeight: '1.6'
                }}
              >
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })}>
                    <span className="text-gray-500 mr-4 select-none">
                      {String(i + 1).padStart(3, ' ')}
                    </span>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
        </div>
      </div>
    </div>
  );
}
