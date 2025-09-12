"use client";

import { ExamResult, formatTime } from "@/lib/notes/examUtils";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import MermaidRenderer from "./MermaidRenderer";
import CodeHighlighter from "./CodeHighlighter";

interface ExamResultsModalProps {
  isOpen: boolean;
  result: ExamResult;
  onClose: () => void;
  onRetry: () => void;
}

export default function ExamResultsModal({ isOpen, result, onClose, onRetry }: ExamResultsModalProps) {
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showReview, setShowReview] = useState(false);

  if (!isOpen) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '🏆';
    if (score >= 80) return '🎉';
    if (score >= 70) return '👍';
    if (score >= 60) return '😐';
    return '😞';
  };

  const currentReviewCard = result.flashcards[currentReviewIndex];

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800/95 backdrop-blur-md rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-600/50 shadow-2xl">
        {!showReview ? (
          // Results Summary
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-600/50">
              <div>
                <h2 className="text-2xl font-bold text-white">Resultados del Examen</h2>
                <p className="text-gray-400">Tu desempeño en esta sesión</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            {/* Score */}
            <div className="p-6 text-center border-b border-slate-600/50">
              <div className="text-6xl mb-2">{getScoreEmoji(result.score)}</div>
              <div className={`text-4xl font-bold mb-2 ${getScoreColor(result.score)}`}>
                {result.score}%
              </div>
              <div className="text-gray-400">
                {result.correctAnswers} de {result.totalQuestions} correctas
              </div>
            </div>

            {/* Stats */}
            <div className="p-6 border-b border-slate-600/50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-2xl text-green-400 font-bold">{result.correctAnswers}</div>
                  <div className="text-sm text-gray-400">Correctas</div>
                </div>
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-2xl text-red-400 font-bold">{result.incorrectAnswers}</div>
                  <div className="text-sm text-gray-400">Incorrectas</div>
                </div>
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-2xl text-yellow-400 font-bold">{result.unansweredQuestions}</div>
                  <div className="text-sm text-gray-400">Sin responder</div>
                </div>
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-2xl text-blue-400 font-bold">{formatTime(result.timeUsed)}</div>
                  <div className="text-sm text-gray-400">Tiempo usado</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReview(true)}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  📋 Revisar Respuestas
                </button>
                <button
                  onClick={onRetry}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                >
                  🔄 Intentar de Nuevo
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg transition-colors border border-slate-600/50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </>
        ) : (
          // Review Mode
          <>
            {/* Review Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-600/50">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowReview(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ← Volver
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-white">Revisión de Respuestas</h2>
                  <p className="text-sm text-gray-400">
                    Pregunta {currentReviewIndex + 1} de {result.flashcards.length}
                  </p>
                </div>
              </div>
              
              {/* Status indicator */}
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentReviewCard.userAnswer === undefined ? 'bg-yellow-600 text-white' :
                currentReviewCard.isCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
              }`}>
                {currentReviewCard.userAnswer === undefined ? 'Sin responder' :
                 currentReviewCard.isCorrect ? 'Correcta' : 'Incorrecta'}
              </div>
            </div>

            {/* Review Content */}
            <div className="flex-1 overflow-y-auto p-6 max-h-[60vh]">
              {currentReviewCard.type === 'multiple_choice' ? (
                // Multiple Choice Review
                <div className="space-y-4">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h3 className="text-white font-medium mb-3">Pregunta:</h3>
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                        {currentReviewCard.question || currentReviewCard.front}
                      </ReactMarkdown>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-white font-medium">Opciones:</h3>
                    {currentReviewCard.options && JSON.parse(currentReviewCard.options).map((option: any, index: number) => {
                      const optionLetter = option.letter;
                      const correctAnswers = currentReviewCard.correct_answers ? JSON.parse(currentReviewCard.correct_answers) : [];
                      const userAnswers = Array.isArray(currentReviewCard.userAnswer) ? currentReviewCard.userAnswer : [];
                      
                      const isCorrect = correctAnswers.includes(optionLetter);
                      const isSelected = userAnswers.includes(optionLetter);
                      
                      let bgColor = 'bg-gray-800';
                      let textColor = 'text-gray-300';
                      let icon = '⚪';
                      
                      if (isCorrect && isSelected) {
                        bgColor = 'bg-green-600';
                        textColor = 'text-white';
                        icon = '✅';
                      } else if (isCorrect && !isSelected) {
                        bgColor = 'bg-yellow-500';
                        textColor = 'text-gray-900';
                        icon = '💡';
                      } else if (!isCorrect && isSelected) {
                        bgColor = 'bg-red-600';
                        textColor = 'text-white';
                        icon = '❌';
                      }
                      
                      return (
                        <div key={optionLetter} className={`p-3 rounded-lg border ${bgColor} ${textColor}`}>
                          <div className="flex items-start gap-3">
                            <span className="text-lg">{icon}</span>
                            <div className="flex-1">
                              <span className="font-medium">{optionLetter})</span> {option.text}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // Traditional Flashcard Review
                <div className="space-y-4">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h3 className="text-white font-medium mb-3">Pregunta:</h3>
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          code: ({ className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const language = match ? match[1] : '';
                            
                            if (language === 'mermaid') {
                              return <MermaidRenderer chart={String(children)} />;
                            }
                            
                            return (
                              <CodeHighlighter text={String(children).replace(/\n$/, '')} />
                            );
                          },
                        }}
                      >
                        {currentReviewCard.front}
                      </ReactMarkdown>
                    </div>
                    {currentReviewCard.front_image_url && (
                      <img 
                        src={currentReviewCard.front_image_url} 
                        alt="Imagen de pregunta"
                        className="mt-3 max-w-full h-auto rounded"
                      />
                    )}
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h3 className="text-white font-medium mb-3">Respuesta Correcta:</h3>
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          code: ({ className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const language = match ? match[1] : '';
                            
                            if (language === 'mermaid') {
                              return <MermaidRenderer chart={String(children)} />;
                            }
                            
                            return (
                              <CodeHighlighter text={String(children).replace(/\n$/, '')} />
                            );
                          },
                        }}
                      >
                        {currentReviewCard.back}
                      </ReactMarkdown>
                    </div>
                    {currentReviewCard.back_image_url && (
                      <img 
                        src={currentReviewCard.back_image_url} 
                        alt="Imagen de respuesta"
                        className="mt-3 max-w-full h-auto rounded"
                      />
                    )}
                  </div>

                  <div className={`p-3 rounded-lg ${
                    currentReviewCard.userAnswer === undefined ? 'bg-yellow-600' :
                    currentReviewCard.isCorrect ? 'bg-green-600' : 'bg-red-600'
                  }`}>
                    <div className="text-white font-medium">
                      Tu respuesta: {
                        currentReviewCard.userAnswer === undefined ? 'Sin responder' :
                        currentReviewCard.userAnswer === 'correct' ? 'Sí sabía' : 'No sabía'
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Review Navigation */}
            <div className="flex items-center justify-between p-4 border-t border-slate-600/50 bg-slate-800/50">
              <button
                onClick={() => setCurrentReviewIndex(Math.max(0, currentReviewIndex - 1))}
                disabled={currentReviewIndex === 0}
                className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 disabled:bg-slate-800/50 disabled:text-gray-500 text-white rounded-lg transition-colors border border-slate-600/50"
              >
                ← Anterior
              </button>
              
              <span className="text-gray-400">
                {currentReviewIndex + 1} de {result.flashcards.length}
              </span>
              
              <button
                onClick={() => setCurrentReviewIndex(Math.min(result.flashcards.length - 1, currentReviewIndex + 1))}
                disabled={currentReviewIndex === result.flashcards.length - 1}
                className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 disabled:bg-slate-800/50 disabled:text-gray-500 text-white rounded-lg transition-colors border border-slate-600/50"
              >
                Siguiente →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
