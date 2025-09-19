"use client";

import { useState, useEffect } from "react";
import { Flashcard } from "@/lib/notes/flashcards";
import UnifiedCodeBlock from "./UnifiedCodeBlock";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import MermaidRenderer from "./MermaidRenderer";
import CodeModal from "./CodeModal";

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
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Parsear opciones y respuestas correctas
  const options = flashcard.options ? JSON.parse(flashcard.options) : [];
  const correctAnswers = flashcard.correct_answers ? JSON.parse(flashcard.correct_answers) : [];
  const isMultipleAnswer = correctAnswers.length > 1;

  const openCodeModal = (code: string, language: string) => {
    setSelectedCode(code);
    setSelectedLanguage(language);
    setShowCodeModal(true);
  };

  // Resetear estado cuando cambia la flashcard
  useEffect(() => {
    setSelectedAnswers([]);
    setHasAnswered(false);
    setIsCorrect(null);
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

    console.log('handleSubmit llamado con respuestas:', answers);
    console.log('Respuestas seleccionadas:', selectedAnswers);
    console.log('Respuestas correctas:', correctAnswers);

    setHasAnswered(true);

    // Mostrar colores inmediatamente después de confirmar
    console.log('Colores aplicados - hasAnswered:', true);

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
    if (!hasAnswered) {
      // Antes de responder
      if (selectedAnswers.includes(optionLetter)) {
        return "bg-blue-900/50 border-blue-500 text-white";
      } else {
        return "bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500";
      }
    }

    // Después de responder
    if (correctAnswers.includes(optionLetter)) {
      return "bg-green-900/50 border-green-500 text-white";
    } else if (selectedAnswers.includes(optionLetter)) {
      return "bg-red-900/50 border-red-500 text-white";
    } else {
      return "bg-slate-800 border-slate-600 text-slate-400";
    }
  };

  const getOptionIcon = (optionLetter: string) => {
    if (!hasAnswered) {
      return selectedAnswers.includes(optionLetter) ? "🔘" : "⚪";
    }

    if (correctAnswers.includes(optionLetter)) {
      return "✅";
    } else if (selectedAnswers.includes(optionLetter)) {
      return "❌";
    } else {
      return "⚪";
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#0B132B] to-[#1C2541] text-gray-200">
      {/* Contenedor principal - fijo para desktop, responsive para móvil */}
      <div 
        className="relative mx-auto"
        style={{
          width: isMobile ? '100%' : '700px',
          height: isMobile ? 'auto' : '670px', // Aumentado de 570px a 670px (100px más)
          padding: isMobile ? '20px' : '0',
          paddingTop: isMobile ? '60px' : '0',
          boxSizing: 'border-box'
        }}
      >
        {/* Question Box - Fijo para desktop, responsive para móvil */}
        <div 
          className="bg-[#1C2541]/80 border border-gray-700 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-sm scrollbar-hide"
          style={{
            width: isMobile ? '100%' : '700px',
            height: isMobile ? '300px' : '350px', // Aumentado de 200px/250px a 300px/350px (100px más)
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
            marginBottom: isMobile ? '20px' : '0',
            scrollBehavior: 'smooth'
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
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
                    maxHeight="250px" // Aumentado de 150px a 250px (100px más)
                    showCopyButton={true}
                    showModalButton={true}
                    onOpenModal={openCodeModal}
                    isMultipleChoice={true} // Indica que estamos en una pregunta de múltiple choice
                  />;
                }
                return (
                  <code className="bg-gray-700 text-gray-200 px-1 py-0.5 rounded font-mono text-sm">
                    {children}
                  </code>
                );
              },
              p: ({ children }: any) => (
                <p className="text-white mb-2 whitespace-pre-wrap !text-white">{children}</p>
              ),
              h1: ({ children }: any) => (
                <h1 className="text-lg font-bold text-white mb-2">{children}</h1>
              ),
              h2: ({ children }: any) => (
                <h2 className="text-base font-semibold text-white mb-2">{children}</h2>
              ),
              h3: ({ children }: any) => (
                <h3 className="text-sm font-medium text-white mb-1">{children}</h3>
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
              strong: ({ children }: any) => (
                <strong className="font-bold text-white">{children}</strong>
              ),
              em: ({ children }: any) => (
                <em className="italic text-white">{children}</em>
              )
            }}
          >
            {flashcard.question || flashcard.front}
          </ReactMarkdown>
        </div>

        {/* Options Grid - Fijo para desktop, responsive para móvil */}
        <div 
          style={{
            position: isMobile ? 'relative' : 'absolute',
            top: isMobile ? 'auto' : '410px', // Ajustado de 310px a 410px (100px más)
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
              className={`rounded-lg border-2 cursor-pointer transition-all duration-200 ${getOptionStyle(option.letter)} ${hasAnswered ? 'cursor-default' : ''}`}
              style={{
                width: isMobile ? '100%' : '342.5px',
                minHeight: isMobile ? '60px' : '70px',
                padding: isMobile ? '12px' : '15px',
                display: 'flex',
                alignItems: 'flex-start',
                fontSize: isMobile ? '0.9em' : '1em',
                boxSizing: 'border-box'
              }}
              onClick={() => !hasAnswered && handleOptionClick(option.letter)}
            >
              <div className="flex-1 text-left overflow-hidden">
                <span className="font-bold text-blue-400 mr-2">
                  {option.letter}.
                </span>
                <span 
                  className="font-medium break-words"
                  style={{
                    fontSize: option.text.length > 50 ? '0.8em' : 
                             option.text.length > 30 ? '0.9em' : '1em',
                    lineHeight: '1.3'
                  }}
                >
                  {option.text}
                </span>
                {hasAnswered && correctAnswers.includes(option.letter) && (
                  <span className="block mt-1 font-bold text-green-400 text-sm">✓ Correcto</span>
                )}
                {hasAnswered && !correctAnswers.includes(option.letter) && selectedAnswers.includes(option.letter) && (
                  <span className="block mt-1 font-bold text-red-400 text-sm">✗ Incorrecto</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Submit button - Fijo para desktop, responsive para móvil */}
        {!hasAnswered && (
          <button
            onClick={() => handleSubmit()}
            disabled={selectedAnswers.length === 0}
            className={`rounded-lg font-bold transition-colors duration-300 shadow-lg ${
              selectedAnswers.length > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
            style={{
              position: isMobile ? 'relative' : 'absolute',
              top: isMobile ? 'auto' : '585px', // Bajado de 570px a 585px (15px más)
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
        {hasAnswered && (
          <>
            <button
              onClick={handleNext}
              disabled={isProcessing}
              className={`text-white rounded-lg font-medium transition-colors shadow-lg ${
                isProcessing 
                  ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              style={{
                position: isMobile ? 'relative' : 'absolute',
                top: isMobile ? 'auto' : '585px', // Ajustado para coincidir con el botón confirmar (585px)
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
