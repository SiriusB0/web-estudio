"use client";

import { useState, useEffect } from "react";

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageName?: string;
  onClose: () => void;
}

export default function ImageModal({ isOpen, imageUrl, imageName, onClose }: ImageModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      // Precargar la imagen
      const img = new Image();
      img.onload = () => setIsLoading(false);
      img.onerror = () => setIsLoading(false);
      img.src = imageUrl;
    }
  }, [isOpen, imageUrl]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60]">
      <div className="relative max-w-[95vw] max-h-[95vh] flex flex-col">
        {/* Header con botón cerrar */}
        <div className="flex items-center justify-between p-4 bg-gray-900 rounded-t-lg">
          <h3 className="text-white text-lg font-medium truncate">
            {imageName || 'Imagen'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
            title="Cerrar (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Contenedor de imagen */}
        <div className="relative bg-gray-800 rounded-b-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="text-gray-400">Cargando imagen...</div>
            </div>
          )}
          
          <img
            src={imageUrl}
            alt={imageName || 'Imagen de flashcard'}
            className="max-w-full max-h-[80vh] object-contain"
            style={{ display: isLoading ? 'none' : 'block' }}
            onClick={onClose}
          />
        </div>

        {/* Instrucciones */}
        <div className="text-center text-gray-400 text-sm mt-2">
          Haz clic en la imagen o presiona Esc para cerrar
        </div>
      </div>
    </div>
  );
}
