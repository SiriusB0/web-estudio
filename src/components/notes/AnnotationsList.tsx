import React from 'react';

interface Annotation {
  id: string;
  text: string;
  lineId: string;
}

interface AnnotationsListProps {
  isVisible: boolean;
  annotations: Annotation[];
  onAnnotationClick: (annotation: Annotation) => void;
  onClose: () => void;
}

export const AnnotationsList: React.FC<AnnotationsListProps> = ({
  isVisible,
  annotations,
  onAnnotationClick,
  onClose
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-16 right-4 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-40 max-h-96 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-600">
        <h3 className="text-sm font-medium text-gray-200">
          Anotaciones ({annotations.length})
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-200 transition-colors"
          title="Cerrar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="overflow-y-auto max-h-80">
        {annotations.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">
            No hay anotaciones
          </div>
        ) : (
          <div className="p-2">
            {annotations.map((annotation) => {
              // Extraer contenido de la línea del lineId
              const lineContent = annotation.lineId ? 
                annotation.lineId.replace('line-', '').replace(/-/g, ' ') : 
                'Línea sin identificar';
              const truncatedLine = lineContent.length > 40 
                ? `${lineContent.substring(0, 40)}...` 
                : lineContent;
              
              return (
                <div
                  key={annotation.id}
                  onClick={() => onAnnotationClick(annotation)}
                  className="p-3 mb-2 bg-gray-700 hover:bg-gray-650 rounded cursor-pointer transition-colors"
                >
                  <div className="text-xs text-gray-400 mb-1 truncate">
                    {truncatedLine}
                  </div>
                  <div className="text-sm text-gray-200 line-clamp-2">
                    {annotation.text}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
