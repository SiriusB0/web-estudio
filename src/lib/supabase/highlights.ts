import { supabase } from '../supabaseClient';

export interface HighlightRecord {
  id: string;
  doc_id: string;
  user_id: string;
  selector_exact: string;
  selector_prefix?: string;
  selector_suffix?: string;
  note_text: string;
  color: string;
  created_at: string;
  updated_at: string;
  images?: string | { [key: string]: any }; // JSON string or object
}

export interface CreateHighlightData {
  doc_id: string;
  selector_exact: string;
  selector_prefix?: string;
  selector_suffix?: string;
  note_text?: string;
  color?: string;
}

export interface UpdateHighlightData {
  note_text?: string;
  color?: string;
  images?: string;
}

// Obtener highlights por documento
export async function getHighlightsByDoc(docId: string): Promise<HighlightRecord[]> {
  console.log('🔍 Fetching highlights for docId:', docId);
  
  const { data, error } = await supabase
    .from('study_highlights')
    .select('*')
    .eq('doc_id', docId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('💥 Error fetching highlights:', error);
    throw error;
  }

  console.log('✅ Highlights fetched from DB:', data);
  return data || [];
}

// Crear nuevo highlight
export async function createHighlight(highlightData: CreateHighlightData): Promise<HighlightRecord> {
  console.log('➕ Creating highlight in DB:', highlightData);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('❌ User not authenticated');
    throw new Error('Usuario no autenticado');
  }

  console.log('👤 Authenticated user:', user.id);

  const insertData = {
    doc_id: highlightData.doc_id,
    selector_exact: highlightData.selector_exact,
    selector_prefix: highlightData.selector_prefix || '',
    selector_suffix: highlightData.selector_suffix || '',
    user_id: user.id,
    note_text: highlightData.note_text || '',
    color: highlightData.color || '#facc15'
  };

  console.log('📝 Insert data:', insertData);

  const { data, error } = await supabase
    .from('study_highlights')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('💥 Error creating highlight:', error);
    throw error;
  }

  console.log('✅ Highlight created in DB:', data);
  return data;
}

// Actualizar highlight
export async function updateHighlight(id: string, updates: UpdateHighlightData): Promise<HighlightRecord> {
  const { data, error } = await supabase
    .from('study_highlights')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating highlight:', error);
    throw error;
  }

  return data;
}

// Eliminar highlight
export async function deleteHighlight(id: string): Promise<void> {
  const { error } = await supabase
    .from('study_highlights')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting highlight:', error);
    throw error;
  }
}

// Suscribirse a cambios en tiempo real
export function subscribeToHighlights(docId: string, callback: (highlights: HighlightRecord[]) => void) {
  const channel = supabase
    .channel(`highlights:${docId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'study_highlights',
        filter: `doc_id=eq.${docId}`
      },
      async () => {
        // Recargar highlights cuando hay cambios
        try {
          const highlights = await getHighlightsByDoc(docId);
          callback(highlights);
        } catch (error) {
          console.error('Error reloading highlights:', error);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
