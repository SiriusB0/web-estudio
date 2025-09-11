import { createClient } from '@supabase/supabase-js';

// Lee variables públicas (expuestas al cliente) de .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // No lanzamos error para no romper el build, pero avisamos por consola
  // Asegúrate de definir NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
  console.warn('[supabaseClient] Falta configurar NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }
});

// Utilidad: convertir username a un email sintético
export function usernameToEmail(username: string) {
  const clean = username.trim().toLowerCase();
  return `${clean}@app.local`;
}

// Función utilitaria para obtener el usuario actual de forma segura
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.warn('[Auth] Error getting user:', error.message);
      // Si hay error de refresh token, intentar limpiar la sesión
      if (error.message.includes('refresh_token_not_found') || error.message.includes('Invalid Refresh Token')) {
        await supabase.auth.signOut();
      }
      return null;
    }
    return user;
  } catch (error) {
    console.warn('[Auth] Exception getting user:', error);
    return null;
  }
}

// Función utilitaria para obtener la sesión actual de forma segura
export async function getCurrentSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[Auth] Error getting session:', error.message);
      return null;
    }
    return session;
  } catch (error) {
    console.warn('[Auth] Exception getting session:', error);
    return null;
  }
}
