"use client";

import { useState, useEffect } from "react";
import { Flashcard } from "@/lib/notes/flashcards";
import CodeHighlighter from "./CodeHighlighter";

interface MultipleChoiceStudyCardProps {
  flashcard: Flashcard;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
}

export default function MultipleChoiceStudyCard({
  flashcard,
  questionNumber,
  totalQuestions,
  onAnswer,
  onNext
}: MultipleChoiceStudyCardProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);

  // Parsear opciones y respuestas correctas
  const options = flashcard.options ? JSON.parse(flashcard.options) : [];
  const correctAnswers = flashcard.correct_answers ? JSON.parse(flashcard.correct_answers) : [];
  const isMultipleAnswer = correctAnswers.length > 1;

  // Resetear estado cuando cambia la flashcard
  useEffect(() => {
    setSelectedAnswers([]);
    setShowResults(false);
    setHasAnswered(false);
  }, [flashcard.id, questionNumber]);

  const handleOptionClick = (optionLetter: string) => {
    if (hasAnswered) return;

    if (isMultipleAnswer) {
      // Múltiples respuestas: toggle selection
      setSelectedAnswers(prev => 
        prev.includes(optionLetter) 
          ? prev.filter(a => a !== optionLetter)
          : [...prev, optionLetter]
      );
    } else {
      // Una sola respuesta: solo seleccionar, no enviar automáticamente
      setSelectedAnswers([optionLetter]);
    }
  };

  const handleSubmit = (answers: string[] = selectedAnswers) => {
    if (hasAnswered) return;

    setHasAnswered(true);
    setShowResults(true);

    // Verificar si la respuesta es correcta
    const isCorrect = correctAnswers.length === answers.length && 
                     correctAnswers.every((answer: string) => answers.includes(answer));

    // NO llamar onAnswer aquí - solo mostrar el resultado
    // onAnswer se llamará cuando el usuario haga clic en "Siguiente"
  };

  const handleNext = () => {
    // Verificar si la respuesta es correcta
    const isCorrect = correctAnswers.length === selectedAnswers.length && 
                     correctAnswers.every((answer: string) => selectedAnswers.includes(answer));
    
    // Registrar la respuesta al avanzar
    onAnswer(isCorrect);
    onNext();
  };

  const getOptionStyle = (optionLetter: string) => {
    if (!showResults) {
      // Antes de mostrar resultados
      if (selectedAnswers.includes(optionLetter)) {
        return "bg-blue-600 border-blue-500 text-white";
      }
      return "bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700 hover:border-gray-500";
    }

    // Después de mostrar resultados
    const isCorrect = correctAnswers.includes(optionLetter);
    const isSelected = selectedAnswers.includes(optionLetter);

    if (isCorrect && isSelected) {
      return "bg-green-600 border-green-500 text-white"; // Correcta y seleccionada
    } else if (isCorrect && !isSelected) {
      return "bg-green-600 border-green-500 text-white"; // Correcta pero no seleccionada
    } else if (!isCorrect && isSelected) {
      return "bg-red-600 border-red-500 text-white"; // Incorrecta pero seleccionada
    } else {
      return "bg-gray-800 border-gray-600 text-gray-400"; // No seleccionada y no correcta
    }
  };

  const getOptionIcon = (optionLetter: string) => {
    if (!showResults) {
      return selectedAnswers.includes(optionLetter) ? "🔘" : "⚪";
    }

    const isCorrect = correctAnswers.includes(optionLetter);
    const isSelected = selectedAnswers.includes(optionLetter);

    if (isCorrect) {
      return "✅"; // Respuesta correcta
    } else if (isSelected) {
      return "❌"; // Respuesta incorrecta seleccionada
    } else {
      return "⚪"; // No seleccionada
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-6 justify-center">
      <div className="bg-gray-900 rounded-lg p-4 sm:p-6 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs sm:text-sm font-medium text-blue-400">
              Pregunta {questionNumber} de {totalQuestions}
            </span>
          </div>
          <div className="text-base sm:text-lg font-medium text-white leading-relaxed">
            <CodeHighlighter text={flashcard.question || flashcard.front} />
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
          {options.map((option: any) => (
            <button
              key={option.letter}
              onClick={() => handleOptionClick(option.letter)}
              disabled={hasAnswered}
              className={`w-full text-left p-3 sm:p-4 rounded-lg border transition-all duration-200 flex items-start gap-3 ${getOptionStyle(option.letter)} ${hasAnswered ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}`}
            >
              <span className="text-base sm:text-lg min-w-[20px] sm:min-w-[24px] mt-0.5">
                {getOptionIcon(option.letter)}
              </span>
              <span className="flex-1 text-left whitespace-pre-line text-sm sm:text-base">
                <span className="font-medium mr-2">{option.letter})</span>
                {option.text}
              </span>
            </button>
          ))}
        </div>

        {/* Submit button - siempre visible cuando no se ha respondido */}
        {!hasAnswered && (
          <div className="mb-4 sm:mb-6">
            <button
              onClick={() => handleSubmit()}
              disabled={selectedAnswers.length === 0}
              className={`w-full py-3 sm:py-4 px-4 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                selectedAnswers.length > 0
                  ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {selectedAnswers.length === 0 ? 'Selecciona una opción' : 'Confirmar respuesta'}
            </button>
          </div>
        )}

        {/* Results message */}
        {showResults && (
          <div className="mt-4 space-y-3">
            <div className="p-3 sm:p-4 rounded-lg text-center bg-gray-800/50">
              {correctAnswers.length === selectedAnswers.length && 
               correctAnswers.every((answer: string) => selectedAnswers.includes(answer)) ? (
                <div className="text-green-400 font-medium text-sm sm:text-base">
                  ¡Correcto! 🎉
                </div>
              ) : (
                <div className="text-red-400 font-medium text-sm sm:text-base">
                  Incorrecto. La respuesta correcta es: {correctAnswers.join(', ')}
                </div>
              )}
            </div>
            
            {/* Botón Siguiente */}
            <button
              onClick={handleNext}
              className="w-full py-3 sm:py-4 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-medium transition-colors shadow-lg text-sm sm:text-base"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
