"use client";

import { useState, useEffect } from "react";

interface Note {
  id: string;
  title: string;
}

interface WikilinkSuggestionsProps {
  suggestions: Note[];
  onSelect: (noteTitle: string) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export default function WikilinkSuggestions({
  suggestions,
  onSelect,
  onClose,
  position
}: WikilinkSuggestionsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            onSelect(suggestions[selectedIndex].title);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [suggestions, selectedIndex, onSelect, onClose]);

  if (suggestions.length === 0) return null;

  return (
    <div
      className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-w-xs w-64"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="p-2 text-xs text-gray-400 border-b border-gray-700">
        Sugerencias de notas
      </div>
      <div className="max-h-48 overflow-y-auto">
        {suggestions.map((note, index) => (
          <button
            key={note.id}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-800 transition-colors ${
              index === selectedIndex ? "bg-blue-600 text-blue-100" : "text-gray-200"
            }`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect(note.title);
            }}
          >
            {note.title}
          </button>
        ))}
      </div>
      <div className="p-2 text-xs text-gray-400 border-t border-gray-700">
        ↑↓ navegar • Enter seleccionar • Esc cerrar
      </div>
    </div>
  );
}
