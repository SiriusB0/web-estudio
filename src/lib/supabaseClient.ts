import { createClient } from '@supabase/supabase-js';

// Lee variables públicas (expuestas al cliente) de .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // No lanzamos error para no romper el build, pero avisamos por consola
  // Asegúrate de definir NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
  console.warn('[supabaseClient] Falta configurar NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Utilidad: convertir username a un email sintético
export function usernameToEmail(username: string) {
  const clean = username.trim().toLowerCase();
  return `${clean}@app.local`;
}
