-- Sistema de códigos de invitación
-- Solo el admin puede generar códigos, usuarios los usan para registrarse

-- Tabla para códigos de invitación
CREATE TABLE IF NOT EXISTS public.invitation_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(12) NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE NULL,
    used_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON public.invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_active ON public.invitation_codes(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_created_by ON public.invitation_codes(created_by);

-- Políticas RLS (Row Level Security)
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

-- Solo el admin puede ver y gestionar códigos (reemplaza con tu email real)
CREATE POLICY "Admin can manage invitation codes" ON public.invitation_codes
    FOR ALL USING (
        auth.jwt() ->> 'email' = 'REEMPLAZAR_CON_TU_EMAIL'
    );

-- Función para generar código aleatorio
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Función para crear código de invitación (solo admin)
CREATE OR REPLACE FUNCTION create_invitation_code()
RETURNS TABLE(code TEXT, expires_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
    new_code TEXT;
    expiry_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Verificar que es admin
    IF auth.jwt() ->> 'email' != 'REEMPLAZAR_CON_TU_EMAIL' THEN
        RAISE EXCEPTION 'Solo el administrador puede generar códigos de invitación';
    END IF;
    
    -- Generar código único
    LOOP
        new_code := generate_invitation_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.invitation_codes WHERE invitation_codes.code = new_code);
    END LOOP;
    
    -- Calcular expiración (24 horas)
    expiry_time := NOW() + INTERVAL '24 hours';
    
    -- Insertar código
    INSERT INTO public.invitation_codes (code, created_by, expires_at)
    VALUES (new_code, auth.uid(), expiry_time);
    
    -- Retornar código y expiración
    RETURN QUERY SELECT new_code, expiry_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para validar código de invitación
CREATE OR REPLACE FUNCTION validate_invitation_code(invitation_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.invitation_codes 
        WHERE code = invitation_code 
        AND is_active = TRUE 
        AND used_at IS NULL 
        AND expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar código como usado
CREATE OR REPLACE FUNCTION use_invitation_code(invitation_code TEXT, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.invitation_codes 
    SET used_at = NOW(), used_by = user_id, is_active = FALSE
    WHERE code = invitation_code 
    AND is_active = TRUE 
    AND used_at IS NULL 
    AND expires_at > NOW();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpiar códigos expirados (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION cleanup_expired_codes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.invitation_codes 
    WHERE expires_at < NOW() - INTERVAL '7 days'; -- Mantener historial 7 días después de expirar
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios para documentación
COMMENT ON TABLE public.invitation_codes IS 'Códigos de invitación para registro de usuarios';
COMMENT ON COLUMN public.invitation_codes.code IS 'Código alfanumérico de 8 caracteres';
COMMENT ON COLUMN public.invitation_codes.expires_at IS 'Fecha y hora de expiración (24h desde creación)';
COMMENT ON COLUMN public.invitation_codes.used_at IS 'Fecha y hora cuando se usó el código';
COMMENT ON COLUMN public.invitation_codes.is_active IS 'Si el código está activo (no usado ni expirado)';
