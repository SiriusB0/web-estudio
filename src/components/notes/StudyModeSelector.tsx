"use client";

import { useState } from "react";

interface StudyModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onModeSelected: (mode: 'traditional' | 'multiple_choice' | 'mixed') => void;
  traditionalCount: number;
  multipleChoiceCount: number;
  title: string;
}

export default function StudyModeSelector({
  isOpen,
  onClose,
  onModeSelected,
  traditionalCount,
  multipleChoiceCount,
  title
}: StudyModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<'traditional' | 'multiple_choice' | 'mixed'>('mixed');

  const handleStartStudy = () => {
    onModeSelected(selectedMode);
    onClose();
  };

  const totalCards = traditionalCount + multipleChoiceCount;

  if (!isOpen || totalCards === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Modo de Estudio</h2>
            <p className="text-sm text-gray-400">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-white font-medium mb-4">¿Qué tipo de flashcards quieres estudiar?</h3>
            
            <div className="space-y-3">
              {/* Traditional Cards Option */}
              {traditionalCount > 0 && (
                <label className="flex items-center p-3 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="studyMode"
                    value="traditional"
                    checked={selectedMode === 'traditional'}
                    onChange={(e) => setSelectedMode(e.target.value as 'traditional')}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📚</span>
                      <span className="text-white font-medium">Flashcards Tradicionales</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      {traditionalCount} tarjeta{traditionalCount !== 1 ? 's' : ''} • Pregunta y respuesta
                    </p>
                  </div>
                </label>
              )}

              {/* Multiple Choice Option */}
              {multipleChoiceCount > 0 && (
                <label className="flex items-center p-3 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="studyMode"
                    value="multiple_choice"
                    checked={selectedMode === 'multiple_choice'}
                    onChange={(e) => setSelectedMode(e.target.value as 'multiple_choice')}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">✅</span>
                      <span className="text-white font-medium">Opción Múltiple</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      {multipleChoiceCount} pregunta{multipleChoiceCount !== 1 ? 's' : ''} • Selección de respuestas
                    </p>
                  </div>
                </label>
              )}

              {/* Mixed Mode Option */}
              {traditionalCount > 0 && multipleChoiceCount > 0 && (
                <label className="flex items-center p-3 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="studyMode"
                    value="mixed"
                    checked={selectedMode === 'mixed'}
                    onChange={(e) => setSelectedMode(e.target.value as 'mixed')}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🎯</span>
                      <span className="text-white font-medium">Modo Mixto</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      {totalCards} tarjetas • Ambos tipos mezclados
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="mb-6 p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Total a estudiar:</span>
              <span className="text-white font-medium">
                {selectedMode === 'traditional' ? traditionalCount :
                 selectedMode === 'multiple_choice' ? multipleChoiceCount :
                 totalCards} tarjetas
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleStartStudy}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-medium"
            >
              Comenzar Estudio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
