import React from 'react';
import { Bookmark, FolderPlus, MoreVertical, Flag, Trash2, Edit2, Globe, Lock } from 'lucide-react';
import { ShareMenu } from '@/components/shared/ShareMenu';
import { twMerge } from 'tailwind-merge';

interface CardActionsProps {
  articleId: string;
  articleTitle: string;
  articleExcerpt: string;
  authorName: string;
  isSaved: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  visibility?: 'public' | 'private';
  onSave?: () => void; // Made optional for preview mode
  onAddToCollection?: () => void;
  onReport?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleVisibility?: () => void;
  showMenu: boolean;
  onToggleMenu: (e: React.MouseEvent) => void;
  menuRef: React.RefObject<HTMLDivElement>;
  bookmarkButtonRef: React.RefObject<HTMLButtonElement>;
  className?: string;
  isPreview?: boolean; // Add preview flag to hide ShareMenu
}

export const CardActions: React.FC<CardActionsProps> = ({
  articleId,
  articleTitle,
  articleExcerpt,
  authorName,
  isSaved,
  isOwner,
  isAdmin,
  visibility,
  onSave,
  onAddToCollection,
  onReport,
  onEdit,
  onDelete,
  onToggleVisibility,
  showMenu,
  onToggleMenu,
  menuRef,
  bookmarkButtonRef,
  className,
  isPreview = false,
}) => {
  return (
    <div className={twMerge('flex items-center gap-0', className)}>
      {/* Hide ShareMenu in preview mode (preview IDs are invalid) */}
      {!isPreview && (
        <ShareMenu
          data={{
            type: 'nugget',
            id: articleId,
            title: articleTitle,
            shareUrl: `${window.location.origin}/#/article/${articleId}`,
          }}
          meta={{
            author: authorName,
            text: articleExcerpt,
          }}
        />
      )}


      {onAddToCollection && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCollection();
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all hover:scale-105 active:scale-95"
          title="Add to Collection"
        >
          <FolderPlus size={18} />
        </button>
      )}

      {/* Only show bookmark button if onSave handler exists */}
      {onSave && (
        <button
          ref={bookmarkButtonRef}
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          className={`w-10 h-10 -mr-1 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 ${
            isSaved ? 'text-primary-600 hover:text-primary-700' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
          title="Bookmark"
        >
          <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      )}

      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMenu(e);
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all hover:scale-105 active:scale-95"
          title="More options"
        >
          <MoreVertical size={18} />
        </button>
        {showMenu && (
          <div className="absolute right-0 bottom-full mb-1 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-20 overflow-hidden">
            {isOwner || isAdmin ? (
              onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <Edit2 size={12} /> Edit
                </button>
              )
            ) : null}

            {isOwner && onToggleVisibility && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisibility();
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
              >
                {visibility === 'private' ? (
                  <>
                    <Globe size={12} className="text-blue-500" /> Make Public
                  </>
                ) : (
                  <>
                    <Lock size={12} className="text-amber-500" /> Make Private
                  </>
                )}
              </button>
            )}

            {onReport && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReport();
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
              >
                <Flag size={12} /> Report
              </button>
            )}

            {(isOwner || isAdmin) && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
              >
                <Trash2 size={12} /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

