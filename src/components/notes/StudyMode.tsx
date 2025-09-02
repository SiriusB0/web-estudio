"use client";

import { useState, useEffect } from "react";
import { Flashcard } from "@/lib/notes/flashcards";
import ImageModal from "./ImageModal";

interface StudyModeProps {
  flashcards: Flashcard[];
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export default function StudyMode({ flashcards, isOpen, onClose, title }: StudyModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set());
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState("");
  const [modalImageName, setModalImageName] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Reset study session
      setCurrentIndex(0);
      setShowAnswer(false);
      setCorrectCount(0);
      setIncorrectCount(0);
      setStudiedCards(new Set());
    }
  }, [isOpen]);

  const currentCard = flashcards[currentIndex];
  const isLastCard = currentIndex === flashcards.length - 1;
  const progress = ((correctCount + incorrectCount) / flashcards.length) * 100;

  const handleAnswer = (correct: boolean) => {
    if (correct) {
      setCorrectCount(prev => prev + 1);
    } else {
      setIncorrectCount(prev => prev + 1);
    }

    setStudiedCards(prev => new Set([...prev, currentIndex]));
    
    // Move to next card after a short delay
    setTimeout(() => {
      if (isLastCard) {
        // Study session complete
        return;
      }
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    }, 500);
  };

  const handleNext = () => {
    if (isLastCard) {
      return;
    }
    setCurrentIndex(prev => prev + 1);
    setShowAnswer(false);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setShowAnswer(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setCorrectCount(0);
    setIncorrectCount(0);
    setStudiedCards(new Set());
  };

  const openImageModal = (imageUrl: string, imageName: string) => {
    setModalImageUrl(imageUrl);
    setModalImageName(imageName);
    setImageModalOpen(true);
  };

  const isStudyComplete = correctCount + incorrectCount === flashcards.length;

  if (!isOpen || flashcards.length === 0) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-white">Modo Estudio</h2>
              <p className="text-sm text-gray-400">{title}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Progress Bar */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">
                Progreso: {correctCount + incorrectCount} / {flashcards.length}
              </span>
              <span className="text-sm text-gray-300">
                ✅ {correctCount} | ❌ {incorrectCount}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Study Complete Screen */}
          {isStudyComplete ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-white mb-4">¡Estudio Completado!</h3>
              <div className="space-y-2 mb-6">
                <p className="text-lg text-green-400">✅ Correctas: {correctCount}</p>
                <p className="text-lg text-red-400">❌ Incorrectas: {incorrectCount}</p>
                <p className="text-lg text-blue-400">
                  Precisión: {Math.round((correctCount / flashcards.length) * 100)}%
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleRestart}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Estudiar de Nuevo
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Card Content */}
              <div className="p-6 min-h-[300px] flex flex-col justify-center">
                <div className="text-center mb-4">
                  <span className="text-sm text-gray-400">
                    Tarjeta {currentIndex + 1} de {flashcards.length}
                  </span>
                </div>

                {/* Question (Front) */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-white mb-3">Pregunta:</h3>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    {currentCard.front_image_url ? (
                      <div className="text-center">
                        <img
                          src={currentCard.front_image_url}
                          alt={currentCard.front_image_name || "Imagen pregunta"}
                          className="max-w-full max-h-48 object-contain mx-auto bg-gray-700 rounded cursor-pointer"
                          onClick={() => openImageModal(currentCard.front_image_url!, currentCard.front_image_name || "Imagen pregunta")}
                        />
                        {currentCard.front && (
                          <p className="text-white mt-3">{currentCard.front}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-white">{currentCard.front}</p>
                    )}
                  </div>
                </div>

                {/* Answer (Back) */}
                {showAnswer && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-white mb-3">Respuesta:</h3>
                    <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-blue-500">
                      {currentCard.back_image_url ? (
                        <div className="text-center">
                          <img
                            src={currentCard.back_image_url}
                            alt={currentCard.back_image_name || "Imagen respuesta"}
                            className="max-w-full max-h-48 object-contain mx-auto bg-gray-700 rounded cursor-pointer"
                            onClick={() => openImageModal(currentCard.back_image_url!, currentCard.back_image_name || "Imagen respuesta")}
                          />
                          {currentCard.back && (
                            <p className="text-white mt-3">{currentCard.back}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-white">{currentCard.back}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-center gap-3">
                  {!showAnswer ? (
                    <button
                      onClick={() => setShowAnswer(true)}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      Mostrar Respuesta
                    </button>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAnswer(false)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                      >
                        ❌ Incorrecta
                      </button>
                      <button
                        onClick={() => handleAnswer(true)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                      >
                        ✅ Correcta
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between p-4 border-t border-gray-700">
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    currentIndex === 0
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-600 hover:bg-gray-500 text-white'
                  }`}
                >
                  ← Anterior
                </button>

                <div className="flex gap-2">
                  {flashcards.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === currentIndex
                          ? 'bg-blue-500'
                          : studiedCards.has(index)
                          ? 'bg-green-500'
                          : 'bg-gray-600'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  disabled={isLastCard}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    isLastCard
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-600 hover:bg-gray-500 text-white'
                  }`}
                >
                  Siguiente →
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={modalImageUrl}
        imageName={modalImageName}
        onClose={() => setImageModalOpen(false)}
      />
    </>
  );
}
