-- 0. Crear la función is_admin() que faltaba
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT auth.jwt()->>'email' = 'tomas.bus@hotmail.com';
$$;

-- 1. Añadir la columna 'last_seen' a la tabla de perfiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

-- 2. Crear la función para actualizar 'last_seen'
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET last_seen = now()
  WHERE id = auth.uid();
END;
$$;

-- Asignar propiedad de la función a postgres para que se ejecute con los máximos privilegios
ALTER FUNCTION public.update_last_seen() OWNER TO postgres;

-- 3. Dar permisos a los usuarios autenticados para que puedan ejecutar la función
GRANT EXECUTE ON FUNCTION public.update_last_seen() TO authenticated;


-- 4. Actualizar las políticas de RLS de la tabla 'profiles'
-- Asegurarse de que RLS está habilitado en la tabla
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas para evitar conflictos (si existen)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Nueva política para administradores
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin());

-- Nueva política para usuarios no-administradores
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- NOTA: Las políticas de UPDATE/INSERT/DELETE no se modifican,
-- los usuarios solo pueden modificar su propio perfil como antes.

