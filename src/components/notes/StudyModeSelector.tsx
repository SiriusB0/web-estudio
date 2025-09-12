"use client";

import { useState } from "react";
import ExamModeSelector from "./ExamModeSelector";

interface StudyModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onModeSelected: (mode: 'traditional' | 'multiple_choice' | 'mixed' | 'exam', examConfig?: { questionCount: number; timeMinutes: number }) => void;
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
  const [selectedMode, setSelectedMode] = useState<'traditional' | 'multiple_choice' | 'mixed' | 'exam'>('mixed');
  const [showExamSelector, setShowExamSelector] = useState(false);

  const handleStartStudy = () => {
    console.log('StudyModeSelector - handleStartStudy called with mode:', selectedMode);
    if (selectedMode === 'exam') {
      console.log('Setting showExamSelector to true');
      setShowExamSelector(true);
    } else {
      onModeSelected(selectedMode);
      onClose();
    }
  };

  const handleExamConfigured = (config: { questionCount: number; timeMinutes: number }) => {
    console.log('StudyModeSelector - handleExamConfigured called with config:', config);
    onModeSelected('exam', config);
    setShowExamSelector(false);
    onClose();
  };

  const handleExamCancel = () => {
    setShowExamSelector(false);
  };

  const totalCards = traditionalCount + multipleChoiceCount;

  console.log('StudyModeSelector render - isOpen:', isOpen, 'totalCards:', totalCards);
  
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${!isOpen ? 'hidden' : ''}`}>
      <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl w-full max-w-lg border border-slate-700/50 shadow-2xl">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white mb-1">Seleccionar Modo</h2>
              <p className="text-sm text-slate-400">{title}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <div className="space-y-3">
            {/* Traditional Cards Option */}
            {traditionalCount > 0 && (
              <div 
                onClick={() => setSelectedMode('traditional')}
                className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedMode === 'traditional' 
                    ? 'bg-blue-600/20 border-2 border-blue-500/50 shadow-lg shadow-blue-500/10' 
                    : 'bg-slate-800/50 border-2 border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                    selectedMode === 'traditional' ? 'bg-blue-500/20' : 'bg-slate-700/50'
                  }`}>
                    📚
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">Tradicionales</h4>
                    <p className="text-sm text-slate-400">
                      {traditionalCount} tarjeta{traditionalCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMode === 'traditional' 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-slate-600'
                  }`}>
                    {selectedMode === 'traditional' && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Multiple Choice Option */}
            {multipleChoiceCount > 0 && (
              <div 
                onClick={() => setSelectedMode('multiple_choice')}
                className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedMode === 'multiple_choice' 
                    ? 'bg-green-600/20 border-2 border-green-500/50 shadow-lg shadow-green-500/10' 
                    : 'bg-slate-800/50 border-2 border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                    selectedMode === 'multiple_choice' ? 'bg-green-500/20' : 'bg-slate-700/50'
                  }`}>
                    ✅
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">Opción Múltiple</h4>
                    <p className="text-sm text-slate-400">
                      {multipleChoiceCount} pregunta{multipleChoiceCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMode === 'multiple_choice' 
                      ? 'border-green-500 bg-green-500' 
                      : 'border-slate-600'
                  }`}>
                    {selectedMode === 'multiple_choice' && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Mixed Mode Option */}
            {traditionalCount > 0 && multipleChoiceCount > 0 && (
              <div 
                onClick={() => setSelectedMode('mixed')}
                className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedMode === 'mixed' 
                    ? 'bg-purple-600/20 border-2 border-purple-500/50 shadow-lg shadow-purple-500/10' 
                    : 'bg-slate-800/50 border-2 border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                    selectedMode === 'mixed' ? 'bg-purple-500/20' : 'bg-slate-700/50'
                  }`}>
                    🎯
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">Modo Mixto</h4>
                    <p className="text-sm text-slate-400">
                      {totalCards} tarjetas mezcladas
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMode === 'mixed' 
                      ? 'border-purple-500 bg-purple-500' 
                      : 'border-slate-600'
                  }`}>
                    {selectedMode === 'mixed' && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Exam Mode Option - Always show if there are any cards */}
            {(traditionalCount > 0 || multipleChoiceCount > 0) && (
              <div 
                onClick={() => setSelectedMode('exam')}
                className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedMode === 'exam' 
                    ? 'bg-red-600/20 border-2 border-red-500/50 shadow-lg shadow-red-500/10' 
                    : 'bg-slate-800/50 border-2 border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                    selectedMode === 'exam' ? 'bg-red-500/20' : 'bg-slate-700/50'
                  }`}>
                    ⏱️
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">Modo Examen</h4>
                    <p className="text-sm text-slate-400">
                      Con tiempo límite
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMode === 'exam' 
                      ? 'border-red-500 bg-red-500' 
                      : 'border-slate-600'
                  }`}>
                    {selectedMode === 'exam' && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="mt-6 pt-4 border-t border-slate-700/50">
            <button
              onClick={handleStartStudy}
              disabled={totalCards === 0}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-blue-500/20 transform hover:scale-[1.02] disabled:transform-none disabled:shadow-none"
            >
              {totalCards === 0 ? 'No hay flashcards disponibles' : (selectedMode === 'exam' ? 'Configurar Examen' : 'Comenzar Estudio')}
            </button>
          </div>
        </div>
      </div>

      {/* ExamModeSelector Modal */}
      <ExamModeSelector
        isOpen={showExamSelector}
        totalCards={totalCards}
        onClose={handleExamCancel}
        onStartExam={handleExamConfigured}
      />
    </div>
  );
}
