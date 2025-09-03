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
        back_image_name: flashcard.back_image_name
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
    const { data } = await supabase
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
            created_at
          )
        )
      `)
      .eq('note_id', noteId);

    if (!data || data.length === 0) return [];

    const flashcards: Flashcard[] = [];
    data.forEach((link: any) => {
      if (link.decks && Array.isArray(link.decks.cards)) {
        flashcards.push(...link.decks.cards);
      }
    });

    return flashcards;
  } catch (error) {
    console.error('Error obteniendo flashcards:', error);
    return [];
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
