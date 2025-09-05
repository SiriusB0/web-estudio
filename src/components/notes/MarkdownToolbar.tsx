"use client";

import { useRef, useState } from "react";

interface MarkdownToolbarProps {
  onInsert: (prefix: string, suffix?: string, wrapSelection?: boolean) => void;
  onColorInsert?: (color: string) => void;
  onRemoveColor?: () => void;
  viewMode: "edit" | "preview";
  flashcardCount?: number;
  pendingQuestion?: string;
  onViewFlashcards?: () => void;
  onStudyFlashcards?: () => void;
}

export default function MarkdownToolbar({ 
  onInsert, 
  onColorInsert,
  onRemoveColor,
  viewMode,
  flashcardCount = 0,
  pendingQuestion = "",
  onViewFlashcards,
  onStudyFlashcards
}: MarkdownToolbarProps) {
  if (viewMode !== "edit") return null;

  const [showStructure, setShowStructure] = useState(false);
  const [showIcons, setShowIcons] = useState(false);

  const structureItems = [
    "├── ",
    "│   ",
    "└── ",
    "[ ] ",
    "[x] "
  ];

  const iconCategories = [
    {
      name: "General",
      icons: ["📁","📌","✅","⚠️","🔧","📚","📝","📖","📑","🗂️","🧾","🖊️"]
    },
    {
      name: "Tecnología",
      icons: ["💻","👨‍💻","👩‍💻","⚙️","🔒","🧩","🖱️","⌨️"]
    },
    {
      name: "Estado",
      icons: ["⏳","⌛","🟢","🔴","🟡","🔵","📊"]
    },
    {
      name: "Alertas",
      icons: ["❗","❓","🚨","🛑","🔍","🧭"]
    },
    {
      name: "Herramientas",
      icons: ["🪛","🛠️","🧪","🔬","🗜️"]
    },
    {
      name: "Varios",
      icons: ["🖥️","🗄️","💾","🧮","🧵","📦","🌐","🔗","📡","🛰️","⚡","🔥","🌀","🔄","🗃️","🛜","🪟","🖇️","💡","📜"]
    }
  ];

  const formatActions = [
    {
      icon: "B",
      title: "Negrita",
      action: () => onInsert("**", "**", true),
      style: "font-bold"
    },
    {
      icon: "I",
      title: "Cursiva", 
      action: () => onInsert("*", "*", true),
      style: "italic"
    },
    {
      icon: "</>",
      title: "Código inline",
      action: () => onInsert("`", "`", true),
      style: "font-mono text-xs"
    },
    {
      icon: "```",
      title: "Bloque de código",
      action: () => onInsert("```\n", "\n```\n", true),
      style: "font-mono text-xs"
    },
    {
      icon: "•",
      title: "Lista",
      action: () => onInsert("- ", "", false),
      style: ""
    },
    {
      icon: "1.",
      title: "Lista numerada", 
      action: () => onInsert("1. ", "", false),
      style: ""
    },
    {
      icon: "❝",
      title: "Cita",
      action: () => onInsert("> ", "", false),
      style: ""
    },
    {
      icon: "🔗",
      title: "Enlace",
      action: () => onInsert("[", "](url)", true),
      style: ""
    }
  ];

  return (
    <div className="flex items-center gap-1 p-2 border-b border-gray-900 relative" style={{backgroundColor: '#0f0f0f'}}>
      {formatActions.map((action, index) => (
        <button
          key={index}
          onClick={action.action}
          title={action.title}
          className={`px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors ${action.style || ""}`}
        >
          {action.icon}
        </button>
      ))}
      
      {/* Separador y botones de colores */}
      <div className="w-px h-4 bg-gray-600 mx-2"></div>
      {onColorInsert && (
        <>
          <button 
            title="Texto rojo" 
            onClick={() => onColorInsert('#ef4444')}
            className="w-6 h-6 rounded border border-gray-600 hover:border-gray-400 transition-colors"
            style={{backgroundColor: '#ef4444'}}
          ></button>
          <button 
            title="Texto azul" 
            onClick={() => onColorInsert('#3b82f6')}
            className="w-6 h-6 rounded border border-gray-600 hover:border-gray-400 transition-colors"
            style={{backgroundColor: '#3b82f6'}}
          ></button>
          <button 
            title="Texto verde" 
            onClick={() => onColorInsert('#22c55e')}
            className="w-6 h-6 rounded border border-gray-600 hover:border-gray-400 transition-colors"
            style={{backgroundColor: '#22c55e'}}
          ></button>
          <button 
            title="Texto amarillo" 
            onClick={() => onColorInsert('#eab308')}
            className="w-6 h-6 rounded border border-gray-600 hover:border-gray-400 transition-colors"
            style={{backgroundColor: '#eab308'}}
          ></button>
          <button 
            title="Texto naranja" 
            onClick={() => onColorInsert('#f97316')}
            className="w-6 h-6 rounded border border-gray-600 hover:border-gray-400 transition-colors"
            style={{backgroundColor: '#f97316'}}
          ></button>
          <button 
            title="Texto morado" 
            onClick={() => onColorInsert('#a855f7')}
            className="w-6 h-6 rounded border border-gray-600 hover:border-gray-400 transition-colors"
            style={{backgroundColor: '#a855f7'}}
          ></button>
          <button 
            title="Texto blanco" 
            onClick={() => onColorInsert('#ffffff')}
            className="w-6 h-6 rounded border border-gray-600 hover:border-gray-400 transition-colors"
            style={{backgroundColor: '#ffffff'}}
          ></button>
          <button 
            title="Quitar color"
            onClick={onRemoveColor}
            className="w-6 h-6 rounded border border-gray-600 hover:border-gray-400 transition-colors flex items-center justify-center text-gray-400 hover:text-white"
          >
            🚫
          </button>
        </>
      )}
      
      {/* Botón de estructura */}
      <div className="relative">
        <button
          onClick={() => { setShowStructure(v => !v); setShowIcons(false); }}
          title="Estructura"
          className="px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
        >
          ├─
        </button>
        {showStructure && (
          <div className="absolute left-0 mt-1 z-20 rounded-md border border-gray-700 bg-gray-800 shadow-xl p-2 flex flex-col gap-2 w-auto">
            {structureItems.map((s, i) => (
              <button
                key={i}
                onClick={() => { onInsert(s, "", false); setShowStructure(false); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                title={s.trim()}
              >
                <span className="font-mono">{s}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Botón de iconos */}
      <div className="relative">
        <button
          onClick={() => { setShowIcons(v => !v); setShowStructure(false); }}
          title="Iconos"
          className="px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
        >
          🔣
        </button>
        {showIcons && (
          <div className="absolute left-0 mt-1 z-20 rounded-md border border-gray-700 bg-gray-800 shadow-xl p-3 w-80 max-h-[50vh] overflow-y-auto overflow-x-hidden">
            {iconCategories.map(category => (
              <div key={category.name} className="mb-4">
                <h4 className="text-xs text-gray-400 font-semibold uppercase tracking-wider px-1 mb-3">{category.name}</h4>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2">
                  {category.icons.map((icon, i) => (
                    <button
                      key={i}
                      onClick={() => { onInsert(icon + " ", "", false); setShowIcons(false); }}
                      className="w-11 h-11 text-xl flex items-center justify-center hover:bg-gray-700 rounded-md transition-colors"
                      title={icon}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Separador para flashcards */}
      <div className="h-4 w-px bg-gray-500 mx-2" />
      
      {/* Indicador de estado de flashcards */}
      <div className="flex items-center gap-2">
        {pendingQuestion ? (
          <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded">
            ⏳ Pregunta pendiente
          </span>
        ) : (
          <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded">
            📚 {flashcardCount} flashcards
          </span>
        )}
        
        {/* Botones de flashcards */}
        {flashcardCount > 0 && (
          <>
            <button
              onClick={onViewFlashcards}
              title="Ver flashcards"
              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
            >
              Ver
            </button>
            <button
              onClick={onStudyFlashcards}
              title="Estudiar flashcards"
              className="px-2 py-1 text-xs bg-green-700 hover:bg-green-600 text-white rounded transition-colors"
            >
              Estudiar
            </button>
          </>
        )}
        
        {/* Ayuda para atajos */}
        <span className="text-xs text-gray-500 ml-2">
          Alt+Q: Pregunta | Alt+A: Respuesta
        </span>
      </div>
    </div>
  );
}
