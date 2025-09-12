import { Flashcard } from './flashcards';

export interface ExamFlashcard extends Flashcard {
  examIndex: number;
  userAnswer?: string | string[];
  isCorrect?: boolean;
  timeSpent?: number;
}

export interface ExamResult {
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  timeUsed: number;
  timeLimit: number;
  score: number;
  flashcards: ExamFlashcard[];
}

// Función para seleccionar flashcards aleatorias mezcladas
export function selectRandomFlashcards(
  allFlashcards: Flashcard[], 
  count: number
): ExamFlashcard[] {
  // Crear una copia del array para no modificar el original
  const shuffled = [...allFlashcards];
  
  // Algoritmo Fisher-Yates para mezclar
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Tomar solo la cantidad solicitada y agregar índice de examen
  return shuffled.slice(0, count).map((flashcard, index) => ({
    ...flashcard,
    examIndex: index
  }));
}

// Función para calcular el resultado del examen
export function calculateExamResult(
  flashcards: ExamFlashcard[],
  timeUsed: number,
  timeLimit: number
): ExamResult {
  console.log('calculateExamResult - Input flashcards:', flashcards.map(f => ({
    id: f.id,
    type: f.type,
    userAnswer: f.userAnswer,
    isCorrect: f.isCorrect,
    correct_answers: f.correct_answers
  })));

  const totalQuestions = flashcards.length;
  
  // Recalcular isCorrect para cada flashcard para asegurar precisión
  const processedFlashcards = flashcards.map(card => {
    if (card.userAnswer !== undefined && card.userAnswer !== null) {
      const recalculatedIsCorrect = checkAnswer(card, card.userAnswer);
      console.log(`Card ${card.id} - Recalculated:`, {
        userAnswer: card.userAnswer,
        originalIsCorrect: card.isCorrect,
        recalculatedIsCorrect,
        type: card.type
      });
      
      return {
        ...card,
        isCorrect: recalculatedIsCorrect
      };
    }
    return card;
  });

  const answeredQuestions = processedFlashcards.filter(card => 
    card.userAnswer !== undefined && card.userAnswer !== null
  ).length;
  
  const correctAnswers = processedFlashcards.filter(card => card.isCorrect === true).length;
  const incorrectAnswers = processedFlashcards.filter(card => 
    card.userAnswer !== undefined && card.userAnswer !== null && card.isCorrect === false
  ).length;
  
  const unansweredQuestions = totalQuestions - answeredQuestions;
  const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  const result = {
    totalQuestions,
    answeredQuestions,
    correctAnswers,
    incorrectAnswers,
    unansweredQuestions,
    timeUsed,
    timeLimit,
    score,
    flashcards: processedFlashcards
  };

  console.log('calculateExamResult - Final result:', result);
  return result;
}

// Función para formatear tiempo en mm:ss
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Función para verificar si una respuesta es correcta
export function checkAnswer(flashcard: Flashcard, userAnswer: string | string[]): boolean {
  console.log('checkAnswer called with:', {
    flashcardId: flashcard.id,
    type: flashcard.type,
    userAnswer,
    correctAnswers: flashcard.correct_answers
  });

  if (flashcard.type === 'multiple_choice') {
    try {
      const correctAnswers = flashcard.correct_answers ? JSON.parse(flashcard.correct_answers) : [];
      const userAnswers = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
      
      // Normalizar arrays para comparación
      const sortedCorrect = [...correctAnswers].sort();
      const sortedUser = [...userAnswers].sort();
      
      const isCorrect = sortedCorrect.length === sortedUser.length && 
                       sortedCorrect.every((answer: string, index: number) => answer === sortedUser[index]);
      
      console.log('Multiple choice evaluation:', {
        correctAnswers,
        userAnswers,
        sortedCorrect,
        sortedUser,
        isCorrect
      });
      
      return isCorrect;
    } catch (error) {
      console.error('Error parsing correct_answers:', error);
      return false;
    }
  } else {
    // Para flashcards tradicionales
    const isCorrect = userAnswer === 'correct';
    console.log('Traditional flashcard evaluation:', {
      userAnswer,
      isCorrect
    });
    return isCorrect;
  }
}
