"use client";

import { useState, useEffect } from "react";
import { Flashcard } from "@/lib/notes/flashcards";
import ImageModal from "./ImageModal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import MermaidRenderer from "./MermaidRenderer";
import MultipleChoiceStudyCard from "./MultipleChoiceStudyCard";
import UnifiedCodeBlock from "./UnifiedCodeBlock";
import CodeModal from "./CodeModal";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

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
  const [doubtCount, setDoubtCount] = useState(0);
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set());
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string>("");
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      // Reset study session
      setCurrentIndex(0);
      setShowAnswer(false);
      setCorrectCount(0);
      setIncorrectCount(0);
      setDoubtCount(0);
      setStudiedCards(new Set());
      console.log('StudyMode iniciado con', flashcards.length, 'flashcards');
      flashcards.forEach((card, index) => {
        console.log(`Flashcard ${index + 1}:`, card.question || card.front);
      });
    }
  }, [isOpen, flashcards]);

  const currentCard = flashcards[currentIndex];
  const isLastCard = currentIndex === flashcards.length - 1;
  const progress = ((correctCount + incorrectCount + doubtCount) / flashcards.length) * 100;

  const handleAnswer = (answer: boolean | null | string[]) => {
    console.log('StudyMode - handleAnswer llamado con:', answer);
    console.log('currentIndex antes:', currentIndex);
    console.log('currentCard:', currentCard);
    
    if (!currentCard) {
      console.log('No hay currentCard, saliendo');
      return;
    }
    
    // Determinar si es correcto basado en el tipo de respuesta
    let isCorrect: boolean | null = null;
    
    if (currentCard?.type === 'multiple_choice' && Array.isArray(answer)) {
      // Para múltiple choice, verificar si las respuestas coinciden
      const correctAnswers = currentCard.correct_answers ? JSON.parse(currentCard.correct_answers) : [];
      isCorrect = correctAnswers.length === answer.length && 
                  correctAnswers.every((ans: string) => answer.includes(ans)) &&
                  answer.every((ans: string) => correctAnswers.includes(ans));
    } else {
      // Para flashcards tradicionales
      isCorrect = answer as boolean | null;
    }
    
    // Prevenir procesamiento múltiple
    if (studiedCards.has(currentIndex)) {
      console.log('Esta tarjeta ya fue procesada, ignorando...');
      return;
    }

    if (isCorrect === true) {
      setCorrectCount(prev => prev + 1);
    } else if (isCorrect === false) {
      setIncorrectCount(prev => prev + 1);
    } else if (isCorrect === null) {
      setDoubtCount(prev => prev + 1);
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
      // Solo avance automático para flashcards tradicionales (incluyendo dudas)
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
    setDoubtCount(0);
    setStudiedCards(new Set());
  };

  const openImageModal = (imageUrl: string, imageName: string) => {
    setSelectedImage(imageUrl);
    setSelectedImageName(imageName);
    setShowImageModal(true);
  };

  const openCodeModal = (code: string, language: string) => {
    setSelectedCode(code);
    setSelectedLanguage(language);
    setShowCodeModal(true);
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
        
        return <UnifiedCodeBlock 
          code={code} 
          language={language} 
          maxHeight="200px" 
          showCopyButton={true}
          showModalButton={true}
          onOpenModal={openCodeModal}
        />;
      }
      return (
        <code className="bg-gray-700 text-gray-200 px-1 py-0.5 rounded font-mono text-sm">
          {children}
        </code>
      );
    },
    p: ({ children }: any) => (
      <p className="text-white mb-2 whitespace-pre-wrap !text-white text-lg">{children}</p>
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
    
    return <p className="text-white whitespace-pre-wrap !text-white text-lg">{content}</p>;
  };

  const isStudyComplete = correctCount + incorrectCount + doubtCount === flashcards.length;

  if (!isOpen || flashcards.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Header fijo en la parte superior */}
      <div className="fixed top-0 left-0 right-0 bg-slate-800 px-4 py-3 border-b border-slate-700 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-medium text-white">Modo Estudio</h2>
            <span className="text-sm text-slate-400">{title}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-300">
                Progreso: {correctCount + incorrectCount + doubtCount} / {flashcards.length}
              </span>
              <span className="text-green-400">✅ {correctCount}</span>
              <span className="text-red-400">❌ {incorrectCount}</span>
              <span className="text-amber-400">❓ {doubtCount}</span>
            </div>
            <button
              onClick={() => window.location.href = '/editor'}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium px-3 py-1 rounded-lg hover:bg-slate-700"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Volver</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal sin overlay negro */}
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-full h-full flex flex-col justify-center px-4">

          {/* Study Complete Screen */}
          {isStudyComplete ? (
            <div className="p-8 text-center flex-1 flex flex-col justify-center min-h-screen">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-white mb-4">¡Estudio Completado!</h3>
              <div className="space-y-2 mb-6">
                <p className="text-lg text-green-400">✅ Correctas: {correctCount}</p>
                <p className="text-lg text-red-400">❌ Incorrectas: {incorrectCount}</p>
                <p className="text-lg text-amber-400">❓ Dudas: {doubtCount}</p>
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
              <div className="flex-1 flex flex-col justify-center items-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
                

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
                  // Flashcard tradicional con flip - Centrada verticalmente
                  <div className="flex flex-col items-center justify-center w-full">
                    <div className="perspective-1000 w-full max-w-4xl">
                      <div 
                        className={`relative w-full h-96 transition-transform duration-700 transform-style-preserve-3d cursor-pointer ${
                          showAnswer ? 'rotate-y-180' : ''
                        }`}
                        onClick={handleCardTap}
                      >
                        {/* Front Side */}
                        <div className="absolute inset-0 backface-hidden">
                          <div className="bg-slate-700 rounded-lg h-full flex flex-col p-6">
                            <h3 className="font-medium text-white mb-4 text-center flex-shrink-0">Pregunta:</h3>
                            <div 
                              className="overflow-y-auto px-2" 
                              style={{ 
                                height: '280px',
                                scrollBehavior: 'smooth',
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#64748b #334155'
                              }}
                            >
                              <div className="w-full">
                                {currentCard?.front_image_url ? (
                                  <div className="w-full">
                                    <img
                                      src={currentCard.front_image_url}
                                      alt={currentCard.front_image_name || "Imagen pregunta"}
                                      className="max-w-full max-h-40 object-contain mx-auto bg-slate-600 rounded cursor-pointer block"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openImageModal(currentCard.front_image_url!, currentCard.front_image_name || "Imagen pregunta");
                                      }}
                                    />
                                    {currentCard.front && (
                                      <div className="mt-3 text-sm text-left">
                                        {renderContent(currentCard.front)}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-sm w-full text-left">
                                    {renderContent(currentCard?.front || '')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Back Side */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180">
                          <div className="bg-slate-700 rounded-lg h-full flex flex-col p-6">
                            <h3 className="font-medium text-white mb-4 text-center flex-shrink-0">Respuesta:</h3>
                            <div 
                              className="overflow-y-auto px-2" 
                              style={{ 
                                height: '280px',
                                scrollBehavior: 'smooth',
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#64748b #334155'
                              }}
                            >
                              <div className="w-full">
                                {currentCard?.back_image_url ? (
                                  <div className="w-full">
                                    <img
                                      src={currentCard.back_image_url}
                                      alt={currentCard.back_image_name || "Imagen respuesta"}
                                      className="max-w-full max-h-40 object-contain mx-auto bg-slate-600 rounded cursor-pointer block"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openImageModal(currentCard.back_image_url!, currentCard.back_image_name || "Imagen respuesta");
                                      }}
                                    />
                                    {currentCard.back && (
                                      <div className="mt-3 text-sm text-left">
                                        {renderContent(currentCard.back)}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-sm w-full text-left">
                                    {renderContent(currentCard?.back || '')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    
                    {/* Espacio fijo para botones - Siempre presente */}
                    <div className="mt-8 h-16 flex justify-center items-center">
                      {showAnswer && (
                        <div className="flex gap-6">
                          <button
                            onClick={() => handleAnswer(false)}
                            className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 transition-all hover:scale-105 active:scale-95 active:bg-red-800 flex items-center justify-center shadow-lg transform"
                            title="No acerté"
                          >
                            <svg width="20" height="20" viewBox="0 0 40 40" className="text-white">
                              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2"></circle>
                              <line x1="14" y1="14" x2="26" y2="26" stroke="currentColor" strokeWidth="3" strokeLinecap="round"></line>
                              <line x1="26" y1="14" x2="14" y2="26" stroke="currentColor" strokeWidth="3" strokeLinecap="round"></line>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleAnswer(null)}
                            className="w-12 h-12 rounded-full bg-amber-600 hover:bg-amber-700 transition-all hover:scale-105 active:scale-95 active:bg-amber-800 flex items-center justify-center shadow-lg transform"
                            title="Duda"
                          >
                            <svg width="20" height="20" viewBox="0 0 40 40" className="text-white">
                              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2"></circle>
                              <circle cx="13.5" cy="20" r="2.2" fill="currentColor"></circle>
                              <circle cx="20" cy="20" r="2.2" fill="currentColor"></circle>
                              <circle cx="26.5" cy="20" r="2.2" fill="currentColor"></circle>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleAnswer(true)}
                            className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-700 transition-all hover:scale-105 active:scale-95 active:bg-green-800 flex items-center justify-center shadow-lg transform"
                            title="Acerté"
                          >
                            <svg width="20" height="20" viewBox="0 0 40 40" className="text-white">
                              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2"></circle>
                              <polyline points="12,20 18,26 28,16" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"></polyline>
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </>
          )}
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={showImageModal}
        imageUrl={selectedImage || ""}
        imageName={selectedImageName}
        onClose={() => setShowImageModal(false)}
      />

      {/* Code Modal */}
      <CodeModal
        isOpen={showCodeModal}
        code={selectedCode}
        language={selectedLanguage}
        onClose={() => setShowCodeModal(false)}
      />
    </div>
  );
}
