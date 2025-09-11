"use client";

import { useState, useEffect } from "react";
import { MultipleChoiceQuestion } from "@/lib/notes/multipleChoiceParser";

interface MultipleChoiceCardProps {
  question: MultipleChoiceQuestion;
  onAnswer: (selectedAnswers: string[], isCorrect: boolean) => void;
  showResult?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function MultipleChoiceCard({ 
  question, 
  onAnswer, 
  showResult = false, 
  disabled = false,
  className = ""
}: MultipleChoiceCardProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswers([]);
    setHasAnswered(false);
    setShowCorrectAnswer(false);
  }, [question.id]);

  const isMultipleAnswer = question.correctAnswers.length > 1;

  const handleOptionClick = (letter: string) => {
    if (disabled || hasAnswered) return;

    if (isMultipleAnswer) {
      // Multiple selection mode
      setSelectedAnswers(prev => {
        if (prev.includes(letter)) {
          return prev.filter(l => l !== letter);
        } else {
          return [...prev, letter];
        }
      });
    } else {
      // Single selection mode
      setSelectedAnswers([letter]);
    }
  };

  const handleSubmit = () => {
    if (selectedAnswers.length === 0 || hasAnswered) return;

    const isCorrect = 
      selectedAnswers.length === question.correctAnswers.length &&
      selectedAnswers.every(answer => question.correctAnswers.includes(answer));

    setHasAnswered(true);
    setShowCorrectAnswer(true);
    onAnswer(selectedAnswers, isCorrect);
  };

  const getOptionClassName = (letter: string) => {
    const baseClasses = "w-full text-left p-3 rounded-lg border transition-all duration-200 flex items-center gap-3";
    
    if (!hasAnswered && !disabled) {
      // Before answering
      if (selectedAnswers.includes(letter)) {
        return `${baseClasses} bg-blue-600 border-blue-500 text-white hover:bg-blue-700`;
      } else {
        return `${baseClasses} bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700 hover:border-gray-500`;
      }
    } else {
      // After answering or disabled
      const isCorrect = question.correctAnswers.includes(letter);
      const wasSelected = selectedAnswers.includes(letter);

      if (isCorrect && wasSelected) {
        // Correct and selected
        return `${baseClasses} bg-green-600 border-green-500 text-white`;
      } else if (isCorrect && !wasSelected) {
        // Correct but not selected
        return `${baseClasses} bg-green-800 border-green-600 text-green-200`;
      } else if (!isCorrect && wasSelected) {
        // Incorrect but selected
        return `${baseClasses} bg-red-600 border-red-500 text-white`;
      } else {
        // Not correct and not selected
        return `${baseClasses} bg-gray-800 border-gray-600 text-gray-400`;
      }
    }
  };

  const getOptionIcon = (letter: string) => {
    if (!hasAnswered && !disabled) {
      if (isMultipleAnswer) {
        return selectedAnswers.includes(letter) ? "☑️" : "☐";
      } else {
        return selectedAnswers.includes(letter) ? "🔘" : "⚪";
      }
    } else {
      const isCorrect = question.correctAnswers.includes(letter);
      const wasSelected = selectedAnswers.includes(letter);

      if (isCorrect && wasSelected) {
        return "✅";
      } else if (isCorrect && !wasSelected) {
        return "✅";
      } else if (!isCorrect && wasSelected) {
        return "❌";
      } else {
        return isMultipleAnswer ? "☐" : "⚪";
      }
    }
  };

  const canSubmit = selectedAnswers.length > 0 && !hasAnswered && !disabled;

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Question Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-blue-400">
            Pregunta {question.questionNumber}
          </span>
          {isMultipleAnswer && (
            <span className="text-xs bg-amber-600 text-white px-2 py-1 rounded">
              Múltiple respuesta
            </span>
          )}
        </div>
        <h3 className="text-lg font-medium text-white leading-relaxed">
          {question.question}
        </h3>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {question.options.map((option) => (
          <button
            key={option.letter}
            onClick={() => handleOptionClick(option.letter)}
            disabled={disabled || hasAnswered}
            className={getOptionClassName(option.letter)}
          >
            <span className="text-lg min-w-[24px]">
              {getOptionIcon(option.letter)}
            </span>
            <span className="flex-1 text-left">
              <span className="font-medium mr-2">{option.letter})</span>
              {option.text}
            </span>
          </button>
        ))}
      </div>

      {/* Submit Button */}
      {!hasAnswered && (
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              canSubmit
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
          >
            {selectedAnswers.length === 0 
              ? "Selecciona una opción" 
              : `Confirmar respuesta${selectedAnswers.length > 1 ? 's' : ''}`
            }
          </button>
        </div>
      )}

      {/* Result */}
      {hasAnswered && showCorrectAnswer && (
        <div className="mt-6 p-4 rounded-lg border-l-4">
          {selectedAnswers.length === question.correctAnswers.length &&
           selectedAnswers.every(answer => question.correctAnswers.includes(answer)) ? (
            <div className="border-green-500 bg-green-900/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🎉</span>
                <span className="font-medium text-green-400">¡Correcto!</span>
              </div>
              <p className="text-green-200 text-sm">
                Respuesta{question.correctAnswers.length > 1 ? 's' : ''} correcta{question.correctAnswers.length > 1 ? 's' : ''}: {question.correctAnswers.join(', ')}
              </p>
            </div>
          ) : (
            <div className="border-red-500 bg-red-900/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">❌</span>
                <span className="font-medium text-red-400">Incorrecto</span>
              </div>
              <p className="text-red-200 text-sm">
                Respuesta{question.correctAnswers.length > 1 ? 's' : ''} correcta{question.correctAnswers.length > 1 ? 's' : ''}: {question.correctAnswers.join(', ')}
              </p>
              <p className="text-red-300 text-sm mt-1">
                Tu respuesta: {selectedAnswers.join(', ') || 'Ninguna'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!hasAnswered && !disabled && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            {isMultipleAnswer 
              ? "Puedes seleccionar múltiples opciones" 
              : "Selecciona una opción"
            }
          </p>
        </div>
      )}
    </div>
  );
}
