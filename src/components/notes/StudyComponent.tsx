"use client";

import { useState, useEffect } from "react";
import { Flashcard, getFlashcardsForNote } from "@/lib/notes/flashcards";
import StudyMode from "./StudyMode";
import ExamStudyMode from "./ExamStudyMode";
import ExamResultsModal from "./ExamResultsModal";
import { selectRandomFlashcards, ExamFlashcard, ExamResult } from "@/lib/notes/examUtils";
import { ArrowLeftIcon, AcademicCapIcon } from "@heroicons/react/24/outline";

interface StudyComponentProps {
  noteId: string;
  studyMode: 'traditional' | 'multiple_choice' | 'mixed' | 'exam';
  examConfig?: { questionCount: number; timeMinutes: number };
  onBack: () => void;
}

export default function StudyComponent({ noteId, studyMode, examConfig, onBack }: StudyComponentProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studyModeOpen, setStudyModeOpen] = useState(false);
  const [examFlashcards, setExamFlashcards] = useState<ExamFlashcard[]>([]);
  const [examModeOpen, setExamModeOpen] = useState(false);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [showExamResults, setShowExamResults] = useState(false);

  useEffect(() => {
    loadFlashcards();
  }, [noteId, studyMode]);

  const loadFlashcards = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const allFlashcards = await getFlashcardsForNote(noteId);
      console.log('Todas las flashcards cargadas:', allFlashcards);
      
      // Filtrar según el modo de estudio
      let filteredCards: Flashcard[] = [];
      
      if (studyMode === 'traditional') {
        filteredCards = allFlashcards.filter(card => card.type !== 'multiple_choice');
      } else if (studyMode === 'multiple_choice') {
        filteredCards = allFlashcards.filter(card => card.type === 'multiple_choice');
      } else {
        // mixed - todas las flashcards
        filteredCards = allFlashcards;
      }
      
      console.log(`Modo: ${studyMode}, Flashcards filtradas:`, filteredCards);
      console.log(`Total después del filtro: ${filteredCards.length}`);
      
      // Ordenar por created_at para asegurar orden consistente
      filteredCards.sort((a, b) => {
        const dateA = new Date(a.created_at || '').getTime();
        const dateB = new Date(b.created_at || '').getTime();
        return dateA - dateB;
      });
      
      setFlashcards(filteredCards);
    } catch (err) {
      console.error('Error cargando flashcards:', err);
      setError('Error al cargar las flashcards');
    } finally {
      setLoading(false);
    }
  };

  const startStudy = () => {
    console.log('startStudy called with:', { studyMode, examConfig, flashcardsLength: flashcards.length });
    if (studyMode === 'exam' && examConfig) {
      // Preparar flashcards para modo examen
      const selectedCards = selectRandomFlashcards(flashcards, examConfig.questionCount);
      console.log('Selected cards for exam:', selectedCards);
      
      // Actualizar ambos estados en la misma función
      setExamFlashcards(selectedCards);
      setExamModeOpen(true);
      console.log('ExamModeOpen set to true, examFlashcards updated');
    } else {
      console.log('Opening regular study mode');
      setStudyModeOpen(true);
    }
  };

  const handleExamComplete = (result: ExamResult) => {
    setExamResult(result);
    setExamModeOpen(false);
    setShowExamResults(true);
  };

  const handleRetryExam = () => {
    setShowExamResults(false);
    setExamResult(null);
    // Generar nuevas flashcards aleatorias
    if (examConfig) {
      const selectedCards = selectRandomFlashcards(flashcards, examConfig.questionCount);
      setExamFlashcards(selectedCards);
      setExamModeOpen(true);
    }
  };

  const closeStudy = () => {
    setStudyModeOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando flashcards...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">⚠</span>
          </div>
          <h3 className="text-white font-medium mb-2">Error</h3>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button
            onClick={loadFlashcards}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <AcademicCapIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-white font-medium mb-2">No hay flashcards</h3>
          <p className="text-slate-400 text-sm mb-6">
            {studyMode === 'traditional' && 'Esta nota no tiene flashcards tradicionales.'}
            {studyMode === 'multiple_choice' && 'Esta nota no tiene preguntas de múltiple choice.'}
            {studyMode === 'mixed' && 'Esta nota no tiene flashcards de ningún tipo.'}
          </p>
          <button
            onClick={onBack}
            className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors mx-auto"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Volver</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AcademicCapIcon className="w-10 h-10 text-white" />
          </div>
          
          <h3 className="text-white text-xl font-medium mb-2">¡Listo para estudiar!</h3>
          
          <div className="bg-slate-800 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between text-sm text-slate-300 mb-2">
              <span>Flashcards encontradas:</span>
              <span className="font-medium text-white">{flashcards.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Modo de estudio:</span>
              <span className="font-medium text-blue-400">
                {studyMode === 'traditional' && 'Tradicional'}
                {studyMode === 'multiple_choice' && 'Múltiple Choice'}
                {studyMode === 'mixed' && 'Mixto'}
                {studyMode === 'exam' && `Examen (${examConfig?.questionCount} preguntas, ${examConfig?.timeMinutes}min)`}
              </span>
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={(e) => {
                e.preventDefault();
                console.log('StudyComponent - Comenzar Estudio clicked, calling startStudy()');
                startStudy();
              }}
              className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              <AcademicCapIcon className="w-5 h-5" />
              <span>Comenzar Estudio</span>
            </button>
            
            <button
              onClick={onBack}
              className="flex items-center justify-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>Volver</span>
            </button>
          </div>
        </div>
      </div>

      {/* Componente StudyMode */}
      <StudyMode
        flashcards={flashcards}
        isOpen={studyModeOpen}
        onClose={closeStudy}
        title={`Estudio - ${flashcards.length} flashcards`}
      />

      {/* Componente ExamStudyMode */}
      {examModeOpen && examFlashcards.length > 0 && (
        <ExamStudyMode
          flashcards={examFlashcards}
          timeMinutes={examConfig?.timeMinutes || 15}
          isOpen={examModeOpen}
          onClose={() => setExamModeOpen(false)}
          onExamComplete={handleExamComplete}
          title={`Examen - ${examConfig?.questionCount || examFlashcards.length} preguntas`}
        />
      )}

      {/* Modal de Resultados del Examen */}
      {examResult && (
        <ExamResultsModal
          isOpen={showExamResults}
          result={examResult}
          onClose={() => setShowExamResults(false)}
          onRetry={handleRetryExam}
        />
      )}
    </>
  );
}
