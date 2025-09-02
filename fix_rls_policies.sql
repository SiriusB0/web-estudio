-- ===============================================
-- ARREGLAR POLÍTICAS RLS PARA FLASHCARDS
-- ===============================================
-- Este script arregla el error 406 en consultas a decks
-- agregando política para permitir SELECT público
-- ===============================================

-- Agregar política para permitir SELECT público en decks (necesario para buscar decks propios)
create policy "decks: select public (auth)" on public.decks for select to authenticated
using (true);

-- Verificar que las políticas existentes estén correctas
-- (Las políticas de sql_obsidian_clean.sql ya están bien configuradas)
