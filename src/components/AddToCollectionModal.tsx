import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleIds: string[];
  mode?: 'public' | 'private';
}

export const AddToCollectionModal: React.FC<AddToCollectionModalProps> = ({ 
  isOpen, 
  onClose, 
  articleIds,
  mode = 'public' 
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add to Collection</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Collection feature coming soon...
        </p>
      </div>
    </div>,
    document.body
  );
};

