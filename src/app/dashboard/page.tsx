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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-2xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-medium text-gray-900">Panel de Control</h1>
            <div className="flex items-center space-x-4">
              <a 
                href="/editor" 
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white rounded border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Mi sitio de Estudio
              </a>
              {userIsAdmin && (
                <a 
                  href="/dashboard/invitations" 
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded border border-blue-300 hover:bg-blue-100 transition-colors"
                >
                  Invitaciones
                </a>
              )}
              <button 
                onClick={handleLogout}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {profile.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="ml-3">
                <h2 className="text-lg font-medium text-gray-900">Configuración de Cuenta</h2>
                <p className="text-sm text-gray-500">Gestiona tu información personal</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de usuario
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  minLength={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white"
                />
              </div>
              
              <button
                onClick={handleUpdateUsername}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium py-2 px-4 rounded hover:from-blue-700 hover:to-indigo-700 transition-colors"
              >
                Actualizar Perfil
              </button>
              
              {message && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-800 font-medium">{message}</p>
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">ID de Usuario</label>
                    <code className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1 rounded block">
                      {profile.id}
                    </code>
                  </div>
                  {profile.created_at && (
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Cuenta creada</label>
                      <p className="text-gray-600">
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
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Perfil no encontrado</h3>
            <p className="text-gray-600">No se pudo cargar la información de tu cuenta.</p>
          </div>
        )}
      </main>
    </div>
  );
}
