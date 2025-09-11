"use client";

import { useState, useEffect } from "react";
import { Flashcard, flashcardToMultipleChoice } from "@/lib/notes/flashcards";
import { MultipleChoiceQuestion } from "@/lib/notes/multipleChoiceParser";
import ImageModal from "./ImageModal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import MermaidRenderer from "./MermaidRenderer";
import MultipleChoiceCard from "./MultipleChoiceCard";

interface StudyCard {
  id: string;
  type: 'traditional' | 'multiple_choice';
  flashcard?: Flashcard;
  multipleChoice?: MultipleChoiceQuestion;
}

interface MixedStudyModeProps {
  flashcards: Flashcard[];
  isOpen: boolean;
  onClose: () => void;
  title: string;
  studyMode: 'traditional' | 'multiple_choice' | 'mixed';
}

export default function MixedStudyMode({ 
  flashcards, 
  isOpen, 
  onClose, 
  title, 
  studyMode 
}: MixedStudyModeProps) {
  const [studyCards, setStudyCards] = useState<StudyCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set());
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState("");
  const [modalImageName, setModalImageName] = useState("");

  // Preparar las tarjetas según el modo de estudio
  useEffect(() => {
    if (isOpen && flashcards.length > 0) {
      const cards: StudyCard[] = [];
      
      flashcards.forEach((flashcard, index) => {
        const isMultipleChoice = flashcard.type === 'multiple_choice';
        
        // Filtrar según el modo de estudio
        if (studyMode === 'traditional' && isMultipleChoice) return;
        if (studyMode === 'multiple_choice' && !isMultipleChoice) return;
        
        if (isMultipleChoice) {
          const mcQuestion = flashcardToMultipleChoice(flashcard);
          if (mcQuestion) {
            cards.push({
              id: flashcard.id || `mc_${index}`,
              type: 'multiple_choice',
              multipleChoice: mcQuestion
            });
          }
        } else {
          cards.push({
            id: flashcard.id || `trad_${index}`,
            type: 'traditional',
            flashcard
          });
        }
      });

      // Mezclar las tarjetas si es modo mixto
      if (studyMode === 'mixed') {
        for (let i = cards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [cards[i], cards[j]] = [cards[j], cards[i]];
        }
      }

      setStudyCards(cards);
      setCurrentIndex(0);
      setShowAnswer(false);
      setCorrectCount(0);
      setIncorrectCount(0);
      setStudiedCards(new Set());
    }
  }, [isOpen, flashcards, studyMode]);

  const currentCard = studyCards[currentIndex];
  const isLastCard = currentIndex === studyCards.length - 1;
  const progress = ((correctCount + incorrectCount) / studyCards.length) * 100;

  const handleTraditionalAnswer = (correct: boolean | null) => {
    if (correct === true) {
      setCorrectCount(prev => prev + 1);
    } else if (correct === false) {
      setIncorrectCount(prev => prev + 1);
    }

    setStudiedCards(prev => new Set([...prev, currentIndex]));
    
    setTimeout(() => {
      if (isLastCard) {
        return;
      }
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    }, 500);
  };

  const handleMultipleChoiceAnswer = (selectedAnswers: string[], isCorrect: boolean) => {
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    } else {
      setIncorrectCount(prev => prev + 1);
    }

    setStudiedCards(prev => new Set([...prev, currentIndex]));
    
    setTimeout(() => {
      if (isLastCard) {
        return;
      }
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    }, 2000); // Más tiempo para leer el resultado
  };

  const handleNext = () => {
    if (isLastCard) return;
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

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const handleCardTap = () => {
    if (currentCard?.type === 'traditional') {
      setShowAnswer(!showAnswer);
    }
  };

  // Componentes de renderizado para Markdown
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
      <p className="text-white mb-2 whitespace-pre-wrap">{children}</p>
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
    hr: () => (
      <hr className="border-gray-600 my-4" />
    ),
    thematicBreak: () => (
      <hr className="border-gray-600 my-4" />
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

  const isStudyComplete = correctCount + incorrectCount === studyCards.length;

  if (!isOpen || studyCards.length === 0) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
        <div className={`rounded-lg w-full max-w-4xl overflow-hidden relative flex flex-col ${
          isMobile ? 'bg-slate-800 h-[95vh] mx-2' : 'bg-gray-900 max-h-[90vh]'
        }`}>
          {/* Header - Solo en desktop */}
          {!isMobile && (
            <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-white">Modo Estudio</h2>
                <p className="text-sm text-gray-400">{title}</p>
                <p className="text-xs text-gray-500">
                  Modo: {studyMode === 'mixed' ? 'Mixto' : 
                         studyMode === 'multiple_choice' ? 'Opción Múltiple' : 'Tradicional'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          {/* Progress Bar */}
          <div className={`p-2 md:p-4 border-b flex-shrink-0 ${
            isMobile ? 'border-slate-600' : 'border-gray-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-300">
                  Progreso: {correctCount + incorrectCount} / {studyCards.length}
                </span>
                <span className="text-sm text-gray-300">
                  ✅ {correctCount} | ❌ {incorrectCount}
                </span>
              </div>
              {isMobile && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors text-lg"
                >
                  ✕
                </button>
              )}
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
                  Precisión: {Math.round((correctCount / studyCards.length) * 100)}%
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
              <div className={`flex-1 flex flex-col overflow-hidden ${
                isMobile ? 'p-4 justify-between' : 'p-6 justify-center'
              }`}>
                {isMobile && (
                  <div className="text-center mb-4">
                    <span className="text-sm text-gray-400">
                      Tarjeta {currentIndex + 1} de {studyCards.length}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({currentCard?.type === 'multiple_choice' ? 'Opción Múltiple' : 'Tradicional'})
                    </span>
                  </div>
                )}

                {/* Render Current Card */}
                {currentCard?.type === 'multiple_choice' && currentCard.multipleChoice ? (
                  <MultipleChoiceCard
                    question={currentCard.multipleChoice}
                    onAnswer={handleMultipleChoiceAnswer}
                    className="max-w-2xl mx-auto"
                  />
                ) : currentCard?.type === 'traditional' && currentCard.flashcard ? (
                  /* Traditional Flashcard */
                  <div className={`perspective-1000 flex items-center justify-center ${
                    isMobile ? 'flex-1' : 'mb-6'
                  }`}>
                    <div 
                      className={`relative w-full transition-transform duration-700 transform-style-preserve-3d cursor-pointer ${
                        showAnswer ? 'rotate-y-180' : ''
                      } ${
                        isMobile ? 'h-[300px] max-w-[350px]' : 'min-h-[200px] max-w-2xl'
                      }`}
                      onClick={handleCardTap}
                    >
                      {/* Front Side */}
                      <div className="absolute inset-0 backface-hidden">
                        <div className={`rounded-lg h-full flex flex-col ${
                          isMobile ? 'bg-slate-700 p-4' : 'bg-gray-800 p-4'
                        }`}>
                          <h3 className={`font-medium text-white mb-3 ${
                            isMobile ? 'text-base text-center' : 'text-lg'
                          }`}>Pregunta:</h3>
                          <div className="flex-1 flex items-center justify-center">
                            {currentCard.flashcard.front_image_url ? (
                              <div className="text-center">
                                <img
                                  src={currentCard.flashcard.front_image_url}
                                  alt={currentCard.flashcard.front_image_name || "Imagen pregunta"}
                                  className={`max-w-full object-contain mx-auto bg-gray-700 rounded cursor-pointer ${
                                    isMobile ? 'max-h-40' : 'max-h-48'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openImageModal(currentCard.flashcard!.front_image_url!, currentCard.flashcard!.front_image_name || "Imagen pregunta");
                                  }}
                                />
                                {currentCard.flashcard.front && (
                                  <div className={`mt-3 ${isMobile ? 'text-sm text-center' : ''}`}>
                                    {renderContent(currentCard.flashcard.front)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className={isMobile ? 'text-center text-sm' : ''}>
                                {renderContent(currentCard.flashcard.front)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Back Side */}
                      <div className="absolute inset-0 backface-hidden rotate-y-180">
                        <div className={`rounded-lg border-l-4 h-full flex flex-col ${
                          isMobile ? 'bg-slate-700 border-slate-400 p-4' : 'bg-gray-800 border-blue-500 p-4'
                        }`}>
                          <h3 className={`font-medium text-white mb-3 ${
                            isMobile ? 'text-base text-center' : 'text-lg'
                          }`}>Respuesta:</h3>
                          <div className="flex-1 flex items-center justify-center">
                            {currentCard.flashcard.back_image_url ? (
                              <div className="text-center">
                                <img
                                  src={currentCard.flashcard.back_image_url}
                                  alt={currentCard.flashcard.back_image_name || "Imagen respuesta"}
                                  className={`max-w-full object-contain mx-auto bg-gray-700 rounded cursor-pointer ${
                                    isMobile ? 'max-h-40' : 'max-h-48'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openImageModal(currentCard.flashcard!.back_image_url!, currentCard.flashcard!.back_image_name || "Imagen respuesta");
                                  }}
                                />
                                {currentCard.flashcard.back && (
                                  <div className={`mt-3 ${isMobile ? 'text-sm text-center' : ''}`}>
                                    {renderContent(currentCard.flashcard.back)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className={isMobile ? 'text-center text-sm' : ''}>
                                {renderContent(currentCard.flashcard.back)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Traditional Flashcard Action Buttons */}
                {currentCard?.type === 'traditional' && (
                  <div className={`flex-shrink-0 ${
                    isMobile ? 'mt-6 mb-4' : 'mt-2'
                  }`}>
                    {showAnswer && (
                      <div className={`flex items-center justify-center ${
                        isMobile ? 'h-16' : 'h-20'
                      }`}>
                        <div className={`flex justify-center transition-opacity duration-300 delay-500 opacity-100 ${
                          isMobile ? 'gap-6 px-8' : 'gap-4'
                        }`}>
                          <button
                            onClick={() => handleTraditionalAnswer(false)}
                            className={`w-12 h-12 rounded-full transition-all hover:scale-105 flex items-center justify-center ${
                              isMobile ? 'bg-red-700 hover:bg-red-800' : 'bg-red-600 hover:bg-red-700'
                            }`}
                            title="No acerté"
                          >
                            <svg width="24" height="24" viewBox="0 0 40 40" className="text-white">
                              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2"></circle>
                              <line x1="14" y1="14" x2="26" y2="26" stroke="currentColor" strokeWidth="3" strokeLinecap="round"></line>
                              <line x1="26" y1="14" x2="14" y2="26" stroke="currentColor" strokeWidth="3" strokeLinecap="round"></line>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleTraditionalAnswer(null)}
                            className={`w-12 h-12 rounded-full transition-all hover:scale-105 flex items-center justify-center ${
                              isMobile ? 'bg-amber-700 hover:bg-amber-800' : 'bg-yellow-600 hover:bg-yellow-700'
                            }`}
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
                            onClick={() => handleTraditionalAnswer(true)}
                            className={`w-12 h-12 rounded-full transition-all hover:scale-105 flex items-center justify-center ${
                              isMobile ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-green-600 hover:bg-green-700'
                            }`}
                            title="Acerté"
                          >
                            <svg width="24" height="24" viewBox="0 0 40 40" className="text-white">
                              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2"></circle>
                              <polyline points="12,20 18,26 28,16" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"></polyline>
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation - Solo en desktop */}
              {!isMobile && (
                <div className="flex items-center justify-center p-4 border-t border-gray-700 flex-shrink-0">
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

                  <div className="flex gap-2 mx-4">
                    {studyCards.map((_, index) => (
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
