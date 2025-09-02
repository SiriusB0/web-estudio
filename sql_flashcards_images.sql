-- ===============================================
-- ACTUALIZACIÓN FLASHCARDS CON SOPORTE PARA IMÁGENES
-- ===============================================
-- Este script agrega soporte para imágenes en flashcards
-- sin romper la funcionalidad existente
-- ===============================================

-- ========== ACTUALIZAR TABLA CARDS ==========
-- Agregar columnas para imágenes en front y back
ALTER TABLE public.cards 
ADD COLUMN IF NOT EXISTS front_image_url TEXT,
ADD COLUMN IF NOT EXISTS back_image_url TEXT,
ADD COLUMN IF NOT EXISTS front_image_name TEXT,
ADD COLUMN IF NOT EXISTS back_image_name TEXT;

-- ========== CREAR TABLA PARA METADATOS DE IMÁGENES ==========
CREATE TABLE IF NOT EXISTS public.flashcard_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_name TEXT NOT NULL,
  image_type VARCHAR(10) NOT NULL CHECK (image_type IN ('front', 'back')),
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.flashcard_images ENABLE ROW LEVEL SECURITY;

-- ========== ÍNDICES PARA IMÁGENES ==========
CREATE INDEX IF NOT EXISTS idx_flashcard_images_card_id ON public.flashcard_images(card_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_images_uploaded_by ON public.flashcard_images(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_flashcard_images_type ON public.flashcard_images(image_type);

-- ========== POLÍTICAS RLS PARA IMÁGENES ==========
DROP POLICY IF EXISTS "flashcard_images: select own" ON public.flashcard_images;
DROP POLICY IF EXISTS "flashcard_images: insert own" ON public.flashcard_images;
DROP POLICY IF EXISTS "flashcard_images: update own" ON public.flashcard_images;
DROP POLICY IF EXISTS "flashcard_images: delete own" ON public.flashcard_images;

CREATE POLICY "flashcard_images: select own" ON public.flashcard_images FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cards 
    JOIN public.decks ON cards.deck_id = decks.id
    WHERE cards.id = flashcard_images.card_id 
    AND decks.owner_id = auth.uid()
  )
);

CREATE POLICY "flashcard_images: insert own" ON public.flashcard_images FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cards 
    JOIN public.decks ON cards.deck_id = decks.id
    WHERE cards.id = flashcard_images.card_id 
    AND decks.owner_id = auth.uid()
  )
);

CREATE POLICY "flashcard_images: update own" ON public.flashcard_images FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cards 
    JOIN public.decks ON cards.deck_id = decks.id
    WHERE cards.id = flashcard_images.card_id 
    AND decks.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cards 
    JOIN public.decks ON cards.deck_id = decks.id
    WHERE cards.id = flashcard_images.card_id 
    AND decks.owner_id = auth.uid()
  )
);

CREATE POLICY "flashcard_images: delete own" ON public.flashcard_images FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cards 
    JOIN public.decks ON cards.deck_id = decks.id
    WHERE cards.id = flashcard_images.card_id 
    AND decks.owner_id = auth.uid()
  )
);

-- ========== CONFIGURAR STORAGE PARA IMÁGENES ==========
-- Crear bucket para imágenes de flashcards si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('flashcard-images', 'flashcard-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para el bucket de imágenes
DROP POLICY IF EXISTS "flashcard_images_bucket_select" ON storage.objects;
DROP POLICY IF EXISTS "flashcard_images_bucket_insert" ON storage.objects;
DROP POLICY IF EXISTS "flashcard_images_bucket_update" ON storage.objects;
DROP POLICY IF EXISTS "flashcard_images_bucket_delete" ON storage.objects;

CREATE POLICY "flashcard_images_bucket_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'flashcard-images');

CREATE POLICY "flashcard_images_bucket_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'flashcard-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "flashcard_images_bucket_update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'flashcard-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "flashcard_images_bucket_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'flashcard-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ========== FUNCIÓN PARA LIMPIAR IMÁGENES HUÉRFANAS ==========
CREATE OR REPLACE FUNCTION cleanup_orphaned_flashcard_images()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Eliminar registros de imágenes sin card asociado
  DELETE FROM public.flashcard_images 
  WHERE card_id NOT IN (SELECT id FROM public.cards);
  
  -- Nota: Las imágenes en storage se pueden limpiar manualmente si es necesario
END;
$$;

-- ========== COMENTARIOS ==========
COMMENT ON TABLE public.flashcard_images IS 'Metadatos de imágenes asociadas a flashcards';
COMMENT ON COLUMN public.cards.front_image_url IS 'URL de imagen para el frente de la flashcard';
COMMENT ON COLUMN public.cards.back_image_url IS 'URL de imagen para el reverso de la flashcard';
COMMENT ON COLUMN public.cards.front_image_name IS 'Nombre original de la imagen del frente';
COMMENT ON COLUMN public.cards.back_image_name IS 'Nombre original de la imagen del reverso';
