// Parser y utilidades para wikilinks [[...]]

export interface WikiLink {
  text: string;
  start: number;
  end: number;
}

// Extraer todos los wikilinks de un texto Markdown
export function extractWikiLinks(content: string): WikiLink[] {
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
  const links: WikiLink[] = [];
  let match;

  while ((match = wikiLinkRegex.exec(content)) !== null) {
    links.push({
      text: match[1].trim(),
      start: match.index,
      end: match.index + match[0].length
    });
  }

  return links;
}

// Convertir wikilinks a enlaces HTML para preview
export function renderWikiLinks(content: string): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (match, linkText) => {
    const cleanText = linkText.trim();
    return `<a href="wikilink:${cleanText}">${cleanText}</a>`;
  });
}

// Buscar nota por título exacto o similar
export async function findNoteByTitle(supabase: any, userId: string, title: string) {
  // Primero buscar coincidencia exacta
  const { data: exactMatch } = await supabase
    .from("notes")
    .select("id, title")
    .eq("owner_id", userId)
    .ilike("title", title)
    .limit(1);

  if (exactMatch && exactMatch.length > 0) {
    return exactMatch[0];
  }

  // Si no hay coincidencia exacta, buscar similar
  const { data: similarMatch } = await supabase
    .from("notes")
    .select("id, title")
    .eq("owner_id", userId)
    .ilike("title", `%${title}%`)
    .limit(1);

  return similarMatch && similarMatch.length > 0 ? similarMatch[0] : null;
}

// Buscar notas que coincidan con un término de wikilink
export function findNotesByTitle(notes: any[], searchTerm: string): any[] {
  const term = searchTerm.toLowerCase();
  return notes.filter(note => 
    note.title.toLowerCase().includes(term) ||
    note.title.toLowerCase() === term
  );
}

// Generar sugerencias de wikilinks mientras se escribe
export function generateWikiLinkSuggestions(
  currentText: string,
  cursorPosition: number,
  availableNotes: any[]
): { suggestions: any[], range: { start: number, end: number } } | null {
  // Buscar si estamos dentro de un wikilink parcial
  const beforeCursor = currentText.slice(0, cursorPosition);
  const afterCursor = currentText.slice(cursorPosition);
  
  // Buscar el inicio de un wikilink incompleto
  const startMatch = beforeCursor.match(/\[\[([^\]]*?)$/);
  if (!startMatch) return null;
  
  const partialText = startMatch[1];
  const startPos = cursorPosition - partialText.length;
  
  // Buscar el final (si existe ]])
  const endMatch = afterCursor.match(/^([^\]]*?)\]\]/);
  const endPos = endMatch ? cursorPosition + endMatch[1].length : cursorPosition;
  
  // Filtrar notas que coincidan
  const suggestions = availableNotes.filter(note =>
    note.title.toLowerCase().includes(partialText.toLowerCase())
  ).slice(0, 5); // Máximo 5 sugerencias
  
  return {
    suggestions,
    range: { start: startPos, end: endPos }
  };
}

// Actualizar enlaces de una nota en la base de datos
export async function updateNoteLinks(noteId: string, wikilinks: WikiLink[], userId: string) {
  const { supabase } = await import("@/lib/supabaseClient");
  
  try {
    // Primero eliminar enlaces existentes (solo si la nota existe)
    const { data: noteExists } = await supabase
      .from("notes")
      .select("id")
      .eq("id", noteId)
      .single();
    
    if (noteExists) {
      await supabase
        .from("note_links")
        .delete()
        .eq("from_note_id", noteId);
    }

    // Insertar nuevos enlaces (solo si existen notas destino)
    if (wikilinks.length > 0) {
      for (const link of wikilinks) {
        // Buscar nota destino por título
        const { data: targetNote } = await supabase
          .from("notes")
          .select("id")
          .eq("owner_id", userId)
          .eq("title", link.text)
          .single();

        if (targetNote) {
          await supabase
            .from("note_links")
            .insert({
              from_note_id: noteId,
              to_note_id: targetNote.id,
              anchor_text: link.text
            });
        }
      }
    }
  } catch (error) {
    console.error("Error updating note links:", error);
  }
}
