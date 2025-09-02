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

export default function InvitationsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState<InvitationCode[]>([]);
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
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push("/login");
    } finally {
      setLoading(false);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Códigos de Invitación</h1>
            <p className="text-blue-200">Genera códigos para que otros usuarios puedan registrarse</p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            ← Volver al Dashboard
          </button>
        </div>

        {/* Feedback */}
        {copyFeedback && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-700 rounded-lg text-green-200">
            {copyFeedback}
          </div>
        )}

        {/* Actions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Generar Nuevo Código</h2>
              <p className="text-blue-200 text-sm">Los códigos expiran automáticamente en 24 horas</p>
            </div>
            <button
              onClick={handleGenerateCode}
              disabled={generating}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                generating
                  ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
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
                : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
            }`}
          >
            {showAll ? 'Mostrar solo activos' : 'Mostrar todos'}
          </button>
        </div>

        {/* Codes List */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            {showAll ? 'Todos los Códigos' : 'Códigos Activos'} ({codes.length})
          </h2>
          
          {codes.length === 0 ? (
            <div className="text-center py-8 text-blue-200">
              {showAll ? 'No hay códigos generados' : 'No hay códigos activos'}
            </div>
          ) : (
            <div className="space-y-3">
              {codes.map((code) => {
                const status = getCodeStatus(code);
                const statusColors = {
                  active: 'bg-green-900/50 border-green-700 text-green-200',
                  used: 'bg-gray-900/50 border-gray-700 text-gray-300',
                  expired: 'bg-red-900/50 border-red-700 text-red-200'
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
                        <div className="font-mono text-lg font-bold">
                          {code.code}
                        </div>
                        <div className="text-sm">
                          <div className="font-medium">{statusLabels[status]}</div>
                          <div className="opacity-75">
                            {status === 'active' && formatExpirationDate(code.expires_at)}
                            {status === 'used' && code.used_at && `Usado el ${new Date(code.used_at).toLocaleDateString('es-ES')}`}
                            {status === 'expired' && `Expiró el ${new Date(code.expires_at).toLocaleDateString('es-ES')}`}
                          </div>
                        </div>
                      </div>
                      
                      {status === 'active' && (
                        <button
                          onClick={() => handleCopyCode(code.code)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
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

        {/* Instructions */}
        <div className="mt-8 bg-blue-900/30 border border-blue-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Instrucciones</h3>
          <ul className="text-blue-200 space-y-2 text-sm">
            <li>• Los códigos son de un solo uso y expiran en 24 horas</li>
            <li>• Comparte el código con la persona que quieres invitar</li>
            <li>• Deben ingresar el código en la página de registro</li>
            <li>• Una vez usado, el código se marca como utilizado automáticamente</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
