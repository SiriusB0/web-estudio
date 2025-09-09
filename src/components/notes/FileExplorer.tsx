"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from "@/lib/supabaseClient";
import { 
  FolderIcon, 
  DocumentTextIcon, 
  ChevronRightIcon, 
  ChevronDownIcon,
  PlusIcon,
  FolderPlusIcon,
  DocumentPlusIcon,
  TrashIcon,
  PencilIcon,
  AcademicCapIcon,
  HomeIcon,
  ArrowLeftOnRectangleIcon
} from "@heroicons/react/24/outline";
import FolderStudySelector from "./FolderStudySelector";

type Folder = {
  id: string;
  name: string;
  parent_folder_id: string | null;
  owner_id: string;
  sort_order: number;
  created_at: string;
};

type Note = {
  id: string;
  title: string;
  folder_id: string | null;
  owner_id: string;
  sort_order: number;
  created_at: string;
};

type TreeItem = {
  id: string;
  name: string;
  type: "folder" | "note";
  children?: TreeItem[];
  parent_id?: string | null;
};

interface FileExplorerProps {
  onNoteSelect: (noteId: string) => void;
  onNewNote: (folderId?: string) => void;
  onNewFolder?: () => void;
  selectedNoteId?: string;
  onMoveNote?: (noteId: string, targetFolderId: string | null) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function FileExplorer({ onNoteSelect, onNewNote, onNewFolder, selectedNoteId, onMoveNote, isCollapsed, onToggleCollapse }: FileExplorerProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<{id: string, type: 'note' | 'folder'} | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | 'inside' | null>(null);
  const [editingItem, setEditingItem] = useState<{id: string, type: 'note' | 'folder', isNew?: boolean} | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{show: boolean, message: string, onConfirm: () => void} | null>(null);
  const [showFolderDeleteConfirm, setShowFolderDeleteConfirm] = useState<{show: boolean, folderName: string, noteCount: number, onConfirm: () => void} | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showFolderStudy, setShowFolderStudy] = useState<{folderId: string | null, folderName: string} | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [hasAutoExpanded, setHasAutoExpanded] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadData();
    
    // Set up real-time subscriptions
    const notesSubscription = supabase
      .channel('notes-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'notes' },
        (payload) => {
          console.log(' Notes change:', payload);
          if (payload.eventType === 'INSERT') {
            setNotes(prev => [...prev, payload.new as Note]);
          } else if (payload.eventType === 'UPDATE') {
            setNotes(prev => prev.map(n => 
              n.id === payload.new.id ? payload.new as Note : n
            ));
          } else if (payload.eventType === 'DELETE') {
            setNotes(prev => prev.filter(n => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    const foldersSubscription = supabase
      .channel('folders-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'folders' },
        (payload) => {
          console.log(' Folders change:', payload);
          if (payload.eventType === 'INSERT') {
            setFolders(prev => [...prev, payload.new as Folder]);
          } else if (payload.eventType === 'UPDATE') {
            setFolders(prev => prev.map(f => 
              f.id === payload.new.id ? payload.new as Folder : f
            ));
          } else if (payload.eventType === 'DELETE') {
            setFolders(prev => prev.filter(f => f.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      notesSubscription.unsubscribe();
      foldersSubscription.unsubscribe();
    };
  }, []);

  // Auto-expand folders containing the selected note (only on initial load)
  useEffect(() => {
    if (selectedNoteId && notes.length > 0 && folders.length > 0 && !hasAutoExpanded) {
      const selectedNote = notes.find(n => n.id === selectedNoteId);
      if (selectedNote?.folder_id) {
        // Find all parent folders and expand them
        const foldersToExpand = new Set(expandedFolders);
        let currentFolderId: string | null = selectedNote.folder_id;
        
        while (currentFolderId) {
          foldersToExpand.add(currentFolderId);
          const parentFolder = folders.find(f => f.id === currentFolderId);
          currentFolderId = parentFolder?.parent_folder_id || null;
        }
        
        setExpandedFolders(foldersToExpand);
        setHasAutoExpanded(true);
      }
    }
  }, [selectedNoteId, notes, folders, hasAutoExpanded, expandedFolders]);

  useEffect(() => {
    // Listen for custom event to start editing a note
    const handleStartEditNote = (event: any) => {
      const { noteId } = event.detail;
      setEditingItem({ id: noteId, type: 'note', isNew: true });
      setEditingName("Nueva Nota");
    };
    
    // Listen for new note creation to update local state
    const handleNewNoteCreated = (event: any) => {
      const { note } = event.detail;
      setNotes(prev => [...prev, note]);
    };
    
    window.addEventListener('startEditNote', handleStartEditNote);
    window.addEventListener('newNoteCreated', handleNewNoteCreated);
    
    return () => {
      window.removeEventListener('startEditNote', handleStartEditNote);
      window.removeEventListener('newNoteCreated', handleNewNoteCreated);
    };
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load folders
      const { data: foldersData } = await supabase
        .from("folders")
        .select("*")
        .eq("owner_id", user.id)
        .order("sort_order", { ascending: true })
        .order("name");

      // Load notes
      const { data: notesData } = await supabase
        .from("notes")
        .select("id, title, folder_id, owner_id, sort_order, created_at")
        .eq("owner_id", user.id)
        .order("sort_order", { ascending: true })
        .order("title");

      setFolders(foldersData || []);
      setNotes(notesData || []);
      
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };


  const buildTree = (): TreeItem[] => {
    const tree: TreeItem[] = [];
    const folderMap = new Map<string, TreeItem>();

    // Sort folders by sort_order first
    const sortedFolders = [...folders].sort((a, b) => a.sort_order - b.sort_order);
    const sortedNotes = [...notes].sort((a, b) => a.sort_order - b.sort_order);

    // Create folder items
    sortedFolders.forEach(folder => {
      const item: TreeItem = {
        id: folder.id,
        name: folder.name,
        type: "folder",
        children: [],
        parent_id: folder.parent_folder_id
      };
      folderMap.set(folder.id, item);
    });

    // Build folder hierarchy
    sortedFolders.forEach(folder => {
      const item = folderMap.get(folder.id);
      if (!item) return;

      if (folder.parent_folder_id) {
        const parent = folderMap.get(folder.parent_folder_id);
        if (parent) {
          parent.children!.push(item);
        }
      } else {
        tree.push(item);
      }
    });

    // Add notes to appropriate folders or root, sorted by sort_order
    sortedNotes.forEach(note => {
      const noteItem: TreeItem = {
        id: note.id,
        name: note.title,
        type: "note"
      };

      if (note.folder_id) {
        const folder = folderMap.get(note.folder_id);
        if (folder) {
          folder.children!.push(noteItem);
        } else {
          tree.push(noteItem);
        }
      } else {
        tree.push(noteItem);
      }
    });

    // Sort children in each folder by sort_order
    const sortChildren = (items: TreeItem[]) => {
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          // Separate folders and notes, then sort each by their sort_order
          const childFolders = item.children.filter(child => child.type === 'folder');
          const childNotes = item.children.filter(child => child.type === 'note');
          
          // Sort folders by their sort_order
          childFolders.sort((a, b) => {
            const folderA = folders.find(f => f.id === a.id);
            const folderB = folders.find(f => f.id === b.id);
            return (folderA?.sort_order || 0) - (folderB?.sort_order || 0);
          });
          
          // Sort notes by their sort_order
          childNotes.sort((a, b) => {
            const noteA = notes.find(n => n.id === a.id);
            const noteB = notes.find(n => n.id === b.id);
            return (noteA?.sort_order || 0) - (noteB?.sort_order || 0);
          });
          
          item.children = [...childFolders, ...childNotes];
          sortChildren(item.children);
        }
      });
    };

    sortChildren(tree);
    return tree;
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const createFolder = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newFolder, error } = await supabase
        .from('folders')
        .insert([{ 
          name: "Nueva Carpeta", 
          owner_id: user.id, 
          sort_order: folders.length,
          parent_folder_id: selectedFolderId // Create inside selected folder if any
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Update local state immediately to prevent flicker
      setFolders(prev => [...prev, newFolder]);
      setEditingItem({ id: newFolder.id, type: 'folder', isNew: true });
      setEditingName("Nueva Carpeta");
      
      // If creating inside a folder, expand it
      if (selectedFolderId) {
        setExpandedFolders(prev => new Set([...prev, selectedFolderId]));
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const toggleNoteSelection = (noteId: string) => {
    const newSelected = new Set(selectedNotes);
    if (newSelected.has(noteId)) {
      newSelected.delete(noteId);
    } else {
      newSelected.add(noteId);
    }
    setSelectedNotes(newSelected);
  };

  const selectAllNotes = () => {
    const allNoteIds = new Set(notes.map(note => note.id));
    setSelectedNotes(allNoteIds);
  };

  const clearSelection = () => {
    setSelectedNotes(new Set());
    setIsSelectionMode(false);
  };

  const deleteSelectedNotes = async () => {
    console.log("deleteSelectedNotes called, selectedNotes:", selectedNotes);
    if (selectedNotes.size === 0) {
      console.log("No notes selected");
      return;
    }
    
    const confirmMessage = selectedNotes.size === 1 
      ? "¿Eliminar esta nota?" 
      : `¿Eliminar ${selectedNotes.size} notas seleccionadas?`;
    
    console.log("Showing confirm dialog:", confirmMessage);
    
    // Show custom confirm dialog
    setShowDeleteConfirm({
      show: true,
      message: confirmMessage,
      onConfirm: async () => {
        setShowDeleteConfirm(null);
        try {
          console.log("Attempting to delete notes:", Array.from(selectedNotes));
          const { error } = await supabase
            .from('notes')
            .delete()
            .in('id', Array.from(selectedNotes));

          if (error) {
            console.error('Supabase error:', error);
            throw error;
          }
          
          console.log("Notes deleted successfully");
          clearSelection();
          // Update local state immediately
          setNotes(prev => prev.filter(n => !selectedNotes.has(n.id)));
        } catch (error) {
          console.error('Error deleting notes:', error);
          alert('Error al eliminar las notas: ' + (error as any).message);
        }
      }
    });
  };

  const deleteNote = async (noteId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    console.log("deleteNote called for:", noteId);
    
    // Show custom confirm dialog for individual note
    setShowDeleteConfirm({
      show: true,
      message: "¿Eliminar esta nota?",
      onConfirm: async () => {
        setShowDeleteConfirm(null);
        try {
          console.log("Attempting to delete note:", noteId);
          const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', noteId);

          if (error) {
            console.error('Supabase error deleting note:', error);
            throw error;
          }
          
          console.log("Note deleted successfully");
          // Update local state immediately
          setNotes(prev => prev.filter(n => n.id !== noteId));
        } catch (error) {
          console.error('Error deleting note:', error);
          alert('Error al eliminar la nota: ' + (error as any).message);
        }
      }
    });
  };

  const deleteFolder = async (folderId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Check if folder has notes
    const folderNotes = notes.filter(note => note.folder_id === folderId);
    const folder = folders.find(f => f.id === folderId);
    
    if (!folder) return;
    
    // Show folder-specific delete confirmation modal
    setShowFolderDeleteConfirm({
      show: true,
      folderName: folder.name,
      noteCount: folderNotes.length,
      onConfirm: async () => {
        setShowFolderDeleteConfirm(null);
        setDeleteConfirmText("");
        try {
          // Delete all notes in the folder first
          if (folderNotes.length > 0) {
            const { error: notesError } = await supabase
              .from('notes')
              .delete()
              .eq('folder_id', folderId);
            
            if (notesError) throw notesError;
          }

          // Then delete the folder
          const { error } = await supabase
            .from('folders')
            .delete()
            .eq('id', folderId);

          if (error) throw error;
          console.log("Folder and all notes deleted successfully");
          
          // Update local state immediately
          setFolders(prev => prev.filter(f => f.id !== folderId));
          setNotes(prev => prev.filter(n => n.folder_id !== folderId));
        } catch (error) {
          console.error('Error deleting folder:', error);
          alert('Error al eliminar la carpeta: ' + (error as any).message);
        }
      }
    });
  };

  const handleDragStart = (e: React.DragEvent, item: TreeItem) => {
    console.log('🚀 Drag start:', item);
    
    // Prevent drag if clicking on checkbox or delete button
    const target = e.target as HTMLElement;
    if (target.closest('.checkbox-container') || target.closest('button')) {
      console.log('❌ Drag prevented - clicked on button/checkbox');
      e.preventDefault();
      return;
    }
    
    console.log('✅ Setting dragged item:', { id: item.id, type: item.type });
    setDraggedItem({ id: item.id, type: item.type });
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedItem(null);
    setDragOverItem(null);
    setDropPosition(null);
  };

  const handleDragOver = (e: React.DragEvent, targetItem: TreeItem) => {
    e.preventDefault();
    console.log('🎯 Drag over:', targetItem.id, 'dragged:', draggedItem?.id);
    
    if (!draggedItem || draggedItem.id === targetItem.id) {
      console.log('❌ No dragged item or same item');
      return;
    }
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    setDragOverItem(targetItem.id);
    
    // Simple drop position logic
    let position: 'above' | 'below' | 'inside';
    if (targetItem.type === 'folder' && draggedItem.type === 'note') {
      if (y < height * 0.3) {
        position = 'above';
      } else if (y > height * 0.7) {
        position = 'below';
      } else {
        position = 'inside';
      }
    } else {
      position = y < height / 2 ? 'above' : 'below';
    }
    
    setDropPosition(position);
    console.log('📍 Drop position:', position);
    
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverItem(null);
      setDropPosition(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetItem: TreeItem) => {
    e.preventDefault();
    console.log('🎯 DROP EVENT:', { draggedItem, targetItem, dropPosition });
    
    if (!draggedItem || draggedItem.id === targetItem.id) {
      console.log('❌ Invalid drop - no dragged item or same item');
      return;
    }
    
    if (dropPosition === 'inside' && targetItem.type === 'folder' && draggedItem.type === 'note') {
      console.log('📁 Moving note into folder');
      await moveNoteToFolder(draggedItem.id, targetItem.id);
    } else if (dropPosition === 'above' || dropPosition === 'below') {
      console.log('🔄 Reordering items');
      await reorderItems(draggedItem, targetItem, dropPosition);
    }
    
    console.log('✅ Drop completed, cleaning up state');
    setDraggedItem(null);
    setDragOverItem(null);
    setDropPosition(null);
    setIsDragging(false);
  };

  const moveNoteToFolder = async (noteId: string, folderId: string) => {
    try {
      // Update local state immediately for instant visual feedback
      setNotes(prev => prev.map(n => n.id === noteId ? {...n, folder_id: folderId} : n));
      console.log('✅ Note moved to folder instantly in UI');
      
      // Update database in background
      const { error } = await supabase
        .from('notes')
        .update({ folder_id: folderId })
        .eq('id', noteId);

      if (error) {
        console.error('❌ Database error, reverting local state:', error);
        // Revert local state on error
        setNotes(prev => prev.map(n => n.id === noteId ? {...n, folder_id: null} : n));
        throw error;
      }
      
      if (onMoveNote) {
        onMoveNote(noteId, folderId);
      }
      
      console.log('✅ Database updated successfully');
    } catch (error) {
      console.error('Error moving note to folder:', error);
    }
  };

  const reorderItems = async (
    draggedItem: {id: string, type: 'note' | 'folder'}, 
    targetItem: TreeItem, 
    position: 'above' | 'below' | 'inside'
  ) => {
    if (position === 'inside') return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('🔄 Reordering:', { draggedItem, targetItem, position });

      // Get the dragged item to determine its current context
      const draggedNote = notes.find(n => n.id === draggedItem.id);
      const draggedFolder = folders.find(f => f.id === draggedItem.id);
      const targetNote = notes.find(n => n.id === targetItem.id);
      const targetFolder = folders.find(f => f.id === targetItem.id);
      
      // Determine the context (parent folder) where reordering happens
      // Use the target's context since we're reordering within that context
      let parentFolderId: string | null = null;
      if (targetNote) {
        parentFolderId = targetNote.folder_id;
      } else if (targetFolder) {
        parentFolderId = targetFolder.parent_folder_id;
      }
      
      // If dragged item is not in the same context, move it first
      const draggedCurrentContext = draggedNote ? draggedNote.folder_id : (draggedFolder ? draggedFolder.parent_folder_id : null);
      
      if (draggedCurrentContext !== parentFolderId) {
        // Move the item to the target context first
        if (draggedItem.type === 'folder') {
          await supabase
            .from('folders')
            .update({ parent_folder_id: parentFolderId })
            .eq('id', draggedItem.id);
          setFolders(prev => prev.map(f => 
            f.id === draggedItem.id ? {...f, parent_folder_id: parentFolderId} : f
          ));
        } else {
          await supabase
            .from('notes')
            .update({ folder_id: parentFolderId })
            .eq('id', draggedItem.id);
          setNotes(prev => prev.map(n => 
            n.id === draggedItem.id ? {...n, folder_id: parentFolderId} : n
          ));
        }
      }
      
      console.log('📁 Context folder ID:', parentFolderId);
      
      // Get all items in the same context and sort them by current sort_order
      const contextNotes = notes
        .filter(n => n.folder_id === parentFolderId)
        .sort((a, b) => a.sort_order - b.sort_order);
      const contextFolders = folders
        .filter(f => f.parent_folder_id === parentFolderId)
        .sort((a, b) => a.sort_order - b.sort_order);
      
      // Combine and sort all items in context (folders first, then notes)
      const allContextItems = [...contextFolders, ...contextNotes];
      
      console.log('📋 Context items:', allContextItems.map(i => ({ 
        id: i.id, 
        name: 'name' in i ? i.name : i.title, 
        sort_order: i.sort_order 
      })));
      
      const draggedIndex = allContextItems.findIndex(item => item.id === draggedItem.id);
      const targetIndex = allContextItems.findIndex(item => item.id === targetItem.id);
      
      if (draggedIndex === -1 || targetIndex === -1) {
        console.log('❌ Item not found in context');
        return;
      }
      if (draggedIndex === targetIndex) {
        console.log('❌ Same position');
        return;
      }

      console.log('📍 Indices:', { draggedIndex, targetIndex });

      // Recalculate all sort orders to ensure proper ordering
      const reorderedItems = [...allContextItems];
      const draggedItemData = reorderedItems[draggedIndex];
      
      // Remove dragged item from current position
      reorderedItems.splice(draggedIndex, 1);
      
      // Insert at new position
      let insertIndex = targetIndex;
      if (position === 'below') {
        insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
      } else { // position === 'above'
        insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
      }
      
      // Ensure valid bounds
      insertIndex = Math.max(0, Math.min(insertIndex, reorderedItems.length));
      reorderedItems.splice(insertIndex, 0, draggedItemData);
      
      console.log('🔄 Reordered array:', reorderedItems.map((item, index) => ({
        id: item.id,
        name: 'name' in item ? item.name : item.title,
        newSortOrder: index
      })));
      
      // First update local state immediately for instant visual feedback
      const updatedFolders = [...folders];
      const updatedNotes = [...notes];
      
      for (let i = 0; i < reorderedItems.length; i++) {
        const item = reorderedItems[i];
        const newSortOrder = i;
        
        if ('name' in item) {
          const folderIndex = updatedFolders.findIndex(f => f.id === item.id);
          if (folderIndex !== -1) {
            updatedFolders[folderIndex] = {...updatedFolders[folderIndex], sort_order: newSortOrder};
          }
        } else {
          const noteIndex = updatedNotes.findIndex(n => n.id === item.id);
          if (noteIndex !== -1) {
            updatedNotes[noteIndex] = {...updatedNotes[noteIndex], sort_order: newSortOrder};
          }
        }
      }
      
      // Update state immediately
      setFolders(updatedFolders);
      setNotes(updatedNotes);
      console.log('✅ Local state updated instantly');
      
      // Then update database in background
      for (let i = 0; i < reorderedItems.length; i++) {
        const item = reorderedItems[i];
        const newSortOrder = i;
        
        const table = 'name' in item ? 'folders' : 'notes';
        supabase
          .from(table)
          .update({ sort_order: newSortOrder })
          .eq('id', item.id)
          .then(({ error }) => {
            if (error) {
              console.error('❌ Database update error for item:', item.id, error);
            }
          });
      }
      
      console.log('✅ All items reordered successfully');
      
    } catch (error) {
      console.error('❌ Error reordering items:', error);
    }
  };

  const startRename = (item: TreeItem) => {
    setEditingItem({ id: item.id, type: item.type });
    setEditingName(item.name);
  };

  const cancelRename = async () => {
    // If it's a new item and user cancels, delete it
    if (editingItem?.isNew) {
      try {
        if (editingItem.type === 'folder') {
          await supabase.from('folders').delete().eq('id', editingItem.id);
        } else {
          await supabase.from('notes').delete().eq('id', editingItem.id);
        }
        await loadData();
      } catch (error) {
        console.error('Error deleting cancelled item:', error);
      }
    }
    setEditingItem(null);
    setEditingName("");
  };

  const saveRename = async () => {
    if (!editingItem || !editingName.trim()) {
      cancelRename();
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingItem.type === 'folder') {
        const { error } = await supabase
          .from('folders')
          .update({ name: editingName.trim() })
          .eq('id', editingItem.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notes')
          .update({ title: editingName.trim() })
          .eq('id', editingItem.id);
        
        if (error) throw error;
        
        // If it's a new note, also update the content to match the title
        if (editingItem.isNew) {
          const content = `# ${editingName.trim()}

Escribe aquí tu contenido...`;
          await supabase
            .from('notes')
            .update({ content_md: content })
            .eq('id', editingItem.id);
        }
      }

      setEditingItem(null);
      setEditingName("");
      // Update local state immediately
      if (editingItem.type === 'folder') {
        setFolders(prev => prev.map(f => f.id === editingItem.id ? {...f, name: editingName.trim()} : f));
      } else {
        setNotes(prev => prev.map(n => n.id === editingItem.id ? {...n, title: editingName.trim()} : n));
      }
    } catch (error) {
      console.error('Error renaming item:', error);
    }
  };

  const handleRenameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveRename();
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  };

  const handleStudyFolder = (folderId: string | null, folderName: string) => {
    setShowFolderStudy({ folderId, folderName });
  };

  const handleStartFolderStudy = (noteIds: string[]) => {
    if (showFolderStudy && noteIds.length > 0) {
      const folderId = showFolderStudy.folderId || 'root';
      const noteIdsParam = noteIds.join(',');
      window.location.href = `/study/folder/${folderId}?notes=${noteIdsParam}`;
      setShowFolderStudy(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const renderTreeItem = (item: TreeItem, level: number = 0) => {
    const isExpanded = expandedFolders.has(item.id);
    const isSelected = item.type === "note" && selectedNotes.has(item.id);

    return (
      <div key={item.id} className="relative">
        {/* Drop indicators */}
        {dragOverItem === item.id && dropPosition === 'above' && (
          <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-blue-400 z-10" />
        )}
        {dragOverItem === item.id && dropPosition === 'inside' && item.type === 'folder' && (
          <div className="absolute inset-0 border-2 border-blue-400 border-dashed rounded bg-blue-400 bg-opacity-10 z-10" />
        )}
        
        <div
          className={`flex items-center py-0.5 px-2 cursor-pointer group transition-all duration-200 relative ${
            item.type === "note" && selectedNoteId === item.id 
              ? "bg-gray-700/20 text-gray-100 border-l-2 border-blue-500" 
              : item.type === "folder" && selectedFolderId === item.id
                ? "bg-gray-700/20 text-gray-100 border-l-2 border-blue-500"
                : isSelected 
                  ? "bg-gray-700/20 text-gray-100" 
                  : "text-gray-400"
          } ${
            item.type === "note" && selectedNoteId === item.id
              ? "hover:bg-gray-700/30"
              : item.type === "folder" && selectedFolderId === item.id
                ? "hover:bg-gray-700/30"
                : "hover:bg-gray-800/30"
          } ${
            draggedItem?.id === item.id && isDragging 
              ? "opacity-50 scale-95" 
              : ""
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          draggable={!editingItem}
          onDragStart={(e) => handleDragStart(e, item)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, item)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, item)}
          onClick={(e) => {
            if (isDragging) {
              e.preventDefault();
              return;
            }
            if (item.type === "folder") {
              // Select folder and toggle expansion
              setSelectedFolderId(selectedFolderId === item.id ? null : item.id);
              toggleFolder(item.id);
            } else {
              onNoteSelect(item.id);
              setSelectedFolderId(null); // Clear folder selection when selecting note
            }
          }}
        >
          {item.type === "folder" && (
            <>
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4 mr-1" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 mr-1" />
              )}
              <FolderIcon className="w-4 h-4 mr-2 text-gray-400" />
            </>
          )}
          {item.type === "note" && (
            <>
              {/* Checkbox for selection */}
              <div
                className="opacity-0 group-hover:opacity-100 mr-2 ml-5 checkbox-container"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNoteSelection(item.id);
                  setIsSelectionMode(true);
                }}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-500 border-blue-500' 
                    : 'border-gray-500 hover:border-gray-300'
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <DocumentTextIcon className="w-4 h-4 mr-2 text-gray-400" />
            </>
          )}
          {editingItem?.id === item.id ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={handleRenameKeyPress}
              onBlur={saveRename}
              className="flex-1 bg-gray-900 text-gray-200 text-sm px-1 py-0.5 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm flex-1 overflow-hidden">
              <span className="block truncate" title={item.name}>
                {item.name.length > 25 ? `${item.name.substring(0, 25)}...` : item.name}
              </span>
            </span>
          )}
          {item.type === "note" && editingItem?.id !== item.id && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startRename(item);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                title="Renombrar nota"
              >
                <PencilIcon className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => deleteNote(item.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600 rounded text-gray-400 hover:text-white"
                title="Eliminar nota"
              >
                <TrashIcon className="w-3 h-3" />
              </button>
            </div>
          )}
          {item.type === "folder" && editingItem?.id !== item.id && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStudyFolder(item.id, item.name);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-green-400"
                title="Estudiar flashcards de esta carpeta"
              >
                <AcademicCapIcon className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startRename(item);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                title="Renombrar carpeta"
              >
                <PencilIcon className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => deleteFolder(item.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400"
                title="Eliminar carpeta"
              >
                <TrashIcon className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  console.log("Creating note in folder:", item.id);
                  onNewNote(item.id);
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  console.log("Mouse down on + button");
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded text-gray-300 cursor-pointer"
                title="Nueva nota"
                style={{ pointerEvents: 'auto', zIndex: 20 }}
              >
                <PlusIcon className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        {item.type === "folder" && isExpanded && item.children && (
          <div>
            {item.children.map(child => renderTreeItem(child, level + 1))}
          </div>
        )}
        
        {/* Drop line indicator below */}
        {dragOverItem === item.id && dropPosition === 'below' && (
          <div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-blue-400 z-10" />
        )}
      </div>
    );
  };

  const tree = useMemo(() => {
    return buildTree();
  }, [folders, notes]);

  if (loading) {
    return (
      <div className="w-80 bg-gray-800 border-r border-gray-700 p-4">
        <div className="text-sm text-gray-300">Cargando...</div>
      </div>
    );
  }

  return (
    <div className={`h-full border-r border-gray-900 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-72'}`} style={{backgroundColor: '#1a1a1a'}}>
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-800/50" style={{backgroundColor: '#0a0a0a'}}>
        <div className="flex justify-between items-center">
          {!isCollapsed && <h2 className="text-sm font-medium text-gray-300">Explorador</h2>}
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-gray-700/50 rounded text-gray-500 hover:text-gray-300 transition-colors"
            title={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            <svg className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        {!isCollapsed && (
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded transition-colors border border-gray-700/50 hover:border-gray-600/50"
              title="Cerrar Sesión"
            >
              <ArrowLeftOnRectangleIcon className="w-4 h-4 text-white" />
            </button>

            <Link href="/dashboard" className="p-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded transition-colors border border-gray-700/50 hover:border-gray-600/50" title="Ir al Dashboard">
              <HomeIcon className="w-4 h-4 text-white" />
            </Link>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                createFolder();
              }}
              className="p-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded transition-colors border border-gray-700/50 hover:border-gray-600/50"
              title={selectedFolderId ? "Nueva Subcarpeta" : "Nueva Carpeta"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" className="text-white">
                <path fill="currentColor" d="m12.5,14.5h3.5v1h-3.5v3.5h-1v-3.5h-3.5v-1h3.5v-3.5h1v3.5Zm11.5-9v17.5H0V3.5C0,2.122,1.121,1,2.5,1h5.618l4,2h9.382c1.379,0,2.5,1.122,2.5,2.5ZM1,3.5v3.5h22v-1.5c0-.827-.673-1.5-1.5-1.5h-9.618l-4-2H2.5c-.827,0-1.5.673-1.5,1.5Zm22,18.5v-14H1v14h22Z"/>
              </svg>
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                onNewNote();
              }}
              className="p-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded transition-colors border border-gray-700/50 hover:border-gray-600/50"
              title="Nueva Nota"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" className="text-white">
                <path fill="currentColor" d="M14.707,0H4.5c-1.379,0-2.5,1.122-2.5,2.5v21.5h20V7.293L14.707,0Zm.293,1.707l5.293,5.293h-5.293V1.707ZM3,23V2.5c0-.827.673-1.5,1.5-1.5h9.5v7h7v15H3Zm9.5-8.5h3.5v1h-3.5v3.5h-1v-3.5h-3.5v-1h3.5v-3.5h1v3.5Z"/>
              </svg>
            </button>

            {/* Selection Controls */}
            {selectedNotes.size > 0 && (
              <div className="bg-gray-900 rounded p-2 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">{selectedNotes.size} seleccionadas</span>
                  <button
                    onClick={clearSelection}
                    className="text-gray-400 hover:text-gray-200 text-xs"
                  >
                    Limpiar
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllNotes}
                    className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 rounded"
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSelectedNotes();
                    }}
                    className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto">
        {isCollapsed ? (
          <div className="p-2 space-y-1">
            {tree.map((item: TreeItem) => (
              <div key={item.id} className="flex justify-center">
                <button
                  onClick={() => {
                    if (item.type === "folder") {
                      setSelectedFolderId(selectedFolderId === item.id ? null : item.id);
                      toggleFolder(item.id);
                    } else {
                      onNoteSelect(item.id);
                    }
                  }}
                  className={`p-2 rounded hover:bg-gray-700/50 transition-colors ${
                    (item.type === "note" && selectedNoteId === item.id) || 
                    (item.type === "folder" && selectedFolderId === item.id)
                      ? "bg-gray-700/30 text-gray-100"
                      : "text-gray-400"
                  }`}
                  title={item.name}
                >
                  {item.type === "folder" ? (
                    <FolderIcon className="w-5 h-5" />
                  ) : (
                    <DocumentTextIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <>
            {tree.map((item: TreeItem) => renderTreeItem(item))}
            {tree.length === 0 && (
              <div className="p-4 text-sm text-gray-400 text-center">
                No hay notas aún.
                <br />
                <button
                  onClick={() => onNewNote()}
                  className="text-blue-400 hover:underline mt-2"
                >
                  Crear primera nota
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Custom Confirm Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg shadow-xl border border-gray-700">
            <p className="text-white mb-4">{showDeleteConfirm.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
              >
                Cancelar
              </button>
              <button
                onClick={showDeleteConfirm.onConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Delete Confirmation Modal */}
      {showFolderDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg shadow-xl border border-gray-700 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-white mb-3">Eliminar "{showFolderDeleteConfirm.folderName}"</h3>
            
            {showFolderDeleteConfirm.noteCount > 0 && (
              <p className="text-gray-400 text-sm mb-4">
                Incluye {showFolderDeleteConfirm.noteCount} nota(s)
              </p>
            )}
            
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                Escribe <span className="font-medium text-white">BORRAR</span> para confirmar:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                placeholder="BORRAR"
                autoFocus
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowFolderDeleteConfirm(null);
                  setDeleteConfirmText("");
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
              >
                Cancelar
              </button>
              <button
                onClick={showFolderDeleteConfirm.onConfirm}
                disabled={deleteConfirmText !== "BORRAR"}
                className={`px-4 py-2 rounded ${
                  deleteConfirmText === "BORRAR"
                    ? "bg-gray-600 hover:bg-gray-500 text-white"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Study Modal */}
      {showFolderStudy && (
        <FolderStudySelector
          folderId={showFolderStudy.folderId}
          folderName={showFolderStudy.folderName}
          isOpen={true}
          onClose={() => setShowFolderStudy(null)}
          onStartStudy={handleStartFolderStudy}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-white mb-4">Cerrar Sesión</h3>
            <p className="text-gray-300 mb-6">¿Estás seguro de que quieres cerrar sesión?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors text-white font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded transition-colors text-white font-medium"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
