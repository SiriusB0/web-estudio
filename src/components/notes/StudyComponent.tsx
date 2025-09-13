"use client";

import { useState, useEffect } from "react";
import { Flashcard, getFlashcardsForNote } from "@/lib/notes/flashcards";
import StudyMode from "./StudyMode";
import ExamStudyMode from "./ExamStudyMode";
import ExamResultsModal from "./ExamResultsModal";
import { selectRandomFlashcards, ExamFlashcard, ExamResult } from "@/lib/notes/examUtils";
import { ArrowLeftIcon, AcademicCapIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabaseClient";
import NotePreview from "./NotePreview";

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
  const [noteContent, setNoteContent] = useState<string>('');
  const [noteTitle, setNoteTitle] = useState<string>('');

  useEffect(() => {
    loadFlashcards();
  }, [noteId, studyMode]);

  const loadFlashcards = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar contenido de la nota con JOIN para verificar carpeta pública
      console.log('🔍 Intentando cargar nota con ID:', noteId);
      const { data: noteData, error: noteError } = await supabase
        .from('notes')
        .select(`
          title, 
          content_md,
          folder_id,
          folders!inner(
            id,
            name,
            is_public
          )
        `)
        .eq('id', noteId)
        .single();

      console.log('📄 Datos de nota recibidos:', noteData);
      console.log('❌ Error al cargar nota:', noteError);

      if (noteError) {
        console.error('💥 Error detallado:', noteError);
        throw noteError;
      }
      
      setNoteTitle(noteData?.title || '');
      setNoteContent(noteData?.content_md || '');
      console.log('✅ Nota cargada - Título:', noteData?.title, 'Contenido length:', noteData?.content_md?.length);
      
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
      <div className="min-h-screen bg-gray-900 p-6">
        {/* Header con botón de volver */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Volver</span>
          </button>
          <h1 className="text-xl font-semibold text-slate-200">{noteTitle}</h1>
          <div></div>
        </div>

        {/* Contenido de la nota - Layout idéntico al StudyOnlyInterface */}
        <div className="flex gap-6">
          {/* Contenido principal */}
          <div className="flex-1">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <NotePreview content={noteContent} />
            </div>
          </div>
          
          {/* Sidebar derecho con info de flashcards */}
          <div className="w-80">
            {/* Info de flashcards y botón */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-slate-300">
                  <span>📚 {flashcards.length} flashcards disponibles</span>
                  <div className="text-blue-400 font-medium mt-1">
                    {studyMode === 'traditional' && 'Modo Tradicional'}
                    {studyMode === 'multiple_choice' && 'Modo Múltiple Choice'}
                    {studyMode === 'mixed' && 'Modo Mixto'}
                    {studyMode === 'exam' && `Modo Examen (${examConfig?.questionCount} preguntas, ${examConfig?.timeMinutes}min)`}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    console.log('StudyComponent - Comenzar Estudio clicked, calling startStudy()');
                    startStudy();
                  }}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  <AcademicCapIcon className="w-5 h-5" />
                  <span>🎯 Estudiar</span>
                </button>
              </div>
            </div>
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
