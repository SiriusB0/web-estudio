"use client";

import { useState, useEffect } from "react";
import { Flashcard, getFlashcardsForNote, deleteFlashcard, deleteFlashcards, updateFlashcard, getFlashcardsByType, saveMultipleChoiceFlashcards, getOrCreateDeckForNote } from "@/lib/notes/flashcards";
import { MultipleChoiceQuestion } from "@/lib/notes/multipleChoiceParser";
import ManualFlashcardCreator from "./ManualFlashcardCreator";
import MultipleChoiceCreator from "./MultipleChoiceCreator";
import ImageModal from "./ImageModal";
import StudyMode from "./StudyMode";
import MixedStudyMode from "./MixedStudyMode";
import StudyModeSelector from "./StudyModeSelector";

interface FlashcardViewerProps {
  noteId: string;
  noteTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onFlashcardsChange: () => void;
}

export default function FlashcardViewer({ 
  noteId, 
  noteTitle, 
  isOpen, 
  onClose, 
  onFlashcardsChange 
}: FlashcardViewerProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [showManualCreator, setShowManualCreator] = useState(false);
  const [showMultipleChoiceCreator, setShowMultipleChoiceCreator] = useState(false);
  const [showStudyMode, setShowStudyMode] = useState(false);
  const [showStudyModeSelector, setShowStudyModeSelector] = useState(false);
  const [traditionalCount, setTraditionalCount] = useState(0);
  const [multipleChoiceCount, setMultipleChoiceCount] = useState(0);
  const [studyMode, setStudyMode] = useState<'traditional' | 'multiple_choice' | 'mixed'>('mixed');
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState("");
  const [modalImageName, setModalImageName] = useState("");

  useEffect(() => {
    if (isOpen && noteId) {
      loadFlashcards();
    }
  }, [isOpen, noteId]);

  const loadFlashcards = async () => {
    setLoading(true);
    try {
      const cards = await getFlashcardsForNote(noteId);
      setFlashcards(cards);
      
      // Contar flashcards por tipo
      const { traditional, multipleChoice } = await getFlashcardsByType(noteId);
      setTraditionalCount(traditional.length);
      setMultipleChoiceCount(multipleChoice.length);
    } catch (error) {
      console.error("Error cargando flashcards:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cardId: string) => {
    try {
      await deleteFlashcard(cardId);
      setFlashcards(prev => prev.filter(card => card.id !== cardId));
      onFlashcardsChange();
    } catch (error) {
      console.error("Error eliminando flashcard:", error);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedCards.size === 0) return;
    
    try {
      await deleteFlashcards(Array.from(selectedCards));
      setFlashcards(prev => prev.filter(card => !selectedCards.has(card.id!)));
      setSelectedCards(new Set());
      onFlashcardsChange();
    } catch (error) {
      console.error("Error eliminando flashcards:", error);
    }
  };

  const handleEdit = (card: Flashcard) => {
    setEditingCard(card.id!);
    setEditFront(card.front);
    setEditBack(card.back);
  };

  const handleSaveEdit = async () => {
    if (!editingCard) return;
    
    try {
      await updateFlashcard(editingCard, editFront, editBack);
      setFlashcards(prev => prev.map(card => 
        card.id === editingCard 
          ? { ...card, front: editFront, back: editBack }
          : card
      ));
      setEditingCard(null);
      onFlashcardsChange();
    } catch (error) {
      console.error("Error actualizando flashcard:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingCard(null);
    setEditFront("");
    setEditBack("");
  };

  const toggleCardSelection = (cardId: string) => {
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const selectAllCards = () => {
    setSelectedCards(new Set(flashcards.map(card => card.id!)));
  };

  const deselectAllCards = () => {
    setSelectedCards(new Set());
  };

  const openImageModal = (imageUrl: string, imageName: string) => {
    setModalImageUrl(imageUrl);
    setModalImageName(imageName);
    setImageModalOpen(true);
  };

  const handleManualFlashcardCreated = () => {
    loadFlashcards();
    onFlashcardsChange();
  };

  const handleMultipleChoiceCreated = async (questions: MultipleChoiceQuestion[]) => {
    try {
      const deckId = await getOrCreateDeckForNote(noteId, noteTitle);
      if (deckId) {
        await saveMultipleChoiceFlashcards(questions, deckId);
        loadFlashcards();
        onFlashcardsChange();
      }
    } catch (error) {
      console.error("Error creando flashcards de opción múltiple:", error);
    }
  };

  const handleStudyModeSelected = (mode: 'traditional' | 'multiple_choice' | 'mixed' | 'exam', examConfig?: { questionCount: number; timeMinutes: number }) => {
    console.log('FlashcardViewer - handleStudyModeSelected called with:', { mode, examConfig });
    if (mode === 'exam' && examConfig) {
      // Para modo examen, redirigir a la página de estudio con parámetros
      const params = new URLSearchParams({
        mode: 'exam',
        questions: examConfig.questionCount.toString(),
        time: examConfig.timeMinutes.toString()
      });
      console.log('Redirecting to:', `/study/${noteId}?${params.toString()}`);
      window.location.href = `/study/${noteId}?${params.toString()}`;
    } else {
      setStudyMode(mode as 'traditional' | 'multiple_choice' | 'mixed');
      setShowStudyMode(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            Flashcards: {noteTitle}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">
              {flashcards.length} flashcards
            </span>
            {selectedCards.size > 0 && (
              <span className="text-sm text-blue-400">
                ({selectedCards.size} seleccionadas)
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManualCreator(true)}
              className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            >
              + Crear Manual
            </button>
            <button
              onClick={() => setShowMultipleChoiceCreator(true)}
              className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
            >
              + Opción Múltiple
            </button>
            {flashcards.length > 0 && (
              <>
                <button
                  onClick={() => setShowStudyModeSelector(true)}
                  className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  📚 Estudiar
                </button>
                <button
                  onClick={selectAllCards}
                  className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
                >
                  Seleccionar todas
                </button>
                <button
                  onClick={deselectAllCards}
                  className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
                >
                  Deseleccionar
                </button>
                {selectedCards.size > 0 && (
                  <button
                    onClick={handleBatchDelete}
                    className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                  >
                    Eliminar seleccionadas
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-400 py-8">
              Cargando flashcards...
            </div>
          ) : flashcards.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No hay flashcards creadas para esta nota.
              <br />
              Usa Alt+Q y Alt+A en el editor para crear flashcards automáticamente.
            </div>
          ) : (
            <div className="space-y-3">
              {flashcards.map((card) => (
                <div
                  key={card.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    selectedCards.has(card.id!) 
                      ? 'border-blue-500 bg-blue-900/20' 
                      : 'border-gray-700 bg-gray-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedCards.has(card.id!)}
                      onChange={() => toggleCardSelection(card.id!)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1">
                      {editingCard === card.id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Pregunta:</label>
                            <textarea
                              value={editFront}
                              onChange={(e) => setEditFront(e.target.value)}
                              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm resize-none"
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Respuesta:</label>
                            <textarea
                              value={editBack}
                              onChange={(e) => setEditBack(e.target.value)}
                              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm resize-none"
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs text-gray-400">Pregunta:</span>
                            {card.front_image_url ? (
                              <div className="mt-1">
                                <img
                                  src={card.front_image_url}
                                  alt={card.front_image_name || "Imagen pregunta"}
                                  className="max-w-32 max-h-24 object-contain bg-gray-700 rounded cursor-pointer"
                                  onClick={() => openImageModal(card.front_image_url!, card.front_image_name || "Imagen pregunta")}
                                />
                                {card.front && (
                                  <p className="text-white text-sm mt-1">{card.front}</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-white text-sm mt-1">{card.front}</p>
                            )}
                          </div>
                          <div>
                            <span className="text-xs text-gray-400">Respuesta:</span>
                            {card.back_image_url ? (
                              <div className="mt-1">
                                <img
                                  src={card.back_image_url}
                                  alt={card.back_image_name || "Imagen respuesta"}
                                  className="max-w-32 max-h-24 object-contain bg-gray-700 rounded cursor-pointer"
                                  onClick={() => openImageModal(card.back_image_url!, card.back_image_name || "Imagen respuesta")}
                                />
                                {card.back && (
                                  <p className="text-gray-300 text-sm mt-1">{card.back}</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-gray-300 text-sm mt-1">{card.back}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {editingCard !== card.id && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(card)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(card.id!)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manual Flashcard Creator */}
      <ManualFlashcardCreator
        noteId={noteId}
        noteTitle={noteTitle}
        isOpen={showManualCreator}
        onClose={() => setShowManualCreator(false)}
        onFlashcardCreated={handleManualFlashcardCreated}
      />

      {/* Multiple Choice Creator */}
      <MultipleChoiceCreator
        noteId={noteId}
        noteTitle={noteTitle}
        isOpen={showMultipleChoiceCreator}
        onClose={() => setShowMultipleChoiceCreator(false)}
        onQuestionsCreated={handleMultipleChoiceCreated}
      />

      {/* Study Mode Selector */}
      <StudyModeSelector
        isOpen={showStudyModeSelector}
        onClose={() => setShowStudyModeSelector(false)}
        onModeSelected={handleStudyModeSelected}
        traditionalCount={traditionalCount}
        multipleChoiceCount={multipleChoiceCount}
        title={`Flashcards: ${noteTitle}`}
      />

      {/* Mixed Study Mode */}
      <MixedStudyMode
        flashcards={flashcards}
        isOpen={showStudyMode}
        onClose={() => setShowStudyMode(false)}
        title={`Flashcards: ${noteTitle}`}
        studyMode={studyMode}
      />

      {/* Image Modal */}
      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={modalImageUrl}
        imageName={modalImageName}
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  );
}
