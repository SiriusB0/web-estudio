"use client";

import { useState, useEffect } from "react";
import { Flashcard } from "@/lib/notes/flashcards";
import ImageModal from "./ImageModal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import MermaidRenderer from "./MermaidRenderer";

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
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);

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

  // Detectar si es dispositivo móvil
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  // Manejar gestos de deslizamiento
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX || !touchStartY) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchStartX - touchEndX;
    const deltaY = touchStartY - touchEndY;

    // Solo procesar si el deslizamiento horizontal es mayor que el vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0 && !isLastCard) {
        // Deslizar izquierda = siguiente
        handleNext();
      } else if (deltaX < 0 && currentIndex > 0) {
        // Deslizar derecha = anterior
        handlePrevious();
      }
    }

    setTouchStartX(0);
    setTouchStartY(0);
  };

  // Componentes de renderizado para Markdown con soporte Mermaid
  const renderMarkdownComponents = {
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "");
      if (!inline && match) {
        const language = match[1] as any;
        const code = String(children).replace(/\n$/, "");
        
        // Renderizar diagramas Mermaid
        if (language === 'mermaid') {
          return <MermaidRenderer chart={code} />;
        }
        
        // Código normal con resaltado
        return (
          <pre className="bg-gray-700 p-3 rounded text-sm overflow-x-auto">
            <code className="text-gray-200">{code}</code>
          </pre>
        );
      }
      return (
        <code className="bg-gray-700 text-gray-200 px-1 py-0.5 rounded text-sm font-mono">
          {children}
        </code>
      );
    },
    p: ({ children }: any) => (
      <p className="text-white mb-2">{children}</p>
    ),
    h1: ({ children }: any) => (
      <h1 className="text-xl font-bold text-white mb-3">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-lg font-semibold text-white mb-2">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-base font-medium text-white mb-2">{children}</h3>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc list-inside text-white mb-2">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-inside text-white mb-2">{children}</ol>
    ),
    li: ({ children }: any) => (
      <li className="text-white">{children}</li>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-800 text-white mb-2">
        {children}
      </blockquote>
    ),
    strong: ({ children }: any) => (
      <strong className="font-bold text-white">{children}</strong>
    ),
    em: ({ children }: any) => (
      <em className="italic text-white">{children}</em>
    )
  };

  // Función para renderizar contenido con soporte Markdown y Mermaid
  const renderContent = (content: string) => {
    // Si el contenido contiene markdown (detectar por caracteres especiales)
    if (content.includes('```') || content.includes('#') || content.includes('*') || content.includes('_')) {
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={renderMarkdownComponents}
        >
          {content}
        </ReactMarkdown>
      );
    }
    
    // Contenido simple sin markdown
    return <p className="text-white">{content}</p>;
  };

  const isStudyComplete = correctCount + incorrectCount === flashcards.length;

  if (!isOpen || flashcards.length === 0) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
        <div 
          className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-hidden relative"
          onTouchStart={isMobile ? handleTouchStart : undefined}
          onTouchEnd={isMobile ? handleTouchEnd : undefined}
        >
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
              <div className="p-3 md:p-6 min-h-[250px] md:min-h-[300px] flex flex-col justify-center">
                <div className="text-center mb-4">
                  <span className="text-sm text-gray-400">
                    Tarjeta {currentIndex + 1} de {flashcards.length}
                  </span>
                </div>

                {/* Flashcard Container with Flip Animation */}
                <div className="mb-4 md:mb-6 perspective-1000">
                  <div 
                    className={`relative w-full min-h-[180px] md:min-h-[200px] transition-transform duration-700 transform-style-preserve-3d cursor-pointer ${
                      showAnswer ? 'rotate-y-180' : ''
                    }`}
                    onClick={() => !showAnswer && setShowAnswer(true)}
                  >
                    {/* Front Side */}
                    <div className="absolute inset-0 backface-hidden">
                      <h3 className="text-base md:text-lg font-medium text-white mb-2 md:mb-3">Pregunta:</h3>
                      <div className="bg-gray-800 p-3 md:p-4 rounded-lg h-full flex items-center justify-center">
                        {currentCard.front_image_url ? (
                          <div className="text-center">
                            <img
                              src={currentCard.front_image_url}
                              alt={currentCard.front_image_name || "Imagen pregunta"}
                              className="max-w-full max-h-32 md:max-h-48 object-contain mx-auto bg-gray-700 rounded cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                openImageModal(currentCard.front_image_url!, currentCard.front_image_name || "Imagen pregunta");
                              }}
                            />
                            {currentCard.front && (
                              <p className="text-white mt-3">{currentCard.front}</p>
                            )}
                          </div>
                        ) : (
                          renderContent(currentCard.front)
                        )}
                      </div>
                    </div>

                    {/* Back Side */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180">
                      <h3 className="text-base md:text-lg font-medium text-white mb-2 md:mb-3">Respuesta:</h3>
                      <div className="bg-gray-800 p-3 md:p-4 rounded-lg border-l-4 border-blue-500 h-full flex items-center justify-center">
                        {currentCard.back_image_url ? (
                          <div className="text-center">
                            <img
                              src={currentCard.back_image_url}
                              alt={currentCard.back_image_name || "Imagen respuesta"}
                              className="max-w-full max-h-32 md:max-h-48 object-contain mx-auto bg-gray-700 rounded cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                openImageModal(currentCard.back_image_url!, currentCard.back_image_name || "Imagen respuesta");
                              }}
                            />
                            {currentCard.back && (
                              <p className="text-white mt-3">{currentCard.back}</p>
                            )}
                          </div>
                        ) : (
                          renderContent(currentCard.back)
                        )}
                      </div>
                    </div>
                  </div>
                </div>


                {/* Action Buttons */}
                <div className="flex justify-center gap-3">
                  {!showAnswer ? (
                    <div className="text-center">
                      <p className="text-xs md:text-sm text-gray-400 mb-2 md:mb-3">
                        {isMobile ? 'Toca la tarjeta o desliza ← →' : 'Toca la tarjeta para voltearla'}
                      </p>
                      <button
                        onClick={() => setShowAnswer(true)}
                        className="px-4 md:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm md:text-base"
                      >
                        Mostrar Respuesta
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 md:gap-3">
                      <button
                        onClick={() => handleAnswer(false)}
                        className="px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-sm md:text-base"
                      >
                        ❌ Incorrecta
                      </button>
                      <button
                        onClick={() => handleAnswer(true)}
                        className="px-3 md:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-sm md:text-base"
                      >
                        ✅ Correcta
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation - Solo indicadores en móvil, botones en desktop */}
              <div className="flex items-center justify-center p-3 md:p-4 border-t border-gray-700">
                {!isMobile && (
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
                )}

                <div className={`flex gap-1 md:gap-2 ${!isMobile ? 'mx-4' : ''}`}>
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

                {!isMobile && (
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
                )}
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
