-- Script SQL para agregar soporte de flashcards de opción múltiple
-- Ejecutar en Supabase SQL Editor

-- Agregar columnas para flashcards de opción múltiple a la tabla cards
ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'traditional' CHECK (type IN ('traditional', 'multiple_choice')),
ADD COLUMN IF NOT EXISTS question TEXT,
ADD COLUMN IF NOT EXISTS options JSONB,
ADD COLUMN IF NOT EXISTS correct_answers JSONB;

-- Crear índice para mejorar rendimiento en consultas por tipo
CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(type);

-- Crear índice para consultas de flashcards de opción múltiple
CREATE INDEX IF NOT EXISTS idx_cards_multiple_choice ON cards(type, deck_id) WHERE type = 'multiple_choice';

-- Comentarios para documentar los campos
COMMENT ON COLUMN cards.type IS 'Tipo de flashcard: traditional (pregunta/respuesta) o multiple_choice (opción múltiple)';
COMMENT ON COLUMN cards.question IS 'Texto de la pregunta para flashcards de opción múltiple';
COMMENT ON COLUMN cards.options IS 'Array JSON con las opciones de respuesta [{letter: "a", text: "Opción A"}, ...]';
COMMENT ON COLUMN cards.correct_answers IS 'Array JSON con las letras de las respuestas correctas ["a", "c"]';

-- Actualizar las políticas RLS existentes para incluir los nuevos campos
-- (Las políticas existentes deberían seguir funcionando, pero verificamos que incluyan los nuevos campos)

-- Verificar que las políticas de SELECT incluyan los nuevos campos
DO $$
BEGIN
    -- Esta consulta verifica que podemos acceder a los nuevos campos
    -- Si hay error, significa que las políticas RLS necesitan actualización
    PERFORM type, question, options, correct_answers 
    FROM cards 
    WHERE false; -- No devuelve filas, solo verifica acceso
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Las políticas RLS pueden necesitar actualización para incluir los nuevos campos';
END $$;

-- Script de migración de datos (opcional)
-- Si tienes flashcards existentes que quieres marcar como tradicionales:
UPDATE cards 
SET type = 'traditional' 
WHERE type IS NULL;

-- Verificación de la estructura actualizada
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'cards' 
    AND table_schema = 'public'
    AND column_name IN ('type', 'question', 'options', 'correct_answers')
ORDER BY ordinal_position;

-- Ejemplo de inserción de flashcard de opción múltiple
-- (Comentado para evitar inserción accidental)
/*
INSERT INTO cards (deck_id, front, back, type, question, options, correct_answers)
VALUES (
    'tu-deck-id-aqui',
    '¿Cuál es la capital de Francia?',
    'Respuesta: b',
    'multiple_choice',
    '¿Cuál es la capital de Francia?',
    '[
        {"letter": "a", "text": "Madrid"},
        {"letter": "b", "text": "París"},
        {"letter": "c", "text": "Roma"},
        {"letter": "d", "text": "Londres"}
    ]'::jsonb,
    '["b"]'::jsonb
);
*/
