-- Añadir columna is_public a la tabla folders
-- Este script debe ejecutarse en Supabase SQL Editor

-- Añadir la columna is_public a la tabla folders
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Crear índice para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_folders_is_public ON folders(is_public);

-- Verificar que la columna se añadió correctamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'folders' AND column_name = 'is_public';

-- Opcional: Actualizar algunas carpetas existentes como públicas para pruebas
-- UPDATE folders SET is_public = true WHERE name ILIKE '%ejemplo%' OR name ILIKE '%demo%';
