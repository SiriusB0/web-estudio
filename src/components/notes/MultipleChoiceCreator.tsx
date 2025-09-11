"use client";

import { useState } from "react";
import { parseMultipleChoiceText, getExampleText, MultipleChoiceQuestion } from "@/lib/notes/multipleChoiceParser";
import MultipleChoiceCard from "./MultipleChoiceCard";

interface MultipleChoiceCreatorProps {
  noteId: string;
  noteTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onQuestionsCreated: (questions: MultipleChoiceQuestion[]) => void;
}

export default function MultipleChoiceCreator({
  noteId,
  noteTitle,
  isOpen,
  onClose,
  onQuestionsCreated
}: MultipleChoiceCreatorProps) {
  const [inputText, setInputText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<MultipleChoiceQuestion[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const handleTextChange = (value: string) => {
    setInputText(value);
    // Clear previous results when text changes
    if (parsedQuestions.length > 0 || errors.length > 0) {
      setParsedQuestions([]);
      setErrors([]);
      setShowPreview(false);
    }
  };

  const handleParseQuestions = () => {
    if (!inputText.trim()) {
      setErrors(["Por favor, ingresa el texto con las preguntas"]);
      return;
    }

    setIsProcessing(true);
    
    try {
      const result = parseMultipleChoiceText(inputText);
      
      if (result.errors.length > 0) {
        setErrors(result.errors);
        setParsedQuestions([]);
        setShowPreview(false);
      } else if (result.questions.length > 0) {
        setParsedQuestions(result.questions);
        setErrors([]);
        setShowPreview(true);
        setPreviewIndex(0);
      } else {
        setErrors(["No se encontraron preguntas válidas"]);
        setParsedQuestions([]);
        setShowPreview(false);
      }
    } catch (error) {
      setErrors([`Error procesando el texto: ${error instanceof Error ? error.message : 'Error desconocido'}`]);
      setParsedQuestions([]);
      setShowPreview(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateFlashcards = () => {
    if (parsedQuestions.length > 0) {
      onQuestionsCreated(parsedQuestions);
      handleClose();
    }
  };

  const handleClose = () => {
    setInputText("");
    setParsedQuestions([]);
    setErrors([]);
    setShowPreview(false);
    setPreviewIndex(0);
    onClose();
  };

  const loadExample = () => {
    setInputText(getExampleText());
    setParsedQuestions([]);
    setErrors([]);
    setShowPreview(false);
  };

  const handlePreviewAnswer = (selectedAnswers: string[], isCorrect: boolean) => {
    // En preview mode, solo mostramos el resultado sin hacer nada más
    console.log('Preview answer:', { selectedAnswers, isCorrect });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Crear Flashcards de Opción Múltiple
            </h2>
            <p className="text-sm text-gray-400">{noteTitle}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Input */}
          <div className="w-1/2 flex flex-col border-r border-gray-700">
            {/* Input Header */}
            <div className="p-4 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-white">Pegar Preguntas</h3>
                <button
                  onClick={loadExample}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                >
                  Cargar Ejemplo
                </button>
              </div>
              
              {/* Format Instructions */}
              <div className="text-xs text-gray-400 space-y-1">
                <p><strong>Formato requerido:</strong></p>
                <p>• Pregunta X: ¿Texto de la pregunta?</p>
                <p>• a) Opción A</p>
                <p>• b) Opción B</p>
                <p>• Respuesta: a (o a,c para múltiples)</p>
                <p>• Separar preguntas con línea en blanco</p>
              </div>
            </div>

            {/* Text Input */}
            <div className="flex-1 p-4 flex flex-col">
              <textarea
                value={inputText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Pega aquí tus preguntas siguiendo el formato especificado..."
                className="flex-1 w-full p-3 bg-gray-800 border border-gray-600 rounded text-white text-sm resize-none focus:outline-none focus:border-blue-500"
                style={{ minHeight: '300px' }}
              />
              
              {/* Parse Button */}
              <div className="mt-4 flex justify-center">
                <button
                  onClick={handleParseQuestions}
                  disabled={!inputText.trim() || isProcessing}
                  className={`px-6 py-2 rounded font-medium transition-colors ${
                    !inputText.trim() || isProcessing
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {isProcessing ? "Procesando..." : "Generar Flashcards"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Preview/Results */}
          <div className="w-1/2 flex flex-col">
            {/* Preview Header */}
            <div className="p-4 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white">
                  {showPreview ? "Vista Previa" : "Resultado"}
                </h3>
                {showPreview && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                      disabled={previewIndex === 0}
                      className={`px-2 py-1 text-xs rounded ${
                        previewIndex === 0
                          ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                          : "bg-gray-600 hover:bg-gray-500 text-white"
                      }`}
                    >
                      ← Anterior
                    </button>
                    <span className="text-sm text-gray-300">
                      {previewIndex + 1} / {parsedQuestions.length}
                    </span>
                    <button
                      onClick={() => setPreviewIndex(Math.min(parsedQuestions.length - 1, previewIndex + 1))}
                      disabled={previewIndex === parsedQuestions.length - 1}
                      className={`px-2 py-1 text-xs rounded ${
                        previewIndex === parsedQuestions.length - 1
                          ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                          : "bg-gray-600 hover:bg-gray-500 text-white"
                      }`}
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {errors.length > 0 && (
                <div className="p-4">
                  <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
                    <h4 className="font-medium text-red-400 mb-2">Errores encontrados:</h4>
                    <ul className="space-y-1">
                      {errors.map((error, index) => (
                        <li key={index} className="text-red-300 text-sm">
                          • {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {showPreview && parsedQuestions.length > 0 && (
                <div className="p-4">
                  <MultipleChoiceCard
                    question={parsedQuestions[previewIndex]}
                    onAnswer={handlePreviewAnswer}
                    disabled={false}
                  />
                </div>
              )}

              {!showPreview && errors.length === 0 && (
                <div className="p-4 text-center text-gray-400">
                  <div className="text-4xl mb-4">📝</div>
                  <p>Pega tus preguntas en el panel izquierdo</p>
                  <p className="text-sm mt-2">y presiona "Generar Flashcards" para ver la vista previa</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {showPreview && parsedQuestions.length > 0 && (
              <div className="p-4 border-t border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-300">
                    {parsedQuestions.length} pregunta{parsedQuestions.length !== 1 ? 's' : ''} lista{parsedQuestions.length !== 1 ? 's' : ''} para crear
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPreview(false)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={handleCreateFlashcards}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      Crear Flashcards
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
