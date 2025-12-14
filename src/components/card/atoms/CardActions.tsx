import React from 'react';
import { Bookmark, FolderPlus, MoreVertical, Flag, Trash2, Edit2 } from 'lucide-react';
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
  onSave: () => void;
  onAddToCollection?: () => void;
  onReport?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showMenu: boolean;
  onToggleMenu: (e: React.MouseEvent) => void;
  menuRef: React.RefObject<HTMLDivElement>;
  bookmarkButtonRef: React.RefObject<HTMLButtonElement>;
  className?: string;
}

export const CardActions: React.FC<CardActionsProps> = ({
  articleId,
  articleTitle,
  articleExcerpt,
  authorName,
  isSaved,
  isOwner,
  isAdmin,
  onSave,
  onAddToCollection,
  onReport,
  onEdit,
  onDelete,
  showMenu,
  onToggleMenu,
  menuRef,
  bookmarkButtonRef,
  className,
}) => {
  return (
    <div className={twMerge('flex items-center gap-1', className)}>
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

      {onAddToCollection && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCollection();
          }}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          title="Add to Collection"
        >
          <FolderPlus size={14} />
        </button>
      )}

      <button
        ref={bookmarkButtonRef}
        onClick={(e) => {
          e.stopPropagation();
          onSave();
        }}
        className={`w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
          isSaved ? 'text-primary-600' : 'text-slate-400'
        }`}
        title="Bookmark"
      >
        <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
      </button>

      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMenu(e);
          }}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
        >
          <MoreVertical size={14} />
        </button>
        {showMenu && (
          <div className="absolute right-0 bottom-full mb-1 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-20 overflow-hidden">
            {isOwner || isAdmin ? (
              onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Edit2 size={12} /> Edit
                </button>
              )
            ) : null}

            {onReport && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReport();
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-2"
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
                className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
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
