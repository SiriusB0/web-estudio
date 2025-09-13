"use client";

import { useState } from "react";

interface ExamModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onStartExam: (config: ExamConfig) => void;
  totalCards: number;
}

export interface ExamConfig {
  questionCount: number;
  timeMinutes: number;
}

export default function ExamModeSelector({
  isOpen,
  onClose,
  onStartExam,
  totalCards
}: ExamModeSelectorProps) {
  const [questionCount, setQuestionCount] = useState(Math.min(10, Math.max(5, totalCards)));
  const [timeMinutes, setTimeMinutes] = useState(15);

  const handleStartExam = () => {
    console.log('handleStartExam called with:', { questionCount, timeMinutes, totalCards });
    onStartExam({
      questionCount,
      timeMinutes
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-slate-800/95 backdrop-blur-md rounded-2xl w-full max-w-sm border border-slate-600/50 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white mb-1">Configurar Examen</h2>
              <p className="text-xs text-slate-400">Personaliza tu sesión de evaluación</p>
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
        <div className="px-4 pb-4 pt-2">
          {/* Question Count */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center text-xs">
                📝
              </div>
              <h3 className="text-white font-medium text-sm">Número de preguntas</h3>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3">
              <input
                type="range"
                min="5"
                max={Math.max(5, totalCards)}
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${totalCards > 5 ? ((questionCount - 5) / (totalCards - 5)) * 100 : 0}%, #475569 ${totalCards > 5 ? ((questionCount - 5) / (totalCards - 5)) * 100 : 0}%, #475569 100%)`
                }}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-slate-400">Mínimo: 5</span>
                <div className="bg-blue-600/20 px-2 py-1 rounded-lg">
                  <span className="text-blue-400 font-medium text-sm">{questionCount} preguntas</span>
                </div>
                <span className="text-xs text-slate-400">Máximo: {totalCards}</span>
              </div>
            </div>
          </div>

          {/* Time Limit */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-red-500/20 rounded-lg flex items-center justify-center text-xs">
                ⏰
              </div>
              <h3 className="text-white font-medium text-sm">Tiempo límite</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[10, 15, 20, 30, 45, 60].map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => setTimeMinutes(minutes)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium transition-all duration-200 ${
                    timeMinutes === minutes
                      ? 'bg-red-600/20 border-2 border-red-500/50 text-red-400 shadow-lg shadow-red-500/10'
                      : 'bg-slate-800/50 border-2 border-slate-700/50 text-slate-300 hover:border-slate-600/50 hover:bg-slate-800/70'
                  }`}
                >
                  {minutes}min
                </button>
              ))}
            </div>
          </div>

          {/* Exam Summary - Horizontal Layout */}
          <div className="mb-3 p-3 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-xl border border-slate-600/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-purple-500/20 rounded-lg flex items-center justify-center text-xs">
                  📚
                </div>
                <span className="text-white text-sm font-medium">{questionCount} flashcards disponibles</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-sm">Modo Examen ({questionCount} preguntas, {timeMinutes}min)</span>
                <button
                  onClick={handleStartExam}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg transition-all duration-200 shadow-lg shadow-green-500/20 text-sm font-medium"
                >
                  Comenzar
                </button>
              </div>
            </div>
          </div>

          {/* Cancel Button Only */}
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-all duration-200 border border-slate-600/50 text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
