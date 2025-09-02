"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function NewNotePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);
      setLoading(false);
    }
    init();
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setMessage(null);
    
    if (!title.trim()) {
      setMessage("Ingresa un título para la nota");
      return;
    }

    const { data, error } = await supabase
      .from("notes")
      .insert({
        owner_id: userId,
        title: title.trim(),
        content_md: "",
      })
      .select("id")
      .single();

    if (error) {
      setMessage(error.message);
    } else {
      router.push(`/notes/${data.id}`);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-600">Cargando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Nueva nota</h1>
          <p className="text-sm text-gray-600">Crea una nueva nota</p>
        </div>
        <div className="flex items-center gap-4">
          <a href="/editor" className="text-sm underline">Volver a notas</a>
          <a href="/dashboard" className="text-sm underline">Dashboard</a>
        </div>
      </div>

      {message && (
        <div className="mb-4 text-sm text-red-600">{message}</div>
      )}

      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Título de la nota
          </label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Ej: Apuntes de React, Ideas para el proyecto..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>
        
        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-black text-white rounded px-4 py-2 text-sm"
          >
            Crear nota
          </button>
          <a
            href="/editor"
            className="border rounded px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancelar
          </a>
        </div>
      </form>
    </main>
  );
}
