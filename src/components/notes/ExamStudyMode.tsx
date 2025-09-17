"use client";

import { useState, useEffect } from "react";
import { ExamFlashcard, ExamResult, calculateExamResult, checkAnswer } from "@/lib/notes/examUtils";
import ExamTimer from "./ExamTimer";
import MultipleChoiceStudyCard from "./MultipleChoiceStudyCard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import MermaidRenderer from "./MermaidRenderer";
import ImageModal from "./ImageModal";
import CodeHighlighter from "./CodeHighlighter";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

interface ExamStudyModeProps {
  flashcards: ExamFlashcard[];
  timeMinutes: number;
  isOpen: boolean;
  onClose: () => void;
  onExamComplete: (result: ExamResult) => void;
  title: string;
}

export default function ExamStudyMode({ 
  flashcards, 
  timeMinutes, 
  isOpen, 
  onClose, 
  onExamComplete,
  title 
}: ExamStudyModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [examFlashcards, setExamFlashcards] = useState<ExamFlashcard[]>(flashcards);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState("");
  const [modalImageName, setModalImageName] = useState("");
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setShowAnswer(false);
      setIsTimerRunning(true);
      setExamFlashcards(flashcards);
    }
  }, [isOpen, flashcards]);

  const currentCard = examFlashcards[currentIndex];
  const isLastCard = currentIndex === examFlashcards.length - 1;
  const progress = examFlashcards.length > 0 ? ((currentIndex + 1) / examFlashcards.length) * 100 : 0;

  console.log('ExamStudyMode render check:', { isOpen, currentCard: !!currentCard, examFlashcardsLength: examFlashcards.length });
  
  if (!isOpen) {
    console.log('ExamStudyMode not open, returning null');
    return null;
  }
  
  if (examFlashcards.length === 0) {
    console.log('No exam flashcards, returning null');
    return null;
  }
  
  if (!currentCard) {
    console.log('No current card, returning null');
    return null;
  }

  const handleTimeUp = () => {
    setIsTimerRunning(false);
    finishExam();
  };

  const finishExam = () => {
    const timeUsed = Math.floor((Date.now() - startTime) / 1000);
    const result = calculateExamResult(examFlashcards, timeUsed, timeMinutes * 60);
    onExamComplete(result);
  };

  const handleAnswer = (answer: string | string[]) => {
    const updatedCards = [...examFlashcards];
    const card = updatedCards[currentIndex];
    
    console.log('ExamStudyMode - handleAnswer called:', {
      cardIndex: currentIndex,
      cardId: card.id,
      cardType: card.type,
      answer,
      correctAnswers: card.correct_answers
    });
    
    card.userAnswer = answer;
    card.isCorrect = checkAnswer(card, answer);
    card.timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    console.log('ExamStudyMode - Answer processed:', {
      userAnswer: card.userAnswer,
      isCorrect: card.isCorrect,
      timeSpent: card.timeSpent
    });
    
    setExamFlashcards(updatedCards);
  };

  const handleNext = () => {
    if (isLastCard) {
      finishExam();
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

  const handleCardTap = () => {
    if (currentCard?.type === 'multiple_choice') return;
    setShowAnswer(!showAnswer);
  };

  const handleImageClick = (imageUrl: string, imageName: string) => {
    setModalImageUrl(imageUrl);
    setModalImageName(imageName);
    setImageModalOpen(true);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-base font-medium text-white">Modo Examen</h2>
              <span className="text-sm text-gray-400">{title}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 whitespace-nowrap">
            <ExamTimer
              initialTimeSeconds={timeMinutes * 60}
              isRunning={isTimerRunning}
              onTimeUp={() => {
                setIsTimerRunning(false);
                const result = calculateExamResult(examFlashcards, startTime, timeMinutes * 60);
                onExamComplete(result);
              }}
              compact={true}
            />
            
            <div className="text-sm text-gray-400">
              {currentIndex + 1} / {examFlashcards.length}
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

      <div className="flex-1 flex flex-col overflow-hidden">
        {currentCard?.type === 'multiple_choice' ? (
          <div className="flex-1">
            <MultipleChoiceStudyCard
              flashcard={currentCard}
              questionNumber={currentIndex + 1}
              totalQuestions={examFlashcards.length}
              onAnswer={(selectedAnswers) => {
                handleAnswer(selectedAnswers);
              }}
              onNext={handleNext}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center w-full" style={{ minHeight: 'calc(100vh - 80px)' }}>
            <div className="perspective-1000 w-full max-w-4xl">
              <div 
                className={`relative w-full h-96 transition-transform duration-700 transform-style-preserve-3d cursor-pointer ${
                  showAnswer ? 'rotate-y-180' : ''
                }`}
                onClick={handleCardTap}
              >
                <div className="absolute inset-0 backface-hidden">
                  <div className="bg-slate-700 rounded-lg h-full flex flex-col p-6">
                    <h3 className="font-medium text-white mb-4 text-center flex-shrink-0">Pregunta:</h3>
                    <div className="flex-1 overflow-y-auto scrollbar-hide px-2">
                      <div className="w-full">
                        {currentCard?.front_image_url ? (
                          <div className="w-full">
                            <img
                              src={currentCard.front_image_url}
                              alt={currentCard.front_image_name || "Imagen pregunta"}
                              className="max-w-full max-h-40 object-contain mx-auto bg-slate-600 rounded cursor-pointer block"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleImageClick(currentCard.front_image_url!, currentCard.front_image_name || "Imagen pregunta");
                              }}
                            />
                            {currentCard.front && (
                              <div className="mt-3 text-sm text-left">
                                <CodeHighlighter text={currentCard.front} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm w-full text-left">
                            <CodeHighlighter text={currentCard?.front || ''} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute inset-0 backface-hidden rotate-y-180">
                  <div className="bg-slate-700 rounded-lg h-full flex flex-col p-6">
                    <h3 className="font-medium text-white mb-4 text-center flex-shrink-0">Respuesta:</h3>
                    <div className="flex-1 overflow-y-auto scrollbar-hide px-2 pt-8">
                      <div className="w-full">
                        {currentCard?.back_image_url ? (
                          <div className="w-full">
                            <img
                              src={currentCard.back_image_url}
                              alt={currentCard.back_image_name || "Imagen respuesta"}
                              className="max-w-full max-h-40 object-contain mx-auto bg-slate-600 rounded cursor-pointer block"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleImageClick(currentCard.back_image_url!, currentCard.back_image_name || "Imagen respuesta");
                              }}
                            />
                            {currentCard.back && (
                              <div className="mt-3 text-sm text-left">
                                <CodeHighlighter text={currentCard.back} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm w-full text-left">
                            <CodeHighlighter text={currentCard?.back || ''} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 h-16 flex justify-center items-center">
              {showAnswer && (
                <div className="flex gap-6">
                  <button
                    onClick={() => {
                      handleAnswer('incorrect');
                      setTimeout(handleNext, 500);
                    }}
                    className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 transition-all hover:scale-105 flex items-center justify-center shadow-lg"
                    title="No acerté"
                  >
                    <svg width="20" height="20" viewBox="0 0 40 40" className="text-white">
                      <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2"></circle>
                      <line x1="14" y1="14" x2="26" y2="26" stroke="currentColor" strokeWidth="3" strokeLinecap="round"></line>
                      <line x1="26" y1="14" x2="14" y2="26" stroke="currentColor" strokeWidth="3" strokeLinecap="round"></line>
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      handleAnswer('correct');
                      setTimeout(handleNext, 500);
                    }}
                    className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-700 transition-all hover:scale-105 flex items-center justify-center shadow-lg"
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

      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={modalImageUrl}
        imageName={modalImageName}
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  );
}
