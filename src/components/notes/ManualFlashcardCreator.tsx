"use client";

import { useState } from "react";
import { Flashcard, saveFlashcard, getOrCreateDeckForNote, uploadFlashcardImage } from "@/lib/notes/flashcards";
import ImageModal from "./ImageModal";

interface ManualFlashcardCreatorProps {
  noteId: string;
  noteTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onFlashcardCreated: () => void;
}

type FlashcardType = 'text' | 'image';

export default function ManualFlashcardCreator({ 
  noteId, 
  noteTitle, 
  isOpen, 
  onClose, 
  onFlashcardCreated 
}: ManualFlashcardCreatorProps) {
  const [frontType, setFrontType] = useState<FlashcardType>('text');
  const [backType, setBackType] = useState<FlashcardType>('text');
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontImagePreview, setFrontImagePreview] = useState<string>("");
  const [backImagePreview, setBackImagePreview] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState("");
  const [modalImageName, setModalImageName] = useState("");

  const handleImageUpload = (file: File, side: 'front' | 'back') => {
    if (side === 'front') {
      setFrontImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setFrontImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setBackImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setBackImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (side: 'front' | 'back') => {
    if (side === 'front') {
      setFrontImage(null);
      setFrontImagePreview("");
    } else {
      setBackImage(null);
      setBackImagePreview("");
    }
  };

  const openImageModal = (imageUrl: string, imageName: string) => {
    setModalImageUrl(imageUrl);
    setModalImageName(imageName);
    setImageModalOpen(true);
  };

  const handleCreate = async () => {
    if ((!frontText.trim() && !frontImage) || (!backText.trim() && !backImage)) {
      alert("Por favor completa tanto la pregunta como la respuesta");
      return;
    }

    setIsCreating(true);
    try {
      // Obtener o crear deck para la nota
      const deckId = await getOrCreateDeckForNote(noteId, noteTitle);
      if (!deckId) {
        throw new Error("No se pudo crear el deck");
      }

      // Crear ID temporal para la flashcard
      const tempCardId = `temp_${Date.now()}`;

      // Subir imágenes si existen
      let frontImageUrl = "";
      let backImageUrl = "";
      let frontImageName = "";
      let backImageName = "";

      if (frontImage) {
        frontImageUrl = await uploadFlashcardImage(frontImage, tempCardId, 'front') || "";
        frontImageName = frontImage.name;
      }

      if (backImage) {
        backImageUrl = await uploadFlashcardImage(backImage, tempCardId, 'back') || "";
        backImageName = backImage.name;
      }

      // Crear flashcard
      const flashcard: Flashcard = {
        front: frontText,
        back: backText,
        front_image_url: frontImageUrl,
        back_image_url: backImageUrl,
        front_image_name: frontImageName,
        back_image_name: backImageName
      };

      const success = await saveFlashcard(flashcard, deckId);
      
      if (success) {
        // Limpiar formulario
        setFrontText("");
        setBackText("");
        setFrontImage(null);
        setBackImage(null);
        setFrontImagePreview("");
        setBackImagePreview("");
        setFrontType('text');
        setBackType('text');
        
        onFlashcardCreated();
        onClose();
      } else {
        throw new Error("Error al guardar la flashcard");
      }
    } catch (error) {
      console.error("Error creando flashcard:", error);
      alert("Error al crear la flashcard. Por favor intenta de nuevo.");
    } finally {
      setIsCreating(false);
    }
  };

  const isValid = () => {
    const frontValid = frontType === 'text' ? frontText.trim() : frontImage;
    const backValid = backType === 'text' ? backText.trim() : backImage;
    return frontValid && backValid;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">
              Crear Flashcard Manual
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
            {/* Pregunta (Front) */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="text-white font-medium">Pregunta:</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFrontType('text')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      frontType === 'text' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Texto
                  </button>
                  <button
                    onClick={() => setFrontType('image')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      frontType === 'image' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Imagen
                  </button>
                </div>
              </div>

              {frontType === 'text' ? (
                <textarea
                  value={frontText}
                  onChange={(e) => setFrontText(e.target.value)}
                  placeholder="Escribe la pregunta..."
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded text-white resize-none"
                  rows={3}
                />
              ) : (
                <div className="space-y-2">
                  {!frontImage ? (
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'front')}
                        className="hidden"
                      />
                      <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-gray-500 transition-colors">
                        <div className="text-gray-400">
                          📷 Haz clic para subir una imagen
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          PNG, JPG, GIF hasta 5MB
                        </div>
                      </div>
                    </label>
                  ) : (
                    <div className="relative">
                      <img
                        src={frontImagePreview}
                        alt="Vista previa pregunta"
                        className="w-full max-h-32 object-contain bg-gray-800 rounded cursor-pointer"
                        onClick={() => openImageModal(frontImagePreview, frontImage.name)}
                      />
                      <button
                        onClick={() => removeImage('front')}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Respuesta (Back) */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="text-white font-medium">Respuesta:</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBackType('text')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      backType === 'text' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Texto
                  </button>
                  <button
                    onClick={() => setBackType('image')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      backType === 'image' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Imagen
                  </button>
                </div>
              </div>

              {backType === 'text' ? (
                <textarea
                  value={backText}
                  onChange={(e) => setBackText(e.target.value)}
                  placeholder="Escribe la respuesta..."
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded text-white resize-none"
                  rows={3}
                />
              ) : (
                <div className="space-y-2">
                  {!backImage ? (
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'back')}
                        className="hidden"
                      />
                      <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-gray-500 transition-colors">
                        <div className="text-gray-400">
                          📷 Haz clic para subir una imagen
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          PNG, JPG, GIF hasta 5MB
                        </div>
                      </div>
                    </label>
                  ) : (
                    <div className="relative">
                      <img
                        src={backImagePreview}
                        alt="Vista previa respuesta"
                        className="w-full max-h-32 object-contain bg-gray-800 rounded cursor-pointer"
                        onClick={() => openImageModal(backImagePreview, backImage.name)}
                      />
                      <button
                        onClick={() => removeImage('back')}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={isCreating}
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={!isValid() || isCreating}
              className={`px-4 py-2 rounded transition-colors ${
                isValid() && !isCreating
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isCreating ? 'Creando...' : 'Crear Flashcard'}
            </button>
          </div>
        </div>
      </div>

      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={modalImageUrl}
        imageName={modalImageName}
        onClose={() => setImageModalOpen(false)}
      />
    </>
  );
}
