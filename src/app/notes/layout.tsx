"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/notes/Sidebar";

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  function handleNoteSelect(noteId: string) {
    router.push(`/notes/${noteId}`);
  }

  function handleNewNote() {
    router.push("/notes/new");
  }

  // Extraer noteId actual de la URL
  const currentNoteId = pathname.match(/\/notes\/([^\/]+)$/)?.[1];

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-600">Cargando...</p>
      </main>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar
        userId={userId}
        currentNoteId={currentNoteId}
        onNoteSelect={handleNoteSelect}
        onNewNote={handleNewNote}
      />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
