"use client";

import { FormEvent, useState } from "react";
import { supabase, usernameToEmail } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getInvitationCodeDetails, markInvitationCodeAsUsed } from "@/lib/invitations";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // 1. Validar código de invitación y obtener detalles
      if (!invitationCode.trim()) {
        throw new Error("El código de invitación es obligatorio");
      }
      const codeDetails = await getInvitationCodeDetails(invitationCode.trim().toUpperCase());
      if (!codeDetails || codeDetails.used_at || new Date(codeDetails.expires_at) < new Date()) {
        throw new Error("Código de invitación inválido, usado o expirado");
      }
      const sourceUserId = codeDetails.created_by; // ID del admin que creó el código

      // 2. Crear el nuevo usuario en Supabase Auth
      const email = usernameToEmail(username.trim());
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;
      const user = signUpData.user;
      if (!user) throw new Error("No se pudo obtener el usuario tras el registro");

      // 3. Marcar código como usado (crítico para evitar reutilización)
      const codeUsed = await markInvitationCodeAsUsed(invitationCode.trim().toUpperCase(), user.id);
      if (!codeUsed) {
        // Si falla, es crucial eliminar el usuario para mantener la integridad
        await supabase.auth.admin.deleteUser(user.id);
        throw new Error("Error crítico al procesar el código de invitación. Inténtalo de nuevo.");
      }

      // 4. Crear el perfil del usuario
      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        username,
      });
      if (profileError) throw profileError;

      // 5. Clonar los datos del admin al nuevo usuario
      const { error: cloneError } = await supabase.rpc('clone_user_data', {
        source_user_id: sourceUserId,
        target_user_id: user.id
      });

      if (cloneError) {
        // Si la clonación falla, no es un error de bloqueo. El usuario ya está creado.
        // Se registra el error para seguimiento, pero se permite al usuario continuar.
        console.error("Error durante la clonación de datos (no bloqueante):", cloneError);
        // Opcional: podrías mostrar un mensaje al usuario o notificar a un admin.
      }

      // Ir al dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Error durante el registro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-md p-8 bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold text-center mb-6 text-white">Crear Cuenta</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Usuario</label>
            <input
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="tu_usuario"
              minLength={3}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Contraseña</label>
            <input
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-300">Código de Invitación</label>
            <input
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all uppercase"
              type="text"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
              placeholder="ABC12345"
              maxLength={12}
              required
            />
            <p className="text-xs text-gray-400 mt-1">Necesitas un código válido para registrarte</p>
          </div>
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-500 transition-all duration-200 disabled:opacity-50 shadow-sm"
            disabled={loading}
          >
            {loading ? "Creando..." : "Crear cuenta"}
          </button>
        </form>
        <p className="text-sm mt-4">
          ¿Ya tienes cuenta? {" "}
          <a href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">Iniciar sesión</a>
        </p>
      </div>
    </main>
  );
}
