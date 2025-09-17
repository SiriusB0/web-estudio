"use client";

import { useState } from "react";
import { getOrCreateDeckForNote, saveFlashcard } from "@/lib/notes/flashcards";

interface BulkFlashcardCreatorProps {
  noteId: string;
  noteTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onFlashcardsCreated: () => void;
}

interface BulkFlashcard {
  front: string;
  back: string;
}

export default function BulkFlashcardCreator({
  noteId,
  noteTitle,
  isOpen,
  onClose,
  onFlashcardsCreated
}: BulkFlashcardCreatorProps) {
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewCards, setPreviewCards] = useState<BulkFlashcard[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const getExampleText = () => {
    return `Pregunta 1: ¿Cuál es la capital de Francia?

Respuesta 1: París.

Pregunta 2: ¿Qué significa HTML?

Respuesta 2: HyperText Markup Language.

Pregunta 3: ¿En qué año se fundó Google?

Respuesta 3: En 1998.

Pregunta 4: ¿Cuál es el planeta más grande del sistema solar?

Respuesta 4: Júpiter.`;
  };

  const loadExample = () => {
    setInputText(getExampleText());
    setPreviewCards([]);
    setShowPreview(false);
  };

  const parseFlashcards = (text: string): BulkFlashcard[] => {
    const cards: BulkFlashcard[] = [];
    const lines = text.split('\n');
    
    let i = 0;
    while (i < lines.length) {
      const currentLine = lines[i].trim();
      
      // Buscar líneas que empiecen con "Pregunta X:"
      const questionMatch = currentLine.match(/^Pregunta\s+\d+:\s*(.+)$/i);
      if (questionMatch) {
        const question = questionMatch[1].trim();
        
        // Buscar la respuesta correspondiente en las siguientes líneas
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j].trim();
          const answerMatch = nextLine.match(/^Respuesta\s+\d+:\s*(.+)$/i);
          
          if (answerMatch) {
            const answer = answerMatch[1].trim();
            if (question && answer) {
              cards.push({ front: question, back: answer });
            }
            i = j + 1;
            break;
          }
          j++;
        }
        
        // Si no encontramos respuesta, avanzar
        if (j >= lines.length) {
          i++;
        }
      } else {
        i++;
      }
    }

    return cards;
  };

  const handlePreview = () => {
    const parsed = parseFlashcards(inputText);
    setPreviewCards(parsed);
    setShowPreview(true);
  };

  const handleCreate = async () => {
    if (previewCards.length === 0) return;

    setIsProcessing(true);
    try {
      const deckId = await getOrCreateDeckForNote(noteId, noteTitle);
      if (!deckId) {
        throw new Error("No se pudo crear o encontrar el deck");
      }

      // Crear todas las flashcards
      const promises = previewCards.map(card => 
        saveFlashcard({
          front: card.front,
          back: card.back,
          deck_id: deckId,
          type: 'traditional'
        }, deckId)
      );

      await Promise.all(promises);
      
      onFlashcardsCreated();
      onClose();
      setInputText("");
      setPreviewCards([]);
      setShowPreview(false);
    } catch (error) {
      console.error("Error creando flashcards en lote:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    onClose();
    setInputText("");
    setPreviewCards([]);
    setShowPreview(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            Crear Flashcards en Lote
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4 max-h-[80vh] overflow-y-auto">
          {!showPreview ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-300">
                    Pega tu texto aquí:
                  </label>
                  <button
                    onClick={loadExample}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                  >
                    Cargar Ejemplo
                  </button>
                </div>
                <div className="text-xs text-gray-400 mb-3 space-y-1">
                  <div><strong>Formato requerido:</strong></div>
                  <div>Pregunta 1: [Tu pregunta aquí]</div>
                  <div>Respuesta 1: [Tu respuesta aquí]</div>
                  <div className="text-yellow-400">* Debe haber un salto de línea entre pregunta y respuesta</div>
                </div>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full h-64 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Pregunta 1: ¿Cuál es la capital de Francia?

Respuesta 1: París.

Pregunta 2: ¿Qué significa HTML?

Respuesta 2: HyperText Markup Language."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handlePreview}
                  disabled={!inputText.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Vista Previa
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">
                  Vista Previa ({previewCards.length} flashcards)
                </h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  ← Editar texto
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3">
                {previewCards.map((card, index) => (
                  <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-400">Pregunta:</span>
                        <p className="text-white text-sm mt-1">{card.front}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">Respuesta:</span>
                        <p className="text-gray-300 text-sm mt-1">{card.back}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCreate}
                  disabled={isProcessing || previewCards.length === 0}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isProcessing ? "Creando..." : `Crear ${previewCards.length} Flashcards`}
                </button>
                <button
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
