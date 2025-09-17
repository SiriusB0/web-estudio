-- Crear tabla para highlights de estudio
CREATE TABLE IF NOT EXISTS study_highlights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selector_exact TEXT NOT NULL,
  selector_prefix TEXT,
  selector_suffix TEXT,
  note_text TEXT DEFAULT '',
  color TEXT DEFAULT '#facc15',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_study_highlights_doc_user ON study_highlights(doc_id, user_id);
CREATE INDEX IF NOT EXISTS idx_study_highlights_created ON study_highlights(created_at);
CREATE INDEX IF NOT EXISTS idx_study_highlights_user ON study_highlights(user_id);

-- RLS (Row Level Security)
ALTER TABLE study_highlights ENABLE ROW LEVEL SECURITY;

-- Política: usuarios solo pueden ver sus propios highlights
CREATE POLICY "Users can view own highlights" ON study_highlights
  FOR SELECT USING (auth.uid() = user_id);

-- Política: usuarios pueden insertar sus propios highlights
CREATE POLICY "Users can insert own highlights" ON study_highlights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política: usuarios pueden actualizar sus propios highlights
CREATE POLICY "Users can update own highlights" ON study_highlights
  FOR UPDATE USING (auth.uid() = user_id);

-- Política: usuarios pueden eliminar sus propios highlights
CREATE POLICY "Users can delete own highlights" ON study_highlights
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_study_highlights_updated_at
  BEFORE UPDATE ON study_highlights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
