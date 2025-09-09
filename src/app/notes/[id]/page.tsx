"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import NoteEditor from "@/components/notes/NoteEditor";
import NotePreview from "@/components/notes/NotePreview";
import { extractWikiLinks } from "@/lib/notes/wikilinks";

type Note = {
  id: string;
  owner_id: string;
  title: string;
  content_md: string;
  slug: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  folder_id: string | null;
};

type Backlink = {
  id: string;
  title: string;
  anchor_text: string;
};

export default function NoteEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const noteId = params?.id as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<Note | null>(null);
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("split");

  // Detectar si se debe abrir en modo estudio
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'preview') {
      setViewMode('preview');
    }
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      if (!mounted) return;
      setUserId(user.id);
      await Promise.all([loadNote(user.id), loadBacklinks(user.id)]);
      setLoading(false);
    }
    if (noteId) init();
    return () => {
      mounted = false;
    };
  }, [router, noteId]);

  async function loadNote(uid: string) {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .eq("owner_id", uid)
      .single();
    
    if (error) {
      setMessage(error.message);
      return;
    }
    setNote(data as Note);
  }

  async function loadBacklinks(uid: string) {
    const { data, error } = await supabase
      .from("note_links")
      .select(`
        id,
        anchor_text,
        from_note:notes!note_links_from_note_id_fkey(id, title)
      `)
      .eq("to_note_id", noteId);
    
    if (error) {
      console.error("Error loading backlinks:", error);
      return;
    }

    const formattedBacklinks = (data || []).map((link: any) => ({
      id: link.from_note.id,
      title: link.from_note.title,
      anchor_text: link.anchor_text
    }));
    
    setBacklinks(formattedBacklinks);
  }

  async function handleSave(content: string) {
    if (!userId || !note) return;

    // Actualizar contenido de la nota
    const { error: updateError } = await supabase
      .from("notes")
      .update({ content_md: content })
      .eq("id", noteId)
      .eq("owner_id", userId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Actualizar wikilinks
    await updateWikiLinks(content);
    
    // Actualizar estado local
    setNote(prev => prev ? { ...prev, content_md: content } : null);
  }

  async function updateWikiLinks(content: string) {
    if (!userId) return;

    // Extraer wikilinks del contenido
    const wikiLinks = extractWikiLinks(content);
    
    // Eliminar links existentes
    await supabase
      .from("note_links")
      .delete()
      .eq("from_note_id", noteId);

    // Crear nuevos links
    for (const link of wikiLinks) {
      // Buscar nota de destino por título
      const { data: targetNotes } = await supabase
        .from("notes")
        .select("id")
        .eq("owner_id", userId)
        .ilike("title", `%${link.text}%`)
        .limit(1);

      if (targetNotes && targetNotes.length > 0) {
        await supabase
          .from("note_links")
          .insert({
            from_note_id: noteId,
            to_note_id: targetNotes[0].id,
            anchor_text: link.text
          });
      }
    }
  }

  async function handleTitleChange(newTitle: string) {
    if (!userId || !note || newTitle === note.title) return;

    const { error } = await supabase
      .from("notes")
      .update({ title: newTitle })
      .eq("id", noteId)
      .eq("owner_id", userId);

    if (!error) {
      setNote(prev => prev ? { ...prev, title: newTitle } : null);
    }
  }

  async function handleWikiLinkClick(linkText: string) {
    if (!userId) return;
    
    const { findNoteByTitle } = await import("@/lib/notes/wikilinks");
    const targetNote = await findNoteByTitle(supabase, userId, linkText);
    
    if (targetNote) {
      router.push(`/notes/${targetNote.id}`);
    } else {
      // Crear nueva nota si no existe
      const { data, error } = await supabase
        .from("notes")
        .insert({
          owner_id: userId,
          title: linkText,
          content_md: `# ${linkText}\n\nNota creada automáticamente desde wikilink.`,
          folder_id: note?.folder_id || null,
          sort_order: 0
        })
        .select("id")
        .single();

      if (error) {
        setMessage(`Error creando nota: ${error.message}`);
      } else {
        router.push(`/notes/${data.id}`);
      }
    }
  }


  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-600">Cargando...</p>
      </main>
    );
  }

  if (!note) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">Nota no encontrada</p>
          <a href="/editor" className="text-sm underline">Volver a notas</a>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-semibold">{note.title}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("edit")}
              className={`px-3 py-1 text-sm rounded ${viewMode === "edit" ? "bg-black text-white" : "border"}`}
            >
              Editar
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`px-3 py-1 text-sm rounded ${viewMode === "split" ? "bg-black text-white" : "border"}`}
            >
              Dividido
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={`px-3 py-1 text-sm rounded ${viewMode === "preview" ? "bg-black text-white" : "border"}`}
            >
              Modo Estudio
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>Actualizada: {new Date(note.updated_at).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="underline">Dashboard</a>
          </div>
        </div>
      </div>

      {message && (
        <div className="bg-blue-50 border-b px-4 py-2 text-sm text-blue-700">
          {message}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        {(viewMode === "edit" || viewMode === "split") && (
          <div className={`${viewMode === "split" ? "w-1/2" : "w-full"} border-r`}>
            <NoteEditor
              initialContent={note.content_md}
              onSave={handleSave}
              onTitleChange={handleTitleChange}
              userId={userId || undefined}
            />
          </div>
        )}

        {/* Preview */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className={`${viewMode === "split" ? "w-1/2" : "w-full"} flex`}>
            <div className="flex-1">
              <NotePreview
                content={note.content_md}
                onWikiLinkClick={handleWikiLinkClick}
              />
            </div>
            
            {/* Sidebar con backlinks */}
            {backlinks.length > 0 && (
              <div className="w-64 border-l p-4">
                <h3 className="font-medium mb-3">Mencionada por</h3>
                <div className="space-y-2">
                  {backlinks.map((backlink) => (
                    <div key={backlink.id} className="text-sm">
                      <a
                        href={`/notes/${backlink.id}`}
                        className="text-blue-600 hover:underline block"
                      >
                        {backlink.title}
                      </a>
                      {backlink.anchor_text && (
                        <p className="text-gray-500 text-xs mt-1">
                          "{backlink.anchor_text}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
