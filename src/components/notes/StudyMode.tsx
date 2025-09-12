"use client";

import { useState, useEffect } from "react";
import { Flashcard } from "@/lib/notes/flashcards";
import ImageModal from "./ImageModal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import MermaidRenderer from "./MermaidRenderer";
import MultipleChoiceStudyCard from "./MultipleChoiceStudyCard";

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
      console.log('StudyMode iniciado con', flashcards.length, 'flashcards');
      flashcards.forEach((card, index) => {
        console.log(`Flashcard ${index + 1}:`, card.question || card.front);
      });
    }
  }, [isOpen, flashcards]);

  const currentCard = flashcards[currentIndex];
  const isLastCard = currentIndex === flashcards.length - 1;
  const progress = ((correctCount + incorrectCount) / flashcards.length) * 100;

  const handleAnswer = (correct: boolean | null) => {
    console.log('StudyMode - handleAnswer llamado con:', correct);
    console.log('currentIndex antes:', currentIndex);
    console.log('currentCard:', currentCard);
    
    // Prevenir procesamiento múltiple
    if (studiedCards.has(currentIndex)) {
      console.log('Esta tarjeta ya fue procesada, ignorando...');
      return;
    }
    
    if (correct === true) {
      setCorrectCount(prev => prev + 1);
    } else if (correct === false) {
      setIncorrectCount(prev => prev + 1);
    }

    setStudiedCards(prev => new Set([...prev, currentIndex]));
    
    // Para múltiple choice, avanzar automáticamente después de registrar respuesta
    if (currentCard?.type === 'multiple_choice') {
      console.log('Es múltiple choice, avanzando automáticamente...');
      setTimeout(() => {
        if (isLastCard) {
          console.log('Es la última tarjeta, no avanzando');
          return;
        }
        console.log('Avanzando a la siguiente tarjeta...');
        setCurrentIndex(prev => {
          const newIndex = prev + 1;
          console.log(`Cambiando índice de ${prev} a ${newIndex}`);
          return newIndex;
        });
        setShowAnswer(false);
      }, 1000); // Delay más largo para ver el resultado
    } else {
      // Solo avance automático para flashcards tradicionales
      setTimeout(() => {
        if (isLastCard) {
          return;
        }
        setCurrentIndex(prev => prev + 1);
        setShowAnswer(false);
      }, 500);
    }
    
    console.log('StudyMode - handleAnswer completado');
  };

  const handleNext = () => {
    if (isLastCard) {
      return;
    }
    const nextIndex = currentIndex + 1;
    console.log(`Navegando de pregunta ${currentIndex + 1} a pregunta ${nextIndex + 1}`);
    console.log(`Total de flashcards: ${flashcards.length}`);
    console.log(`Flashcard actual:`, flashcards[nextIndex]);
    setCurrentIndex(nextIndex);
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

  // Manejar tap para alternar pregunta/respuesta (solo para flashcards tradicionales)
  const handleCardTap = () => {
    if (currentCard?.type === 'multiple_choice') return;
    setShowAnswer(!showAnswer);
  };

  // Componentes de renderizado para Markdown con soporte Mermaid
  const renderMarkdownComponents = {
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "");
      if (!inline && match) {
        const language = match[1] as any;
        const code = String(children).replace(/\n$/, "");
        
        if (language === 'mermaid') {
          return <MermaidRenderer chart={code} />;
        }
        
        return (
          <pre className="bg-slate-700 p-3 rounded text-sm overflow-x-auto">
            <code className="text-slate-200">{code}</code>
          </pre>
        );
      }
      return (
        <code className="bg-slate-700 text-slate-200 px-1 py-0.5 rounded text-sm font-mono">
          {children}
        </code>
      );
    },
    p: ({ children }: any) => (
      <p className="text-white mb-2 whitespace-pre-wrap">{children}</p>
    ),
    h1: ({ children }: any) => (
      <h1 className="text-xl font-bold text-white mb-3 border-b border-slate-600 pb-2">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-lg font-semibold text-white mb-2">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-base font-medium text-white mb-2">{children}</h3>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc list-inside text-white mb-2 space-y-1">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-inside text-white mb-2 space-y-1">{children}</ol>
    ),
    li: ({ children }: any) => (
      <li className="text-white">{children}</li>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-blue-500 pl-4 py-2 bg-slate-800 text-white mb-2 rounded-r">
        {children}
      </blockquote>
    ),
    strong: ({ children }: any) => (
      <strong className="font-bold text-white">{children}</strong>
    ),
    em: ({ children }: any) => (
      <em className="italic text-white">{children}</em>
    ),
    hr: () => (
      <hr className="border-slate-600 my-4" />
    )
  };

  // Función para renderizar contenido con soporte Markdown y Mermaid
  const renderContent = (content: string) => {
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
    
    return <p className="text-white whitespace-pre-wrap">{content}</p>;
  };

  const isStudyComplete = correctCount + incorrectCount === flashcards.length;

  if (!isOpen || flashcards.length === 0) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
        <div className={`rounded-lg w-full max-w-2xl overflow-hidden relative flex flex-col ${
          isMobile ? 'bg-slate-800 h-[95vh] mx-2' : 'bg-slate-900 max-h-[90vh]'
        }`}>
          
          {/* Header - Móvil optimizado */}
          <div className="bg-slate-800 p-4 border-b border-slate-700 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Modo Estudio</h2>
                <p className="text-sm text-slate-400">{title}</p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors text-xl"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="p-4 border-b border-slate-700 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">
                Progreso: {correctCount + incorrectCount} / {flashcards.length}
              </span>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-400">✅ {correctCount}</span>
                <span className="text-red-400">❌ {incorrectCount}</span>
              </div>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Study Complete Screen */}
          {isStudyComplete ? (
            <div className="p-8 text-center flex-1 flex flex-col justify-center">
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
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Estudiar de Nuevo
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Card Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* Card Counter - Móvil */}
                {isMobile && (
                  <div className="text-center py-3 border-b border-slate-700">
                    <span className="text-sm text-slate-400">
                      Tarjeta {currentIndex + 1} de {flashcards.length}
                    </span>
                  </div>
                )}

                {/* Renderizar según tipo de flashcard */}
                {currentCard?.type === 'multiple_choice' ? (
                  // Componente de múltiple choice
                  <div className="flex-1">
                    <MultipleChoiceStudyCard
                      flashcard={currentCard}
                      questionNumber={currentIndex + 1}
                      totalQuestions={flashcards.length}
                      onAnswer={handleAnswer}
                      onNext={handleNext}
                    />
                  </div>
                ) : (
                  // Flashcard tradicional con flip
                  <div className="flex-1 flex flex-col justify-center p-4">
                    <div className="perspective-1000 flex items-center justify-center">
                      <div 
                        className={`relative w-full transition-transform duration-700 transform-style-preserve-3d cursor-pointer ${
                          showAnswer ? 'rotate-y-180' : ''
                        } ${
                          isMobile ? 'h-[300px] max-w-[350px]' : 'min-h-[200px]'
                        }`}
                        onClick={handleCardTap}
                      >
                        {/* Front Side */}
                        <div className="absolute inset-0 backface-hidden">
                          <div className="bg-slate-700 rounded-lg h-full flex flex-col p-4">
                            <h3 className="font-medium text-white mb-3 text-center">Pregunta:</h3>
                            <div className="flex-1 flex items-center justify-center">
                              {currentCard?.front_image_url ? (
                                <div className="text-center">
                                  <img
                                    src={currentCard.front_image_url}
                                    alt={currentCard.front_image_name || "Imagen pregunta"}
                                    className="max-w-full max-h-40 object-contain mx-auto bg-slate-600 rounded cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openImageModal(currentCard.front_image_url!, currentCard.front_image_name || "Imagen pregunta");
                                    }}
                                  />
                                  {currentCard.front && (
                                    <div className="mt-3 text-sm">
                                      {renderContent(currentCard.front)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center text-sm">
                                  {renderContent(currentCard?.front || '')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Back Side */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180">
                          <div className="bg-slate-700 border-l-4 border-blue-500 rounded-lg h-full flex flex-col p-4">
                            <h3 className="font-medium text-white mb-3 text-center">Respuesta:</h3>
                            <div className="flex-1 flex items-center justify-center">
                              {currentCard?.back_image_url ? (
                                <div className="text-center">
                                  <img
                                    src={currentCard.back_image_url}
                                    alt={currentCard.back_image_name || "Imagen respuesta"}
                                    className="max-w-full max-h-40 object-contain mx-auto bg-slate-600 rounded cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openImageModal(currentCard.back_image_url!, currentCard.back_image_name || "Imagen respuesta");
                                    }}
                                  />
                                  {currentCard.back && (
                                    <div className="mt-3 text-sm">
                                      {renderContent(currentCard.back)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center text-sm">
                                  {renderContent(currentCard?.back || '')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons - Solo para flashcards tradicionales */}
                    {showAnswer && (
                      <div className="mt-6 mb-4">
                        <div className="flex items-center justify-center h-16">
                          <div className="flex justify-center gap-6 px-8">
                            <button
                              onClick={() => handleAnswer(false)}
                              className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 transition-all hover:scale-105 flex items-center justify-center"
                              title="No acerté"
                            >
                              <svg width="24" height="24" viewBox="0 0 40 40" className="text-white">
                                <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2"></circle>
                                <line x1="14" y1="14" x2="26" y2="26" stroke="currentColor" strokeWidth="3" strokeLinecap="round"></line>
                                <line x1="26" y1="14" x2="14" y2="26" stroke="currentColor" strokeWidth="3" strokeLinecap="round"></line>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleAnswer(null)}
                              className="w-12 h-12 rounded-full bg-amber-600 hover:bg-amber-700 transition-all hover:scale-105 flex items-center justify-center"
                              title="Duda"
                            >
                              <svg width="24" height="24" viewBox="0 0 40 40" className="text-white">
                                <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2"></circle>
                                <circle cx="13.5" cy="20" r="2.2" fill="currentColor"></circle>
                                <circle cx="20" cy="20" r="2.2" fill="currentColor"></circle>
                                <circle cx="26.5" cy="20" r="2.2" fill="currentColor"></circle>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleAnswer(true)}
                              className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-700 transition-all hover:scale-105 flex items-center justify-center"
                              title="Acerté"
                            >
                              <svg width="24" height="24" viewBox="0 0 40 40" className="text-white">
                                <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2"></circle>
                                <polyline points="12,20 18,26 28,16" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"></polyline>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation - Solo en desktop para flashcards tradicionales */}
              {!isMobile && currentCard?.type !== 'multiple_choice' && (
                <div className="flex items-center justify-center p-4 border-t border-slate-700 flex-shrink-0">
                  <button
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      currentIndex === 0
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-600 hover:bg-slate-500 text-white'
                    }`}
                  >
                    ← Anterior
                  </button>

                  <div className="flex gap-2 mx-4">
                    {flashcards.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${
                          index === currentIndex
                            ? 'bg-blue-500'
                            : studiedCards.has(index)
                            ? 'bg-green-500'
                            : 'bg-slate-600'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleNext}
                    disabled={isLastCard}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      isLastCard
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-600 hover:bg-slate-500 text-white'
                    }`}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
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
