"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Flashcard, getFlashcardsForNotes } from "@/lib/notes/flashcards";
import { supabase } from "@/lib/supabaseClient";
import ImageModal from "@/components/notes/ImageModal";

export default function FolderStudyPage() {
  const params = useParams();
  const router = useRouter();
  const folderId = params.folderId as string;

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [folderName, setFolderName] = useState<string>("");
  const [studyStats, setStudyStats] = useState({
    correct: 0,
    incorrect: 0,
    doubt: 0
  });
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState("");
  const [modalImageName, setModalImageName] = useState("");

  useEffect(() => {
    // Obtener noteIds de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const noteIdsParam = urlParams.get('notes');
    
    if (noteIdsParam) {
      const noteIds = noteIdsParam.split(',');
      loadFlashcards(noteIds);
    } else {
      router.push('/editor');
    }
    
    loadFolderName();
  }, [folderId]);

  const loadFlashcards = async (noteIds: string[]) => {
    try {
      const cards = await getFlashcardsForNotes(noteIds);
      if (cards.length === 0) {
        router.push('/editor');
        return;
      }
      
      // Mezclar las flashcards para estudio aleatorio
      const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
      setFlashcards(shuffledCards);
    } catch (error) {
      console.error("Error cargando flashcards:", error);
      router.push('/editor');
    } finally {
      setLoading(false);
    }
  };

  const loadFolderName = async () => {
    try {
      if (folderId === 'root') {
        setFolderName('Carpeta raíz');
        return;
      }

      const { data } = await supabase
        .from('folders')
        .select('name')
        .eq('id', folderId)
        .single();
      
      if (data) {
        setFolderName(data.name);
      }
    } catch (error) {
      console.error("Error cargando nombre de carpeta:", error);
    }
  };

  const handleAnswer = (type: 'correct' | 'incorrect' | 'doubt') => {
    setStudyStats(prev => ({
      ...prev,
      [type]: prev[type] + 1
    }));

    // Avanzar a la siguiente flashcard
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      // Finalizar estudio
      setCurrentIndex(flashcards.length); // Mostrar resumen
    }
  };

  const openImageModal = (imageUrl: string, imageName: string) => {
    setModalImageUrl(imageUrl);
    setModalImageName(imageName);
    setImageModalOpen(true);
  };

  const restartStudy = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setStudyStats({ correct: 0, incorrect: 0, doubt: 0 });
    // Volver a mezclar
    const shuffledCards = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffledCards);
  };

  const goBack = async () => {
    // Obtener la primera nota de la carpeta para volver a ella
    try {
      const { data: notes } = await supabase
        .from('notes')
        .select('id')
        .eq('folder_id', folderId)
        .order('sort_order', { ascending: true })
        .limit(1);
      
      if (notes && notes.length > 0) {
        router.replace(`/editor?note=${notes[0].id}`);
      } else {
        router.replace('/editor');
      }
    } catch (error) {
      console.error("Error obteniendo primera nota:", error);
      router.replace('/editor');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        {/* Loading completamente invisible para evitar flash */}
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl mb-4">No hay flashcards para estudiar</h1>
          <button
            onClick={goBack}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  // Mostrar resumen final
  if (currentIndex >= flashcards.length) {
    const total = studyStats.correct + studyStats.incorrect + studyStats.doubt;
    const accuracy = total > 0 ? Math.round((studyStats.correct / total) * 100) : 0;

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-white mb-2">¡Estudio completado!</h1>
          <p className="text-gray-400 mb-6">Carpeta: {folderName}</p>
          
          <div className="space-y-4 mb-6">
            <div className="text-green-400">
              ✅ Acertadas: {studyStats.correct}
            </div>
            <div className="text-red-400">
              ❌ Incorrectas: {studyStats.incorrect}
            </div>
            <div className="text-yellow-400">
              🤔 Dudas: {studyStats.doubt}
            </div>
            <div className="text-blue-400 text-lg font-semibold">
              📊 Precisión: {accuracy}%
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={restartStudy}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            >
              Estudiar de nuevo
            </button>
            <button
              onClick={goBack}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header minimalista */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button
            onClick={goBack}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Volver
          </button>
          
          <div className="text-center">
            <h1 className="text-white font-medium">Estudio de carpeta</h1>
            <p className="text-sm text-gray-400">
              {folderName} • {currentIndex + 1} de {flashcards.length}
            </p>
          </div>
          
          <div className="text-sm text-gray-400">
            {studyStats.correct + studyStats.incorrect + studyStats.doubt} respondidas
          </div>
        </div>
        
        {/* Barra de progreso */}
        <div className="max-w-4xl mx-auto mt-3">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div className="max-w-2xl w-full h-full flex flex-col justify-center">
          {/* Título dinámico fuera de la flashcard - altura fija */}
          <div className="text-center h-16 flex items-center justify-center">
            <h2 className="text-2xl font-medium text-gray-300">
              {showAnswer ? 'Respuesta' : 'Pregunta'}
            </h2>
          </div>

          {/* Flashcard con efecto flip - altura fija */}
          <div className="relative w-full h-96 perspective-1000">
            <div 
              className={`absolute inset-0 w-full h-full transition-transform duration-700 transform-style-preserve-3d cursor-pointer ${
                showAnswer ? 'rotate-y-180' : ''
              }`}
              onClick={() => setShowAnswer(!showAnswer)}
            >
              {/* Lado frontal - Pregunta */}
              <div className="absolute inset-0 w-full h-full bg-gray-800 rounded-lg p-8 backface-hidden flashcard-front border-2 border-gray-700 hover:border-blue-500 transition-colors">
                <div className="flex items-center justify-center h-full">
                  {currentCard.front_image_url ? (
                    <img 
                      src={currentCard.front_image_url} 
                      alt={currentCard.front_image_name || "Imagen de pregunta"}
                      className="max-w-full max-h-full object-contain cursor-pointer rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        openImageModal(currentCard.front_image_url!, currentCard.front_image_name || "Imagen de pregunta");
                      }}
                    />
                  ) : (
                    <p className="text-xl text-white leading-relaxed text-center">
                      {currentCard.front}
                    </p>
                  )}
                </div>
              </div>

              {/* Lado trasero - Respuesta */}
              <div className="absolute inset-0 w-full h-full bg-gray-800 rounded-lg p-8 backface-hidden flashcard-back border-2 border-green-600">
                <div className="flex items-center justify-center h-full">
                  {currentCard.back_image_url ? (
                    <img 
                      src={currentCard.back_image_url} 
                      alt={currentCard.back_image_name || "Imagen de respuesta"}
                      className="max-w-full max-h-full object-contain cursor-pointer rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        openImageModal(currentCard.back_image_url!, currentCard.back_image_name || "Imagen de respuesta");
                      }}
                    />
                  ) : (
                    <p className="text-xl text-gray-200 leading-relaxed text-center">
                      {currentCard.back}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Botones de evaluación - altura fija siempre presente */}
          <div className="h-20 flex items-center justify-center">
            <div
              className={`flex justify-center gap-4 ${
                showAnswer
                  ? 'transition-opacity duration-300 delay-500 opacity-100'
                  : 'opacity-0 pointer-events-none'
              }`}>
              <button
                onClick={() => handleAnswer('incorrect')}
                className="w-12 h-12 bg-red-600 hover:bg-red-700 rounded-full transition-all hover:scale-105 flex items-center justify-center"
                title="No acerté"
              >
                <svg width="24" height="24" viewBox="0 0 40 40" className="text-white">
                  <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <line x1="14" y1="14" x2="26" y2="26" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  <line x1="26" y1="14" x2="14" y2="26" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </button>
              <button
                onClick={() => handleAnswer('doubt')}
                className="w-12 h-12 bg-yellow-600 hover:bg-yellow-700 rounded-full transition-all hover:scale-105 flex items-center justify-center"
                title="Duda"
              >
                <svg width="24" height="24" viewBox="0 0 40 40" className="text-white">
                  <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="13.5" cy="20" r="2.2" fill="currentColor"/>
                  <circle cx="20" cy="20" r="2.2" fill="currentColor"/>
                  <circle cx="26.5" cy="20" r="2.2" fill="currentColor"/>
                </svg>
              </button>
              <button
                onClick={() => handleAnswer('correct')}
                className="w-12 h-12 bg-green-600 hover:bg-green-700 rounded-full transition-all hover:scale-105 flex items-center justify-center"
                title="Acerté"
              >
                <svg width="24" height="24" viewBox="0 0 40 40" className="text-white">
                  <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 20 L18 26 L28 14" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de imagen */}
      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={modalImageUrl}
        imageName={modalImageName}
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  );
}
