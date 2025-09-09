import React, { useState } from 'react';

interface SimpleAnnotationProps {
  onSave: (note: string) => void;
  onClose: () => void;
  onDelete?: () => void;
  position: { x: number; y: number };
  isVisible: boolean;
  existingNote?: string;
  lineContent?: string;
}

export const SimpleAnnotation: React.FC<SimpleAnnotationProps> = ({ onSave, onClose, onDelete, position, isVisible, existingNote, lineContent }) => {
  const [note, setNote] = useState(existingNote || '');
  const [isEditing, setIsEditing] = useState(false);

  React.useEffect(() => {
    if (isVisible) {
      if (existingNote) {
        setNote(existingNote);
      } else {
        setNote('');
      }
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  }, [existingNote, isVisible]);

  if (!isVisible) return null;

  const handleSave = () => {
    if (note.trim()) {
      onSave(note.trim());
    }
  };

  const handleCancel = () => {
    setNote(existingNote || '');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[1px] bg-transparent">
      <div className="bg-gray-800 bg-opacity-95 border border-gray-600 rounded-lg p-4 shadow-xl w-[70vw] h-[70vh] flex flex-col">
        {/* Título con contenido de la línea */}
        {lineContent && (
          <div className="mb-4 pb-3 border-b border-gray-600">
            <h3 className="text-sm font-medium text-gray-300 truncate">
              {lineContent.length > 60 ? `${lineContent.substring(0, 60)}...` : lineContent}
            </h3>
          </div>
        )}
        
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Escribe tu anotación aquí..."
          className="w-full flex-1 p-3 bg-gray-700 border border-gray-600 rounded text-base text-gray-200 placeholder-gray-400 resize-none focus:outline-none focus:border-gray-500"
          autoFocus
        />
        
        <div className="flex justify-between items-center mt-3">
          <div className="flex gap-2">
            {/* Botón Guardar */}
            <button
              onClick={handleSave}
              disabled={!note.trim()}
              className="p-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded flex items-center justify-center"
              title="Guardar anotación"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            
            {/* Botón Cancelar */}
            <button
              onClick={handleCancel}
              className="p-3 bg-gray-600 hover:bg-gray-700 text-white rounded flex items-center justify-center"
              title="Cancelar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Botón Eliminar (solo si existe una nota) */}
          {existingNote && onDelete && (
            <button
              onClick={onDelete}
              className="p-3 bg-red-600 hover:bg-red-700 text-white rounded flex items-center justify-center"
              title="Eliminar anotación"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
