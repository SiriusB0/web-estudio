"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Folder = {
  id: string;
  name: string;
  parent_folder_id: string | null;
  sort_order: number;
};

type Note = {
  id: string;
  title: string;
  folder_id: string | null;
  updated_at: string;
};

interface SidebarProps {
  userId: string;
  currentNoteId?: string;
  onNoteSelect: (noteId: string) => void;
  onNewNote: () => void;
}

export default function Sidebar({ userId, currentNoteId, onNoteSelect, onNewNote }: SidebarProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFoldersAndNotes();
  }, [userId]);

  async function loadFoldersAndNotes() {
    try {
      // Cargar carpetas
      const { data: foldersData } = await supabase
        .from("folders")
        .select("*")
        .eq("owner_id", userId)
        .order("sort_order");

      // Cargar notas
      const { data: notesData } = await supabase
        .from("notes")
        .select("id, title, folder_id, updated_at")
        .eq("owner_id", userId)
        .order("updated_at", { ascending: false });

      setFolders(foldersData || []);
      setNotes(notesData || []);
    } catch (error) {
      console.error("Error loading folders and notes:", error);
    } finally {
      setLoading(false);
    }
  }

  function toggleFolder(folderId: string) {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  }

  function renderFolder(folder: Folder, level: number = 0) {
    const childFolders = folders.filter(f => f.parent_folder_id === folder.id);
    const folderNotes = notes.filter(n => n.folder_id === folder.id);
    const isExpanded = expandedFolders.has(folder.id);

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1 hover:bg-gray-100 cursor-pointer text-sm`}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => toggleFolder(folder.id)}
        >
          <span className="text-gray-500">
            {childFolders.length > 0 || folderNotes.length > 0 ? (
              isExpanded ? "📂" : "📁"
            ) : "📁"}
          </span>
          <span className="font-medium">{folder.name}</span>
        </div>
        
        {isExpanded && (
          <>
            {/* Notas en esta carpeta */}
            {folderNotes.map(note => (
              <div
                key={note.id}
                className={`flex items-center gap-2 px-2 py-1 hover:bg-gray-100 cursor-pointer text-sm ${
                  currentNoteId === note.id ? "bg-blue-50 border-r-2 border-blue-500" : ""
                }`}
                style={{ paddingLeft: `${24 + level * 16}px` }}
                onClick={() => onNoteSelect(note.id)}
              >
                <span className="text-gray-500">📄</span>
                <span className="truncate">{note.title}</span>
              </div>
            ))}
            
            {/* Subcarpetas */}
            {childFolders.map(childFolder => renderFolder(childFolder, level + 1))}
          </>
        )}
      </div>
    );
  }

  const rootFolders = folders.filter(f => f.parent_folder_id === null);
  const rootNotes = notes.filter(n => n.folder_id === null);

  if (loading) {
    return (
      <div className="w-64 border-r bg-gray-50 p-4">
        <p className="text-sm text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Notas</h2>
          <button
            onClick={onNewNote}
            className="text-xs bg-black text-white px-2 py-1 rounded hover:bg-gray-800"
          >
            Nueva
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto">
        {/* Notas sin carpeta */}
        {rootNotes.map(note => (
          <div
            key={note.id}
            className={`flex items-center gap-2 px-2 py-1 hover:bg-gray-100 cursor-pointer text-sm ${
              currentNoteId === note.id ? "bg-blue-50 border-r-2 border-blue-500" : ""
            }`}
            onClick={() => onNoteSelect(note.id)}
          >
            <span className="text-gray-500">📄</span>
            <span className="truncate">{note.title}</span>
          </div>
        ))}

        {/* Carpetas */}
        {rootFolders.map(folder => renderFolder(folder))}
      </div>
    </div>
  );
}
