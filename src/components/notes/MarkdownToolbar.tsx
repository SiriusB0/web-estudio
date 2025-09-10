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
  const [showHelp, setShowHelp] = useState(false);
  const [helpSection, setHelpSection] = useState<string | null>(null);

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
      
      {/* Botón de ayuda */}
      <button
        onClick={() => {
          setShowHelp(true);
          setShowStructure(false);
          setShowIcons(false);
          setHelpSection(null);
        }}
        title="Guía de ayuda"
        className="px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
      >
        ❓
      </button>
      
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18"/>
              <path d="M6 6l12 12"/>
            </svg>
          </button>
        </>
      )}
      
      {/* Botón de estructura */}
      <div className="relative">
        <button
          onClick={() => { setShowStructure(v => !v); setShowIcons(false); setShowHelp(false); }}
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
          onClick={() => { setShowIcons(v => !v); setShowStructure(false); setShowHelp(false); }}
          title="Iconos"
          className="px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
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

      {/* Modal de ayuda */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex">
            {/* Sidebar de navegación */}
            <div className="w-64 bg-gray-900 border-r border-gray-700 p-4 overflow-y-auto">
              <h3 className="text-lg font-medium text-white mb-4">Guía de Usuario</h3>
              <nav className="space-y-2">
                <button
                  onClick={() => setHelpSection(null)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    helpSection === null ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  📋 Índice General
                </button>
                <button
                  onClick={() => setHelpSection('formato')}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    helpSection === 'formato' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  ✏️ Formato de Texto
                </button>
                <button
                  onClick={() => setHelpSection('preformateado')}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    helpSection === 'preformateado' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  📄 Texto Preformateado
                </button>
                <button
                  onClick={() => setHelpSection('listas')}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    helpSection === 'listas' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  📝 Listas
                </button>
                <button
                  onClick={() => setHelpSection('citas')}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    helpSection === 'citas' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  💬 Citas
                </button>
                <button
                  onClick={() => setHelpSection('negrita-cursiva')}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    helpSection === 'negrita-cursiva' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  🔤 Negrita y Cursiva
                </button>
                <button
                  onClick={() => setHelpSection('codigo')}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    helpSection === 'codigo' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  💻 Bloques de Código
                </button>
                <button
                  onClick={() => setHelpSection('enlaces')}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    helpSection === 'enlaces' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  🔗 Enlaces Externos
                </button>
                <button
                  onClick={() => setHelpSection('wikilinks')}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    helpSection === 'wikilinks' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  🔗 Wikilinks
                </button>
                <button
                  onClick={() => setHelpSection('anotaciones')}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    helpSection === 'anotaciones' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  📌 Anotaciones en Modo Estudio
                </button>
              </nav>
            </div>
            
            {/* Contenido principal */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {helpSection === null && '📋 Guía Rápida de Usuario'}
                  {helpSection === 'formato' && '✏️ Formato de Texto (Markdown)'}
                  {helpSection === 'preformateado' && '📄 Texto con Sombreado (Preformateado)'}
                  {helpSection === 'listas' && '📝 Listas'}
                  {helpSection === 'citas' && '💬 Citas'}
                  {helpSection === 'negrita-cursiva' && '🔤 Negrita y Cursiva'}
                  {helpSection === 'codigo' && '💻 Bloques de Código'}
                  {helpSection === 'enlaces' && '🔗 Enlaces Externos'}
                  {helpSection === 'wikilinks' && '🔗 Wikilinks'}
                  {helpSection === 'anotaciones' && '📌 Anotaciones en Modo Estudio'}
                </h2>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-gray-400 hover:text-white p-2 hover:bg-gray-700 rounded transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="text-gray-300 space-y-4">
                {helpSection === null && (
                  <div>
                    <p className="mb-4">¡Bienvenido! Esta guía te ayudará a aprovechar al máximo todas las funcionalidades de la plataforma. Aquí encontrarás cómo dar formato a tus notas y utilizar las herramientas de estudio.</p>
                    <p className="text-sm text-gray-400">Selecciona una sección del menú lateral para obtener información detallada sobre cada funcionalidad.</p>
                  </div>
                )}
                
                {helpSection === 'formato' && (
                  <div>
                    <p className="mb-4">La plataforma utiliza Markdown para dar formato al texto. Aquí tienes las opciones principales:</p>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                      <li>Texto preformateado con sombreado</li>
                      <li>Listas con viñetas y numeradas</li>
                      <li>Citas destacadas</li>
                      <li>Texto en negrita y cursiva</li>
                      <li>Bloques de código con resaltado</li>
                      <li>Enlaces externos e internos</li>
                    </ul>
                  </div>
                )}
                
                {helpSection === 'preformateado' && (
                  <div>
                    <p className="mb-4">Para resaltar un bloque de texto con un fondo sombreado, simplemente indenta cada línea con cuatro espacios. Es ideal para notas o fragmentos que necesitan destacar visualmente.</p>
                    <div className="bg-gray-900 p-4 rounded border border-gray-600 font-mono text-sm">
                      <div className="text-gray-400 mb-2">Ejemplo:</div>
                      <div className="text-green-400">    Este es un texto preformateado.</div>
                      <div className="text-green-400">    Tendrá un fondo grisáceo para diferenciarlo del resto del contenido.</div>
                      <div className="text-green-400">    Cada línea debe tener 4 espacios al inicio.</div>
                    </div>
                  </div>
                )}
                
                {helpSection === 'listas' && (
                  <div>
                    <p className="mb-4">Organiza tus ideas con listas. Simplemente usa un guión (-) seguido de un espacio.</p>
                    <div className="bg-gray-900 p-4 rounded border border-gray-600">
                      <div className="text-gray-400 mb-2">Ejemplo:</div>
                      <div className="text-green-400 font-mono text-sm mb-2">- Tarea 1: Investigar sobre Sistemas Operativos.</div>
                      <div className="text-green-400 font-mono text-sm mb-2">- Tarea 2: Crear un resumen de los conceptos clave.</div>
                      <div className="text-green-400 font-mono text-sm">- Tarea 3: Preparar flashcards para estudiar.</div>
                      <div className="text-gray-400 mt-3 mb-2">Se ve así:</div>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Tarea 1: Investigar sobre Sistemas Operativos.</li>
                        <li>Tarea 2: Crear un resumen de los conceptos clave.</li>
                        <li>Tarea 3: Preparar flashcards para estudiar.</li>
                      </ul>
                    </div>
                  </div>
                )}
                
                {helpSection === 'citas' && (
                  <div>
                    <p className="mb-4">Para citar texto o crear notas destacadas, usa el símbolo {'>'} al inicio de la línea.</p>
                    <div className="bg-gray-900 p-4 rounded border border-gray-600">
                      <div className="text-gray-400 mb-2">Ejemplo:</div>
                      <div className="text-green-400 font-mono text-sm mb-2">{'>'} La educación es el arma más poderosa que puedes usar para cambiar el mundo.</div>
                      <div className="text-green-400 font-mono text-sm mb-3">{'>'} - Nelson Mandela</div>
                      <div className="text-gray-400 mb-2">Se ve así:</div>
                      <blockquote className="border-l-4 border-gray-500 pl-4 italic">
                        La educación es el arma más poderosa que puedes usar para cambiar el mundo.<br/>
                        - Nelson Mandela
                      </blockquote>
                    </div>
                  </div>
                )}
                
                {helpSection === 'negrita-cursiva' && (
                  <div>
                    <p className="mb-4">Dale énfasis a tu texto de forma sencilla:</p>
                    <div className="bg-gray-900 p-4 rounded border border-gray-600 space-y-3">
                      <div>
                        <div className="text-gray-400 mb-2">Negrita:</div>
                        <div className="text-green-400 font-mono text-sm mb-2">**Así se ve el texto en negrita**</div>
                        <div className="text-gray-400 mb-2">Resultado:</div>
                        <div className="font-bold">Así se ve el texto en negrita</div>
                      </div>
                      <div>
                        <div className="text-gray-400 mb-2">Cursiva:</div>
                        <div className="text-green-400 font-mono text-sm mb-2">*Y así se ve el texto en cursiva*</div>
                        <div className="text-gray-400 mb-2">Resultado:</div>
                        <div className="italic">Y así se ve el texto en cursiva</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {helpSection === 'codigo' && (
                  <div>
                    <p className="mb-4">Muestra código de programación con resaltado de sintaxis. Envuelve tu código en tres comillas invertidas (```) y especifica el lenguaje.</p>
                    <div className="bg-gray-900 p-4 rounded border border-gray-600">
                      <div className="text-gray-400 mb-2">Ejemplo:</div>
                      <div className="text-green-400 font-mono text-sm mb-2">```javascript</div>
                      <div className="text-green-400 font-mono text-sm mb-2">function saludar(nombre) {'{'}</div>
                      <div className="text-green-400 font-mono text-sm mb-2">  console.log(`Hola, ${'{'}{'{'}nombre{'}'}{'}'}`!);</div>
                      <div className="text-green-400 font-mono text-sm mb-2">{'}'}</div>
                      <div className="text-green-400 font-mono text-sm mb-2">saludar('Mundo');</div>
                      <div className="text-green-400 font-mono text-sm mb-3">```</div>
                      <div className="text-gray-400 mb-2">Se ve así:</div>
                      <pre className="bg-gray-800 p-3 rounded text-sm overflow-x-auto">
                        <code className="text-blue-400">function</code> <code className="text-yellow-400">saludar</code><code className="text-gray-300">(</code><code className="text-orange-400">nombre</code><code className="text-gray-300">) {'{'}</code><br/>
                        <code className="text-gray-300">  console.</code><code className="text-yellow-400">log</code><code className="text-gray-300">(</code><code className="text-green-400">`Hola, </code><code className="text-gray-300">${'{'}</code><code className="text-orange-400">nombre</code><code className="text-gray-300">{'}'}</code><code className="text-green-400">!`</code><code className="text-gray-300">);</code><br/>
                        <code className="text-gray-300">{'}'}</code><br/>
                        <code className="text-yellow-400">saludar</code><code className="text-gray-300">(</code><code className="text-green-400">'Mundo'</code><code className="text-gray-300">);</code>
                      </pre>
                    </div>
                  </div>
                )}
                
                {helpSection === 'enlaces' && (
                  <div>
                    <p className="mb-4">Para agregar un enlace a una página web externa, usa corchetes para el texto y paréntesis para la URL.</p>
                    <div className="bg-gray-900 p-4 rounded border border-gray-600">
                      <div className="text-gray-400 mb-2">Ejemplo:</div>
                      <div className="text-green-400 font-mono text-sm mb-3">[Visita Google](https://www.google.com)</div>
                      <div className="text-gray-400 mb-2">Se ve así:</div>
                      <a href="#" className="text-blue-400 hover:text-blue-300 underline">Visita Google</a>
                    </div>
                  </div>
                )}
                
                {helpSection === 'wikilinks' && (
                  <div>
                    <p className="mb-4">Crea enlaces internos entre tus notas para construir una base de conocimiento conectada. Simplemente envuelve el título de otra nota en dobles corchetes.</p>
                    <div className="bg-gray-900 p-4 rounded border border-gray-600">
                      <div className="text-gray-400 mb-2">Ejemplo:</div>
                      <div className="text-green-400 font-mono text-sm mb-3">[[Sistemas Operativos]]</div>
                      <div className="text-gray-400 mb-2">Se convierte en un enlace directo a tu nota sobre ese tema.</div>
                      <div className="text-blue-400 hover:text-blue-300 underline cursor-pointer">Sistemas Operativos</div>
                    </div>
                  </div>
                )}
                
                {helpSection === 'anotaciones' && (
                  <div>
                    <p className="mb-4">Cuando estés en el "Modo Estudio" (antes "Vista Previa"), puedes agregar anotaciones a cualquier párrafo o elemento de una lista sin modificar el contenido original.</p>
                    <div className="bg-gray-900 p-4 rounded border border-gray-600">
                      <div className="text-gray-400 mb-3">Pasos para crear anotaciones:</div>
                      <ol className="list-decimal list-inside space-y-2">
                        <li><strong>Pasa el cursor</strong> sobre la línea donde quieres añadir una nota.</li>
                        <li><strong>Espera unos segundos</strong> hasta que aparezca un botón con un <code className="bg-gray-700 px-1 rounded">+</code>.</li>
                        <li><strong>Haz clic en el botón <code className="bg-gray-700 px-1 rounded">+</code></strong> para abrir una pequeña ventana y escribir tu anotación.</li>
                      </ol>
                      <p className="mt-4 text-sm text-gray-400">Las anotaciones se guardan localmente y son perfectas para añadir recordatorios o ideas rápidas mientras estudias.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
