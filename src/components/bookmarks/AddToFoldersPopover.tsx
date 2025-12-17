import React, { useState, useEffect, useRef } from 'react';
import { Folder, Plus, Check, X } from 'lucide-react';
import { 
  getBookmarkFolders, 
  createBookmarkFolder, 
  addBookmarkToFolders, 
  removeBookmarkFromFolder, 
  getBookmarkFoldersForNugget, 
  createBookmark, 
  type BookmarkFolder 
} from '@/services/bookmarkFoldersService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

interface AddToFoldersPopoverProps {
  nuggetId: string | null;
  anchorElement: HTMLElement | null;
  onClose: () => void;
}

/**
 * AddToFoldersPopover - Fixed infinite loop
 * 
 * CRITICAL: useEffect depends ONLY on nuggetId
 * - No dependencies on toast, currentUserId, folders, or any other state
 * - Single effect for data fetching
 * - Simple cancellation flag (no AbortController needed)
 */
export const AddToFoldersPopover: React.FC<AddToFoldersPopoverProps> = ({
  nuggetId,
  anchorElement,
  onClose,
}) => {
  const { currentUserId } = useAuth();
  const toast = useToast();
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Component state
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);

  // SINGLE data-fetching effect - depends ONLY on nuggetId
  // This effect runs ONLY when nuggetId changes, preventing infinite loops
  useEffect(() => {
    if (!nuggetId) {
      // Reset state when no nuggetId (don't fetch)
      setFolders([]);
      setSelectedFolderIds(new Set());
      setBookmarkId(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);

      try {
        // Fetch both in parallel
        const [foldersData, assignedResponse] = await Promise.all([
          getBookmarkFolders(),
          getBookmarkFoldersForNugget(nuggetId).catch(() => null), // null if bookmark doesn't exist
        ]);

        if (cancelled) return;

        // Sort folders by order
        setFolders(foldersData.sort((a, b) => a.order - b.order));

        // Set selected folder IDs
        if (assignedResponse) {
          setSelectedFolderIds(new Set(assignedResponse.folderIds));
        } else {
          // Bookmark doesn't exist - default to General folder if available
          const generalFolder = foldersData.find(f => f.isDefault);
          if (generalFolder) {
            setSelectedFolderIds(new Set([generalFolder.id]));
          } else {
            setSelectedFolderIds(new Set());
          }
        }
      } catch (error: any) {
        if (cancelled) return;
        console.error('[AddToFoldersPopover] Failed to load folders:', error);
        toast.error('Failed to load folders');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [nuggetId]); // ONLY nuggetId - no toast, no currentUserId, no other dependencies

  // Click outside handler - separate effect with stable dependencies
  useEffect(() => {
    if (!nuggetId) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        anchorElement &&
        !anchorElement.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nuggetId]); // Only nuggetId - anchorElement and onClose are stable from parent

  // Focus input when creating folder - separate effect
  useEffect(() => {
    if (isCreatingFolder && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreatingFolder]);

  // Toggle folder membership
  const handleToggleFolder = async (folderId: string) => {
    if (!currentUserId || !nuggetId) return;

    const isCurrentlySelected = selectedFolderIds.has(folderId);
    const newSelectedIds = new Set(selectedFolderIds);

    // Optimistic update
    if (isCurrentlySelected) {
      newSelectedIds.delete(folderId);
    } else {
      newSelectedIds.add(folderId);
    }
    setSelectedFolderIds(newSelectedIds);

    try {
      // Create bookmark if it doesn't exist
      let currentBookmarkId = bookmarkId;
      if (!currentBookmarkId) {
        const result = await createBookmark(nuggetId);
        currentBookmarkId = result.bookmarkId;
        setBookmarkId(currentBookmarkId);
      }

      // Toggle folder membership
      if (isCurrentlySelected) {
        await removeBookmarkFromFolder(currentBookmarkId, folderId);
      } else {
        await addBookmarkToFolders(currentBookmarkId, [folderId]);
      }
    } catch (error: any) {
      // Rollback on error
      setSelectedFolderIds(new Set(selectedFolderIds));
      console.error('[AddToFoldersPopover] Failed to update folder:', error);
      toast.error('Failed to update folder');
    }
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !currentUserId || !nuggetId) return;

    const folderName = newFolderName.trim();
    setNewFolderName('');
    setIsCreatingFolder(false);

    try {
      // Create folder
      const newFolder = await createBookmarkFolder(folderName);
      setFolders(prev => [...prev, newFolder].sort((a, b) => a.order - b.order));

      // Auto-select new folder
      const newSelectedIds = new Set(selectedFolderIds);
      newSelectedIds.add(newFolder.id);
      setSelectedFolderIds(newSelectedIds);

      // Create bookmark if needed and add to folder
      let currentBookmarkId = bookmarkId;
      if (!currentBookmarkId) {
        const result = await createBookmark(nuggetId);
        currentBookmarkId = result.bookmarkId;
        setBookmarkId(currentBookmarkId);
      }

      await addBookmarkToFolders(currentBookmarkId, [newFolder.id]);
    } catch (error: any) {
      console.error('[AddToFoldersPopover] Failed to create folder:', error);
      toast.error(error.message || 'Failed to create folder');
      setIsCreatingFolder(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCreateFolder();
    } else if (e.key === 'Escape') {
      setIsCreatingFolder(false);
      setNewFolderName('');
    }
  };

  // Don't render if no nuggetId
  if (!nuggetId || !anchorElement) return null;

  // Calculate position
  const rect = anchorElement.getBoundingClientRect();
  const position = {
    top: rect.bottom + window.scrollY + 8,
    left: rect.right - 256, // 256px = w-64
  };

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Add to folders</h3>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="px-3 py-4 text-center text-xs text-slate-500">Loading...</div>
        ) : (
          <>
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleToggleFolder(folder.id)}
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
              >
                <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                  {selectedFolderIds.has(folder.id) ? (
                    <Check size={14} className="text-primary-600" />
                  ) : (
                    <div className="w-4 h-4 border border-slate-300 dark:border-slate-600 rounded" />
                  )}
                </div>
                <Folder size={14} className="text-slate-400" />
                <span className="flex-1">{folder.name}</span>
              </button>
            ))}

            {isCreatingFolder ? (
              <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Folder name"
                    className="flex-1 px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <button
                    onClick={handleCreateFolder}
                    className="p-1 text-primary-600 hover:text-primary-700"
                    title="Create"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingFolder(false);
                      setNewFolderName('');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600"
                    title="Cancel"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="w-full text-left px-3 py-2 text-xs font-medium text-primary-600 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700"
              >
                <Plus size={14} />
                <span>Create new folder</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
