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
      className="absolute z-50 bg-white border rounded shadow-lg max-w-xs w-64"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="p-2 text-xs text-gray-500 border-b">
        Sugerencias de notas
      </div>
      <div className="max-h-48 overflow-y-auto">
        {suggestions.map((note, index) => (
          <button
            key={note.id}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
              index === selectedIndex ? "bg-blue-50 text-blue-700" : ""
            }`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("WikilinkSuggestions: Clicking on", note.title);
              onSelect(note.title);
            }}
          >
            {note.title}
          </button>
        ))}
      </div>
      <div className="p-2 text-xs text-gray-500 border-t">
        ↑↓ navegar • Enter seleccionar • Esc cerrar
      </div>
    </div>
  );
}
