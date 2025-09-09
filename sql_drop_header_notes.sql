-- Script para eliminar completamente la funcionalidad de header_notes

-- Eliminar la tabla header_notes y todas sus dependencias
DROP TABLE IF EXISTS header_notes CASCADE;

-- Eliminar la función del trigger si existe
DROP FUNCTION IF EXISTS update_header_notes_updated_at() CASCADE;

-- Verificar que se eliminó todo
SELECT tablename FROM pg_tables WHERE tablename = 'header_notes';
