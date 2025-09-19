import { supabase } from '../supabaseClient';

// Función para subir imagen a Supabase Storage
export async function uploadFlashcardImage(file: File, cardId: string, type: 'front' | 'back'): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${cardId}_${type}_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('flashcard-images')
      .upload(fileName, file);

    if (error) throw error;

    const { data: publicUrl } = supabase.storage
      .from('flashcard-images')
      .getPublicUrl(fileName);

    return publicUrl.publicUrl;
  } catch (error) {
    console.error('Error subiendo imagen:', error);
    return null;
  }
}

// Función para eliminar imagen de Supabase Storage
export async function deleteFlashcardImage(imageUrl: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Extraer el path de la URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `${user.id}/${fileName}`;

    const { error } = await supabase.storage
      .from('flashcard-images')
      .remove([filePath]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error eliminando imagen:', error);
    return false;
  }
}

export interface Flashcard {
  id?: string;
  front: string;
  back: string;
  deck_id?: string;
  front_image_url?: string;
  back_image_url?: string;
  front_image_name?: string;
  back_image_name?: string;
  created_at?: string;
  // Campos para flashcards de opción múltiple
  type?: 'traditional' | 'multiple_choice';
  question?: string;
  options?: string; // JSON string de las opciones
  correct_answers?: string; // JSON string de las respuestas correctas
}

export interface Deck {
  id?: string;
  name: string;
  owner_id: string;
  is_public: boolean;
  created_at?: string;
}

export interface NoteDeckLink {
  id?: string;
  note_id: string;
  deck_id: string;
  created_at?: string;
}

// Crear o obtener deck para una nota específica
export async function getOrCreateDeckForNote(noteId: string, noteTitle: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Buscar si ya existe un deck para esta nota
    const { data: existingLink } = await supabase
      .from('note_deck_links')
      .select('deck_id, decks(*)')
      .eq('note_id', noteId)
      .single();

    if (existingLink?.deck_id) {
      return existingLink.deck_id;
    }

    // Crear nuevo deck
    const deckName = `Flashcards: ${noteTitle}`;
    const { data: newDeck, error: deckError } = await supabase
      .from('decks')
      .insert({
        name: deckName,
        owner_id: user.id,
        is_public: false
      })
      .select()
      .single();

    if (deckError) throw deckError;

    // Crear link entre nota y deck
    const { error: linkError } = await supabase
      .from('note_deck_links')
      .insert({
        note_id: noteId,
        deck_id: newDeck.id
      });

    if (linkError) throw linkError;

    return newDeck.id;
  } catch (error) {
    console.error('Error creando/obteniendo deck:', error);
    return null;
  }
}

// Guardar flashcard en base de datos
export async function saveFlashcard(flashcard: Flashcard, deckId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cards')
      .insert({
        deck_id: deckId,
        front: flashcard.front,
        back: flashcard.back,
        front_image_url: flashcard.front_image_url,
        back_image_url: flashcard.back_image_url,
        front_image_name: flashcard.front_image_name,
        back_image_name: flashcard.back_image_name,
        type: flashcard.type || 'traditional',
        question: flashcard.question,
        options: flashcard.options,
        correct_answers: flashcard.correct_answers
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error guardando flashcard:', error);
    return false;
  }
}

// Obtener flashcards de una nota
export async function getFlashcardsForNote(noteId: string): Promise<Flashcard[]> {
  try {
    console.log('🔍 Buscando flashcards para noteId:', noteId);
    
    const { data, error } = await supabase
      .from('note_deck_links')
      .select(`
        deck_id,
        decks!inner (
          cards (
            id,
            front,
            back,
            front_image_url,
            back_image_url,
            front_image_name,
            back_image_name,
            created_at,
            type,
            question,
            options,
            correct_answers
          )
        )
      `)
      .eq('note_id', noteId);

    if (error) {
      console.error('❌ Error en consulta de flashcards:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('📊 Datos de flashcards recibidos:', data);

    if (!data || data.length === 0) {
      console.log('📭 No se encontraron flashcards para esta nota');
      return [];
    }

    const flashcards: Flashcard[] = [];
    data.forEach((link: any) => {
      if (link.decks && Array.isArray(link.decks.cards)) {
        flashcards.push(...link.decks.cards);
      }
    });

    console.log('✅ Flashcards procesadas:', flashcards.length);
    return flashcards;
  } catch (error) {
    console.error('💥 Error obteniendo flashcards:', error);
    throw error; // Re-lanzar el error para que se maneje arriba
  }
}

// Obtener flashcards de múltiples notas (para estudio por carpeta)
export async function getFlashcardsForNotes(noteIds: string[]): Promise<Flashcard[]> {
  try {
    const { data } = await supabase
      .from('note_deck_links')
      .select(`
        deck_id,
        note_id,
        decks!inner (
          cards (
            id,
            front,
            back,
            created_at
          )
        )
      `)
      .in('note_id', noteIds);

    if (!data || data.length === 0) return [];

    const flashcards: Flashcard[] = [];
    data.forEach((link: any) => {
      if (link.decks && Array.isArray(link.decks.cards)) {
        flashcards.push(...link.decks.cards);
      }
    });

    return flashcards;
  } catch (error) {
    console.error('Error obteniendo flashcards de múltiples notas:', error);
    return [];
  }
}

// Obtener todas las notas de una carpeta y sus subcarpetas recursivamente
export async function getAllNotesFromFolderRecursive(folderId: string | null, userId: string): Promise<string[]> {
  try {
    const noteIds: string[] = [];
    
    // Función recursiva para obtener notas de una carpeta y sus subcarpetas
    const collectNotesFromFolder = async (currentFolderId: string | null): Promise<void> => {
      // Obtener notas directas de esta carpeta
      const { data: notes } = await supabase
        .from('notes')
        .select('id')
        .eq('owner_id', userId)
        .eq('folder_id', currentFolderId);
      
      if (notes) {
        noteIds.push(...notes.map(n => n.id));
      }
      
      // Obtener subcarpetas y procesar recursivamente
      const { data: subfolders } = await supabase
        .from('folders')
        .select('id')
        .eq('owner_id', userId)
        .eq('parent_folder_id', currentFolderId);
      
      if (subfolders) {
        for (const subfolder of subfolders) {
          await collectNotesFromFolder(subfolder.id);
        }
      }
    };
    
    await collectNotesFromFolder(folderId);
    return noteIds;
  } catch (error) {
    console.error('Error obteniendo notas recursivamente:', error);
    return [];
  }
}

// Obtener flashcards de una carpeta y todas sus subcarpetas
export async function getFlashcardsForFolderRecursive(folderId: string | null, userId: string): Promise<Flashcard[]> {
  try {
    const noteIds = await getAllNotesFromFolderRecursive(folderId, userId);
    if (noteIds.length === 0) return [];
    
    return await getFlashcardsForNotes(noteIds);
  } catch (error) {
    console.error('Error obteniendo flashcards de carpeta recursiva:', error);
    return [];
  }
}

// Eliminar flashcard
export async function deleteFlashcard(flashcardId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', flashcardId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error eliminando flashcard:', error);
    return false;
  }
}

// Eliminar múltiples flashcards
export async function deleteFlashcards(flashcardIds: string[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cards')
      .delete()
      .in('id', flashcardIds);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error eliminando flashcards:', error);
    return false;
  }
}

// Actualizar flashcard
export async function updateFlashcard(
  flashcardId: string, 
  front: string, 
  back: string,
  frontImageUrl?: string,
  backImageUrl?: string,
  frontImageName?: string,
  backImageName?: string
): Promise<boolean> {
  try {
    const updateData: any = { front, back };
    
    if (frontImageUrl !== undefined) updateData.front_image_url = frontImageUrl;
    if (backImageUrl !== undefined) updateData.back_image_url = backImageUrl;
    if (frontImageName !== undefined) updateData.front_image_name = frontImageName;
    if (backImageName !== undefined) updateData.back_image_name = backImageName;

    const { error } = await supabase
      .from('cards')
      .update(updateData)
      .eq('id', flashcardId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error actualizando flashcard:', error);
    return false;
  }
}

// Contar flashcards de una nota
export async function countFlashcardsForNote(noteId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('note_deck_links')
      .select(`
        decks!inner (
          cards (
            id
          )
        )
      `)
      .eq('note_id', noteId);

    if (!data || data.length === 0) return 0;

    let total = 0;
    data.forEach((link: any) => {
      if (link.decks && Array.isArray(link.decks.cards)) {
        total += link.decks.cards.length;
      }
    });

    return total;
  } catch (error) {
    console.error('Error contando flashcards:', error);
    return 0;
  }
}

// Contar flashcards por tipo para una nota
export async function countFlashcardsByType(noteId: string): Promise<{
  traditional: number;
  multipleChoice: number;
  total: number;
}> {
  try {
    const { data } = await supabase
      .from('note_deck_links')
      .select(`
        decks!inner (
          cards (
            id,
            type
          )
        )
      `)
      .eq('note_id', noteId);

    if (!data || data.length === 0) {
      return { traditional: 0, multipleChoice: 0, total: 0 };
    }

    let traditional = 0;
    let multipleChoice = 0;

    data.forEach((link: any) => {
      if (link.decks && Array.isArray(link.decks.cards)) {
        link.decks.cards.forEach((card: any) => {
          if (card.type === 'multiple_choice') {
            multipleChoice++;
          } else {
            traditional++;
          }
        });
      }
    });

    return {
      traditional,
      multipleChoice,
      total: traditional + multipleChoice
    };
  } catch (error) {
    console.error('Error contando flashcards por tipo:', error);
    return { traditional: 0, multipleChoice: 0, total: 0 };
  }
}

// Importar tipos de múltiple choice
import { MultipleChoiceQuestion, MultipleChoiceOption } from './multipleChoiceParser';

// Guardar flashcards de opción múltiple en lote
export async function saveMultipleChoiceFlashcards(
  questions: MultipleChoiceQuestion[], 
  deckId: string
): Promise<boolean> {
  try {
    const flashcards = questions.map(question => ({
      deck_id: deckId,
      front: question.question,
      back: `Respuesta${question.correctAnswers.length > 1 ? 's' : ''}: ${question.correctAnswers.join(', ')}`,
      type: 'multiple_choice' as const,
      question: question.question,
      options: JSON.stringify(question.options),
      correct_answers: JSON.stringify(question.correctAnswers)
    }));

    const { error } = await supabase
      .from('cards')
      .insert(flashcards);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error guardando flashcards de opción múltiple:', error);
    return false;
  }
}

// Convertir flashcard de BD a MultipleChoiceQuestion
export function flashcardToMultipleChoice(flashcard: Flashcard): MultipleChoiceQuestion | null {
  if (flashcard.type !== 'multiple_choice' || !flashcard.options || !flashcard.correct_answers) {
    return null;
  }

  try {
    const options: MultipleChoiceOption[] = JSON.parse(flashcard.options);
    const correctAnswers: string[] = JSON.parse(flashcard.correct_answers);

    return {
      id: flashcard.id || `mc_${Date.now()}`,
      question: flashcard.question || flashcard.front,
      options,
      correctAnswers,
      questionNumber: 1 // Se puede ajustar según el contexto
    };
  } catch (error) {
    console.error('Error parseando flashcard de opción múltiple:', error);
    return null;
  }
}

// Obtener flashcards separadas por tipo
export async function getFlashcardsByType(noteId: string): Promise<{
  traditional: Flashcard[];
  multipleChoice: Flashcard[];
}> {
  try {
    const allFlashcards = await getFlashcardsForNote(noteId);
    
    const traditional = allFlashcards.filter(card => card.type !== 'multiple_choice');
    const multipleChoice = allFlashcards.filter(card => card.type === 'multiple_choice');

    return { traditional, multipleChoice };
  } catch (error) {
    console.error('Error obteniendo flashcards por tipo:', error);
    return { traditional: [], multipleChoice: [] };
  }
}
