import { useState, useEffect, useCallback } from 'react';
import { 
  HighlightRecord, 
  getHighlightsByDoc, 
  createHighlight, 
  updateHighlight, 
  deleteHighlight,
  subscribeToHighlights,
  CreateHighlightData,
  UpdateHighlightData
} from '../lib/supabase/highlights';

export function useStudyHighlights(docId: string) {
  const [highlights, setHighlights] = useState<HighlightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar highlights iniciales
  useEffect(() => {
    if (!docId) {
      console.log('❌ useStudyHighlights: No docId provided');
      return;
    }

    console.log('📚 useStudyHighlights: Loading highlights for docId:', docId);

    const loadHighlights = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('🔄 Fetching highlights from Supabase...');
        const data = await getHighlightsByDoc(docId);
        console.log('✅ Highlights loaded:', data);
        setHighlights(data);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error loading highlights';
        console.error('💥 Error loading highlights:', err);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    loadHighlights();
  }, [docId]);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!docId) {
      console.log('❌ No docId for real-time subscription');
      return;
    }

    console.log('🔔 Setting up real-time subscription for docId:', docId);
    const unsubscribe = subscribeToHighlights(docId, (updatedHighlights) => {
      console.log('🔔 Real-time update received:', updatedHighlights);
      setHighlights(updatedHighlights);
    });

    return () => {
      console.log('🔔 Cleaning up real-time subscription');
      unsubscribe();
    };
  }, [docId]);

  // Crear nuevo highlight
  const handleCreateHighlight = useCallback(async (selector: any, range: Range) => {
    const highlightData: CreateHighlightData = {
      doc_id: docId,
      selector_exact: selector.exact,
      selector_prefix: selector.prefix,
      selector_suffix: selector.suffix,
      note_text: '',
      color: '#facc15'
    };
    
    console.log('➕ Creating new highlight:', highlightData);
    try {
      setError(null);
      const newHighlight = await createHighlight(highlightData);
      console.log('✅ Highlight created successfully:', newHighlight);
      
      // Optimistic update
      setHighlights(prev => {
        const updated = [...prev, newHighlight];
        console.log('📝 Updated highlights state:', updated);
        return updated;
      });
      
      return newHighlight;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error creating highlight';
      console.error('💥 Error creating highlight:', err);
      setError(errorMsg);
      throw err;
    }
  }, []);

  // Actualizar highlight
  const handleUpdateHighlight = useCallback(async (id: string, updates: UpdateHighlightData) => {
    try {
      setError(null);
      const updatedHighlight = await updateHighlight(id, updates);
      
      // Optimistic update
      setHighlights(prev => 
        prev.map(h => h.id === id ? updatedHighlight : h)
      );
      
      return updatedHighlight;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating highlight');
      console.error('Error updating highlight:', err);
      throw err;
    }
  }, []);

  // Eliminar highlight
  const handleDeleteHighlight = useCallback(async (id: string) => {
    try {
      setError(null);
      await deleteHighlight(id);
      
      // Optimistic update
      setHighlights(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting highlight');
      console.error('Error deleting highlight:', err);
      throw err;
    }
  }, []);

  return {
    highlights,
    loading,
    error,
    createHighlight: handleCreateHighlight,
    updateHighlight: handleUpdateHighlight,
    deleteHighlight: handleDeleteHighlight
  };
}
