"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  generateInvitationCode, 
  getActiveInvitationCodes, 
  getAllInvitationCodes,
  isAdmin,
  formatExpirationDate,
  getCodeStatus,
  copyToClipboard,
  InvitationCode 
} from "@/lib/invitations";

interface UserProfile {
  id: string;
  username: string;
  last_seen: string | null;
}

// Función para formatear el tiempo relativo
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Nunca';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return `hace ${Math.floor(interval)} años`;
  interval = seconds / 2592000;
  if (interval > 1) return `hace ${Math.floor(interval)} meses`;
  interval = seconds / 86400;
  if (interval > 1) return `hace ${Math.floor(interval)} días`;
  interval = seconds / 3600;
  if (interval > 1) return `hace ${Math.floor(interval)} horas`;
  interval = seconds / 60;
  if (interval > 1) return `hace ${Math.floor(interval)} minutos`;
  return 'hace unos segundos';
}

export default function InvitationsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]); // Estado para la lista de usuarios
  const [generating, setGenerating] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Verificar si es admin
      const adminStatus = await isAdmin();
      if (!adminStatus) {
        router.push("/dashboard");
        return;
      }

      setUser(user);
      await loadCodes();
      await loadUsers(); // Cargar usuarios
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar la lista de usuarios
  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, last_seen')
        .order('last_seen', { ascending: false, nullsFirst: true });

      if (error) throw error;
      setUsersList(data || []);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    }
  };

  const loadCodes = async () => {
    try {
      const data = showAll ? await getAllInvitationCodes() : await getActiveInvitationCodes();
      setCodes(data);
    } catch (error) {
      console.error("Error cargando códigos:", error);
    }
  };

  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      const result = await generateInvitationCode();
      if (result) {
        await loadCodes();
        // Mostrar feedback
        setCopyFeedback(`Código generado: ${result.code}`);
        setTimeout(() => setCopyFeedback(null), 3000);
      }
    } catch (error) {
      console.error("Error generando código:", error);
      setCopyFeedback("Error generando código");
      setTimeout(() => setCopyFeedback(null), 3000);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopyFeedback(`Código ${code} copiado al portapapeles`);
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const toggleShowAll = async () => {
    setShowAll(!showAll);
    // Recargar códigos con el nuevo filtro
    setTimeout(loadCodes, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-sm text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-100 mb-2">Códigos de Invitación</h1>
            <p className="text-gray-400">Genera códigos para que otros usuarios puedan registrarse</p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-600 transition-colors"
          >
            ← Volver al Panel
          </button>
        </div>

        {/* Feedback */}
        {copyFeedback && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg text-green-400">
            {copyFeedback}
          </div>
        )}

        {/* Actions */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-100 mb-2">Generar Nuevo Código</h2>
              <p className="text-gray-400 text-sm">Los códigos expiran automáticamente en 24 horas</p>
            </div>
            <button
              onClick={handleGenerateCode}
              disabled={generating}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                generating
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {generating ? 'Generando...' : 'Generar Código'}
            </button>
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="mb-6">
          <button
            onClick={toggleShowAll}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              showAll
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
{showAll ? 'Mostrar todos' : 'Mostrar solo activos'}
          </button>
        </div>

        {/* Codes List */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">
            {showAll ? 'Todos los Códigos' : 'Códigos Activos'} ({codes.length})
          </h2>
          
          {codes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {showAll ? 'No hay códigos generados' : 'No hay códigos activos'}
            </div>
          ) : (
            <div className="space-y-3">
              {codes.map((code) => {
                const status = getCodeStatus(code);
                const statusColors = {
                  active: 'bg-green-800/20 border-green-600/30 text-green-400',
                  used: 'bg-gray-700/50 border-gray-600/80 text-gray-400',
                  expired: 'bg-red-800/20 border-red-600/30 text-red-400'
                };
                const statusLabels = {
                  active: 'Activo',
                  used: 'Usado',
                  expired: 'Expirado'
                };

                return (
                  <div
                    key={code.id}
                    className={`p-4 rounded-lg border ${statusColors[status]}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="font-mono text-lg font-bold text-gray-200">
                          {code.code}
                        </div>
                        <div className="text-sm">
                          <div className="font-medium">{statusLabels[status]}</div>
                          <div className="opacity-80">
                            {status === 'active' && formatExpirationDate(code.expires_at)}
                            {status === 'used' && code.used_at && `Usado el ${new Date(code.used_at).toLocaleDateString('es-ES')}`}
                            {status === 'expired' && `Expiró el ${new Date(code.expires_at).toLocaleDateString('es-ES')}`}
                          </div>
                        </div>
                      </div>
                      
                      {status === 'active' && (
                        <button
                          onClick={() => handleCopyCode(code.code)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
                        >
                          Copiar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* User Activity List */}
        <div className="mt-8 bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">
            Actividad de Usuarios ({usersList.length})
          </h2>
          
          {usersList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron usuarios.
            </div>
          ) : (
            <div className="space-y-3">
              {usersList.map((profile) => (
                <div
                  key={profile.id}
                  className="p-3 rounded-lg bg-gray-700/50 border border-gray-600/80 flex items-center justify-between"
                >
                  <div className="font-medium text-gray-200">{profile.username}</div>
                  <div className="text-sm text-gray-400">
                    {formatRelativeTime(profile.last_seen)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-3">Instrucciones</h3>
          <ul className="text-gray-400 space-y-2 text-sm list-disc list-inside">
            <li>Los códigos son de un solo uso y expiran en 24 horas.</li>
            <li>Comparte el código con la persona que quieres invitar.</li>
            <li>Deben ingresar el código en la página de registro.</li>
            <li>Una vez usado, el código se marca como utilizado automáticamente.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
