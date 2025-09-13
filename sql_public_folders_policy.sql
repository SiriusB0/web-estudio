-- ===============================================
-- POLÍTICAS RLS PARA CARPETAS PÚBLICAS
-- ===============================================
-- Este script permite que usuarios normales vean carpetas públicas
-- de otros usuarios (admins) para el sistema de biblioteca pública
-- ===============================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "folders: select public folders" ON public.folders;
DROP POLICY IF EXISTS "notes: select from public folders" ON public.notes;
DROP POLICY IF EXISTS "decks: select from public folders" ON public.decks;
DROP POLICY IF EXISTS "decks: select public decks" ON public.decks;
DROP POLICY IF EXISTS "cards: select from public folders" ON public.cards;
DROP POLICY IF EXISTS "cards: select from public decks" ON public.cards;
DROP POLICY IF EXISTS "note_deck_links: select from public folders" ON public.note_deck_links;

-- Política para permitir SELECT de carpetas públicas a usuarios autenticados
CREATE POLICY "folders: select public folders" ON public.folders 
FOR SELECT TO authenticated 
USING (is_public = true);

-- Política para permitir SELECT de notas que pertenecen a carpetas públicas
CREATE POLICY "notes: select from public folders" ON public.notes 
FOR SELECT TO authenticated 
USING (
  folder_id IN (
    SELECT id FROM public.folders WHERE is_public = true
  )
  OR 
  owner_id = auth.uid()
);

-- Política para permitir SELECT de decks vinculados a notas de carpetas públicas
CREATE POLICY "decks: select from public folders" ON public.decks 
FOR SELECT TO authenticated 
USING (
  id IN (
    SELECT ndl.deck_id 
    FROM public.note_deck_links ndl
    JOIN public.notes n ON ndl.note_id = n.id
    JOIN public.folders f ON n.folder_id = f.id
    WHERE f.is_public = true
  )
);

-- Política para permitir SELECT de cards de decks vinculados a notas públicas
CREATE POLICY "cards: select from public folders" ON public.cards 
FOR SELECT TO authenticated 
USING (
  deck_id IN (
    SELECT ndl.deck_id 
    FROM public.note_deck_links ndl
    JOIN public.notes n ON ndl.note_id = n.id
    JOIN public.folders f ON n.folder_id = f.id
    WHERE f.is_public = true
  )
);

-- Política para permitir SELECT de note_deck_links de carpetas públicas
CREATE POLICY "note_deck_links: select from public folders" ON public.note_deck_links 
FOR SELECT TO authenticated 
USING (
  note_id IN (
    SELECT n.id 
    FROM public.notes n
    JOIN public.folders f ON n.folder_id = f.id
    WHERE f.is_public = true
  )
);

-- Verificar políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('folders', 'notes', 'decks', 'cards', 'note_deck_links') 
ORDER BY tablename, policyname;

-- Test query para verificar acceso a notas públicas
-- Reemplaza 'USER_ID_AQUI' con el ID del usuario normal
SELECT 
  n.id,
  n.title,
  n.content_md,
  n.folder_id,
  f.name as folder_name,
  f.is_public as folder_is_public,
  n.owner_id as note_owner,
  f.owner_id as folder_owner
FROM notes n
JOIN folders f ON n.folder_id = f.id
WHERE f.is_public = true
ORDER BY f.name, n.title;
