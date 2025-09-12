"use client";

import { useState, useEffect } from "react";
import { Flashcard } from "@/lib/notes/flashcards";
import CodeHighlighter from "./CodeHighlighter";

interface MultipleChoiceStudyCardProps {
  flashcard: Flashcard;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string[]) => void;
  onNext: () => void;
}

export default function MultipleChoiceStudyCard({ flashcard, questionNumber, totalQuestions, onAnswer, onNext }: MultipleChoiceStudyCardProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Parsear opciones y respuestas correctas
  const options = flashcard.options ? JSON.parse(flashcard.options) : [];
  const correctAnswers = flashcard.correct_answers ? JSON.parse(flashcard.correct_answers) : [];
  const isMultipleAnswer = correctAnswers.length > 1;

  // Resetear estado cuando cambia la flashcard
  useEffect(() => {
    setSelectedAnswers([]);
    setShowResults(false);
    setHasAnswered(false);
    setIsProcessing(false);
  }, [flashcard.id, questionNumber]);

  const handleOptionClick = (optionLetter: string) => {
    if (hasAnswered) return;
    
    console.log('handleOptionClick - optionLetter:', optionLetter);
    console.log('handleOptionClick - isMultipleAnswer:', isMultipleAnswer);
    console.log('handleOptionClick - selectedAnswers antes:', selectedAnswers);

    if (isMultipleAnswer) {
      // Múltiples respuestas: toggle selection
      setSelectedAnswers(prev => {
        const newAnswers = prev.includes(optionLetter) 
          ? prev.filter(a => a !== optionLetter)
          : [...prev, optionLetter];
        console.log('handleOptionClick - newAnswers múltiple:', newAnswers);
        return newAnswers;
      });
    } else {
      // Una sola respuesta: solo seleccionar, no enviar automáticamente
      console.log('handleOptionClick - respuesta única:', [optionLetter]);
      setSelectedAnswers([optionLetter]);
    }
  };

  const handleSubmit = (answers: string[] = selectedAnswers) => {
    if (hasAnswered) return;

    setHasAnswered(true);
    setShowResults(true);

    // Solo mostrar el resultado, no registrar la respuesta aún
  };

  const handleNext = () => {
    if (!hasAnswered || isProcessing) return;
    
    console.log('MultipleChoiceStudyCard - handleNext llamado');
    console.log('hasAnswered:', hasAnswered, 'isProcessing:', isProcessing);
    
    // Prevenir múltiples clics
    setIsProcessing(true);
    
    console.log('selectedAnswers:', selectedAnswers);
    console.log('correctAnswers:', correctAnswers);
    
    // Verificar si la respuesta es correcta
    const isCorrect = correctAnswers.length === selectedAnswers.length && 
                     correctAnswers.every((answer: string) => selectedAnswers.includes(answer)) &&
                     selectedAnswers.every((answer: string) => correctAnswers.includes(answer));
    
    console.log('Respuesta es correcta:', isCorrect);
    
    // Registrar la respuesta con las opciones seleccionadas para el modo examen
    onAnswer(selectedAnswers);
    
    // Pequeño delay para mostrar el resultado antes de avanzar
    setTimeout(() => {
      onNext();
      console.log('Avanzando a la siguiente pregunta');
    }, 1500);
  };

  const getOptionStyle = (optionLetter: string) => {
    if (!showResults) {
      // Antes de mostrar resultados
      if (selectedAnswers.includes(optionLetter)) {
        return "bg-blue-600 border-blue-500 text-white";
      }
      return "bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:border-blue-500";
    }

    // Después de mostrar resultados
    const isCorrect = correctAnswers.includes(optionLetter);
    const isSelected = selectedAnswers.includes(optionLetter);

    if (isCorrect && isSelected) {
      return "bg-green-600 border-green-500 text-white"; // Correcta y seleccionada
    } else if (isCorrect && !isSelected) {
      return "bg-yellow-500 border-yellow-400 text-gray-900"; // Correcta pero no seleccionada (faltante)
    } else if (!isCorrect && isSelected) {
      return "bg-red-600 border-red-500 text-white"; // Incorrecta pero seleccionada
    } else {
      return "bg-slate-700 border-slate-600 text-slate-400"; // No seleccionada y no correcta
    }
  };

  const getOptionIcon = (optionLetter: string) => {
    if (!showResults) {
      return selectedAnswers.includes(optionLetter) ? "🔘" : "⚪";
    }

    const isCorrect = correctAnswers.includes(optionLetter);
    const isSelected = selectedAnswers.includes(optionLetter);

    if (isCorrect && isSelected) {
      return "✅"; // Correcta y seleccionada
    } else if (isCorrect && !isSelected) {
      return "💡"; // Correcta pero no seleccionada (faltante)
    } else if (!isCorrect && isSelected) {
      return "❌"; // Incorrecta pero seleccionada
    } else {
      return "⚪"; // No seleccionada y no correcta
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      {/* Contenedor principal - fijo para desktop, responsive para móvil */}
      <div 
        className="relative mx-auto"
        style={{
          width: isMobile ? '100%' : '700px',
          height: isMobile ? 'auto' : '570px',
          padding: isMobile ? '20px' : '0',
          paddingTop: isMobile ? '60px' : '0',
          boxSizing: 'border-box'
        }}
      >
        {/* Question Box - Fijo para desktop, responsive para móvil */}
        <div 
          className="bg-slate-700 border border-slate-600 rounded-2xl shadow-lg scrollbar-hide"
          style={{
            width: isMobile ? '100%' : '700px',
            height: isMobile ? '200px' : '250px',
            padding: isMobile ? '20px' : '25px',
            fontSize: isMobile ? '1.1em' : '1.3em',
            lineHeight: '1.5',
            boxSizing: 'border-box',
            color: '#e2e8f0',
            overflowY: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            position: isMobile ? 'relative' : 'absolute',
            top: isMobile ? 'auto' : '40px',
            left: isMobile ? 'auto' : '0',
            marginBottom: isMobile ? '20px' : '0'
          }}
        >
          <CodeHighlighter text={flashcard.question || flashcard.front} />
        </div>

        {/* Options Grid - Fijo para desktop, responsive para móvil */}
        <div 
          style={{
            position: isMobile ? 'relative' : 'absolute',
            top: isMobile ? 'auto' : '310px',
            left: isMobile ? 'auto' : '0',
            width: isMobile ? '100%' : '700px',
            height: isMobile ? 'auto' : '150px',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '12px' : '15px',
            marginBottom: isMobile ? '20px' : '0'
          }}
        >
          {options.map((option: any) => (
            <div
              key={option.letter}
              className={`rounded-xl border cursor-pointer transition-all duration-200 ${getOptionStyle(option.letter)} ${hasAnswered ? 'cursor-default' : 'hover:bg-slate-600 hover:border-blue-500'}`}
              style={{
                width: isMobile ? '100%' : '342.5px',
                height: isMobile ? '60px' : '70px',
                padding: isMobile ? '0 12px' : '0 15px',
                display: 'flex',
                alignItems: 'center',
                fontSize: isMobile ? '0.9em' : '1em',
                boxSizing: 'border-box'
              }}
              onClick={() => !hasAnswered && handleOptionClick(option.letter)}
            >
              <input
                type={isMultipleAnswer ? "checkbox" : "radio"}
                name={isMultipleAnswer ? `option-${option.letter}` : "respuesta"}
                value={option.letter}
                checked={selectedAnswers.includes(option.letter)}
                onChange={() => {}}
                className="hidden"
                disabled={hasAnswered}
              />
              <span className="flex-1 text-left text-base">
                <span className="inline-block w-6 mr-3 font-semibold text-blue-400">
                  {option.letter}.
                </span>
                <span className="text-slate-200">
                  {option.text}
                </span>
              </span>
              {/* Indicador visual de selección unificado */}
              <span className="ml-2 text-lg">
                {selectedAnswers.includes(option.letter) ? "🔘" : "⚪"}
              </span>
            </div>
          ))}
        </div>

        {/* Submit button - Fijo para desktop, responsive para móvil */}
        {!hasAnswered && (
          <button
            onClick={() => handleSubmit()}
            disabled={selectedAnswers.length === 0}
            className={`rounded-lg font-medium transition-colors ${
              selectedAnswers.length > 0
                ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
            style={{
              position: isMobile ? 'relative' : 'absolute',
              top: isMobile ? 'auto' : '470px',
              left: isMobile ? 'auto' : '0',
              width: isMobile ? '100%' : '700px',
              height: isMobile ? '45px' : '50px',
              fontSize: isMobile ? '0.9em' : '1em',
              marginBottom: isMobile ? '15px' : '0'
            }}
          >
            {selectedAnswers.length === 0 ? 'Selecciona una opción' : 'Confirmar respuesta'}
          </button>
        )}

        {/* Results message - Fijo para desktop, responsive para móvil */}
        {showResults && (
          <>
            <div 
              className="rounded-lg text-center bg-gray-800/50"
              style={{
                position: isMobile ? 'relative' : 'absolute',
                top: isMobile ? 'auto' : '470px',
                left: isMobile ? 'auto' : '0',
                width: isMobile ? '100%' : '700px',
                height: isMobile ? 'auto' : '40px',
                padding: isMobile ? '12px' : '10px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: isMobile ? '15px' : '0'
              }}
            >
              {correctAnswers.length === selectedAnswers.length && 
               correctAnswers.every((answer: string) => selectedAnswers.includes(answer)) &&
               selectedAnswers.every((answer: string) => correctAnswers.includes(answer)) ? (
                <div className="text-green-400 font-medium" style={{ fontSize: isMobile ? '0.9em' : '1em' }}>
                  ¡Correcto! 🎉
                </div>
              ) : (
                <div className="text-red-400 font-medium" style={{ fontSize: isMobile ? '0.9em' : '1em' }}>
                  Incorrecto. La respuesta correcta es: {correctAnswers.join(', ')}
                </div>
              )}
            </div>
            
            <button
              onClick={handleNext}
              disabled={isProcessing}
              className={`text-white rounded-lg font-medium transition-colors shadow-lg ${
                isProcessing 
                  ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
              style={{
                position: isMobile ? 'relative' : 'absolute',
                top: isMobile ? 'auto' : '530px',
                left: isMobile ? 'auto' : '0',
                width: isMobile ? '100%' : '700px',
                height: isMobile ? '45px' : '50px',
                fontSize: isMobile ? '0.9em' : '1em'
              }}
            >
              {isProcessing ? 'Procesando...' : 'Siguiente →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
