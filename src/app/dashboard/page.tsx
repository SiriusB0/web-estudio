"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/invitations";

interface Profile {
  id: string;
  username: string;
  created_at?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (!user) {
        router.replace("/login");
        return;
      }
      if (!isMounted) return;
      setSessionUserId(user.id);

      // Actualizar la última vez que se vio al usuario
      supabase.rpc('update_last_seen').then();

      // Verificar si es admin
      const adminStatus = await isAdmin();
      setUserIsAdmin(adminStatus);

      // Cargar perfil
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, created_at")
        .eq("id", user.id)
        .limit(1);

      if (error) {
        setMessage(error.message);
      } else if (profiles && profiles.length > 0) {
        setProfile(profiles[0] as Profile);
        setNewUsername(profiles[0].username);
      }

      setLoading(false);
    }

    init();

    // Suscribirse a cambios de auth por si cierra sesión en otra pestaña
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!sess?.user) router.replace("/login");
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function handleUpdateUsername() {
    if (!sessionUserId) return;
    setMessage(null);
    const { error } = await supabase
      .from("profiles")
      .update({ username: newUsername })
      .eq("id", sessionUserId);
    if (error) setMessage(error.message);
    else setMessage("Usuario actualizado");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-600">Cargando...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300">
      {/* Header */}
      <header className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700/50">
        <div className="max-w-2xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-medium text-gray-100">Panel de Control</h1>
            <div className="flex items-center space-x-4">
              <a 
                href="/editor" 
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-700 rounded border border-gray-600 hover:bg-gray-600 transition-colors"
              >
                Mi sitio de Estudio
              </a>
              <button 
                onClick={handleLogout}
                className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        {profile ? (
          <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-100">Configuración de Cuenta</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nombre de usuario
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  minLength={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              
              <button
                onClick={handleUpdateUsername}
                className="bg-blue-600 text-white font-medium py-2 px-4 rounded hover:bg-blue-500 transition-colors"
              >
                Actualizar Perfil
              </button>
              
              {message && (
                <div className="p-3 bg-green-900/20 border border-green-500/30 rounded">
                  <p className="text-sm text-green-400 font-medium">{message}</p>
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block font-medium text-gray-300 mb-1">ID de Usuario</label>
                    <code className="text-xs text-gray-400 font-mono break-all bg-gray-700 px-2 py-1 rounded block">
                      {profile.id}
                    </code>
                  </div>
                  {profile.created_at && (
                    <div>
                      <label className="block font-medium text-gray-300 mb-1">Cuenta creada</label>
                      <p className="text-gray-400">
                        {new Date(profile.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {userIsAdmin && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <a 
                  href="/dashboard/invitations" 
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-300 bg-blue-900/50 rounded border border-blue-500/50 hover:bg-blue-800/50 transition-colors"
                >
                  Gestión de Usuario
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6 text-center">
            <h3 className="text-lg font-medium text-gray-100 mb-2">Perfil no encontrado</h3>
            <p className="text-gray-400">No se pudo cargar la información de tu cuenta.</p>
          </div>
        )}
      </main>
    </div>
  );
}
