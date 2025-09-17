-- Add images column to study_highlights table
-- This column will store image data as JSON text

ALTER TABLE study_highlights ADD COLUMN IF NOT EXISTS images TEXT;

-- Update existing records to have empty images object
UPDATE study_highlights SET images = '{}' WHERE images IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'study_highlights' 
AND column_name = 'images';
