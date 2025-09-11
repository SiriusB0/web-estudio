export interface MultipleChoiceOption {
  letter: string;
  text: string;
}

export interface MultipleChoiceQuestion {
  id: string;
  question: string;
  options: MultipleChoiceOption[];
  correctAnswers: string[];
  questionNumber: number;
}

export interface ParseResult {
  questions: MultipleChoiceQuestion[];
  errors: string[];
}

/**
 * Parser para convertir texto con formato específico en preguntas de opción múltiple
 * 
 * Formato esperado:
 * Pregunta X: ¿Texto de la pregunta?
 * a) Opción A
 * b) Opción B
 * c) Opción C
 * Respuesta: a
 * 
 * Para múltiples respuestas: Respuesta: a,c
 */
export function parseMultipleChoiceText(text: string): ParseResult {
  const questions: MultipleChoiceQuestion[] = [];
  const errors: string[] = [];
  
  if (!text.trim()) {
    return { questions, errors: ['El texto está vacío'] };
  }

  // Preprocesar el texto para manejar código multilínea
  const processedText = preprocessText(text);
  
  // Dividir el texto en bloques de preguntas usando un enfoque más inteligente
  const questionBlocks = extractQuestionBlocks(processedText);

  if (questionBlocks.length === 0) {
    return { questions, errors: ['No se encontraron preguntas válidas'] };
  }

  questionBlocks.forEach((block, blockIndex) => {
    try {
      const question = parseQuestionBlock(block, blockIndex + 1);
      if (question) {
        questions.push(question);
      }
    } catch (error) {
      errors.push(`Error en bloque ${blockIndex + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  });

  return { questions, errors };
}

/**
 * Preprocesa el texto para normalizar saltos de línea únicamente
 */
function preprocessText(text: string): string {
  // Solo normalizar saltos de línea, preservar todo lo demás
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Extrae bloques de preguntas preservando formato original
 */
function extractQuestionBlocks(text: string): string[] {
  const lines = text.split('\n');
  const blocks: string[] = [];
  let currentBlock: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    const trimmedLine = originalLine.trim();
    
    // Si encontramos una nueva pregunta y ya tenemos un bloque, guardarlo
    if (trimmedLine.match(/^Pregunta\s+\d+:/i) && currentBlock.length > 0) {
      blocks.push(currentBlock.join('\n'));
      currentBlock = [originalLine];
    } 
    // Si es el inicio de la primera pregunta
    else if (trimmedLine.match(/^Pregunta\s+\d+:/i)) {
      currentBlock = [originalLine];
    }
    // Si estamos dentro de un bloque, agregar la línea ORIGINAL
    else if (currentBlock.length > 0) {
      currentBlock.push(originalLine);
    }
  }
  
  // Agregar el último bloque si existe
  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join('\n'));
  }
  
  return blocks.filter(block => block.trim().length > 0);
}

function parseQuestionBlock(block: string, blockNumber: number): MultipleChoiceQuestion | null {
  const lines = block.split('\n');
  
  // Encontrar la línea de la pregunta
  let questionLineIndex = -1;
  let questionMatch = null;
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const match = trimmed.match(/^Pregunta\s+(\d+):\s*(.*)$/i);
    if (match) {
      questionLineIndex = i;
      questionMatch = match;
      break;
    }
  }
  
  if (!questionMatch) {
    throw new Error('No se encontró línea de pregunta válida');
  }

  const questionNumber = parseInt(questionMatch[1]);
  let questionText = questionMatch[2].trim();

  // Recopilar todas las líneas hasta encontrar la primera opción
  let currentIndex = questionLineIndex + 1;
  const questionLines: string[] = [];
  
  // Si hay texto después de los dos puntos en la misma línea, agregarlo
  if (questionText) {
    questionLines.push(questionText);
  }
  
  // Buscar líneas adicionales hasta encontrar opciones
  while (currentIndex < lines.length) {
    const line = lines[currentIndex];
    const trimmed = line.trim();
    
    // Si encontramos una opción, parar
    if (trimmed.match(/^[a-z]\)/i)) {
      break;
    }
    
    // Si encontramos respuesta, parar
    if (trimmed.toLowerCase().startsWith('respuesta:')) {
      break;
    }
    
    // Agregar la línea ORIGINAL (con espacios) a la pregunta
    if (trimmed.length > 0 || questionLines.length > 0) {
      questionLines.push(line);
    }
    
    currentIndex++;
  }
  
  // Unir todas las líneas de la pregunta preservando formato
  const finalQuestionText = questionLines.join('\n').trim();
  
  if (!finalQuestionText) {
    throw new Error('El texto de la pregunta está vacío');
  }

  // Parsear opciones
  const options: MultipleChoiceOption[] = [];
  
  while (currentIndex < lines.length) {
    const line = lines[currentIndex].trim();
    
    // Si llegamos a la respuesta, parar
    if (line.toLowerCase().startsWith('respuesta:')) {
      break;
    }
    
    // Parsear opción
    const optionMatch = line.match(/^([a-z])\)\s*(.+)$/i);
    if (optionMatch) {
      const letter = optionMatch[1].toLowerCase();
      const text = optionMatch[2].trim();
      if (text) {
        options.push({ letter, text });
      }
    }
    
    currentIndex++;
  }

  if (options.length < 2) {
    throw new Error('Debe haber al menos 2 opciones');
  }

  // Buscar respuesta
  let responseLine = '';
  while (currentIndex < lines.length) {
    const line = lines[currentIndex].trim();
    if (line.toLowerCase().startsWith('respuesta:')) {
      responseLine = line;
      break;
    }
    currentIndex++;
  }

  if (!responseLine) {
    throw new Error('Falta la línea de respuesta');
  }

  const responseMatch = responseLine.match(/^respuesta:\s*([a-z,\s]+)$/i);
  if (!responseMatch) {
    throw new Error('Formato de respuesta inválido');
  }

  const correctAnswers = responseMatch[1]
    .toLowerCase()
    .split(',')
    .map(answer => answer.trim())
    .filter(answer => answer.length > 0);

  if (correctAnswers.length === 0) {
    throw new Error('No se especificaron respuestas correctas');
  }

  // Validar respuestas
  const validLetters = options.map(opt => opt.letter);
  const invalidAnswers = correctAnswers.filter(answer => !validLetters.includes(answer));
  
  if (invalidAnswers.length > 0) {
    throw new Error(`Respuestas inválidas: ${invalidAnswers.join(', ')}`);
  }

  return {
    id: `mc_${Date.now()}_${blockNumber}`,
    question: finalQuestionText,
    options,
    correctAnswers,
    questionNumber
  };
}

/**
 * Validar formato de texto antes de procesar
 */
export function validateMultipleChoiceFormat(text: string): { isValid: boolean; errors: string[] } {
  const result = parseMultipleChoiceText(text);
  return {
    isValid: result.errors.length === 0 && result.questions.length > 0,
    errors: result.errors
  };
}

/**
 * Generar texto de ejemplo para mostrar al usuario
 */
export function getExampleText(): string {
  return `Pregunta 1: ¿Cuál es la capital de Francia?
a) Madrid
b) París
c) Roma
d) Londres
Respuesta: b

Pregunta 2: ¿Cuáles son números pares?
a) 1
b) 2
c) 3
d) 4
e) 5
Respuesta: b,d

Pregunta 3: ¿Qué lenguajes de programación son orientados a objetos?
a) JavaScript
b) Python
c) HTML
d) Java
Respuesta: a,b,d`;
}
