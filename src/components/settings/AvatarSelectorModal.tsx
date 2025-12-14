
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Upload, Image as ImageIcon } from 'lucide-react';
import { AvatarColor, AVATAR_COLORS } from '../../types/settings';
import { getInitials } from '../../utils/formatters';

interface AvatarSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentColor: string;
  onSelect: (result: { type: 'color' | 'image'; value: string }) => void;
  allowUpload?: boolean;
}

export const AvatarSelectorModal: React.FC<AvatarSelectorModalProps> = ({
  isOpen,
  onClose,
  currentName,
  currentColor,
  onSelect,
  allowUpload = true
}) => {
  const [activeTab, setActiveTab] = useState<'colors' | 'upload'>('colors');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            alert("Image must be less than 2MB");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            onSelect({ type: 'image', value: reader.result as string });
            onClose();
        };
        reader.readAsDataURL(file);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Choose Avatar</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs - Only show if upload is allowed */}
        {allowUpload && (
            <div className="flex p-2 bg-slate-50 dark:bg-slate-950/50 gap-1 border-b border-slate-100 dark:border-slate-800">
                <button 
                    onClick={() => setActiveTab('colors')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'colors' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    Presets
                </button>
                <button 
                    onClick={() => setActiveTab('upload')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'upload' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    Upload Image
                </button>
            </div>
        )}

        <div className="p-6">
            {(activeTab === 'colors' || !allowUpload) && (
                <div className="grid grid-cols-4 gap-4">
                {(Object.keys(AVATAR_COLORS) as AvatarColor[]).map((colorKey) => {
                    const bgClass = AVATAR_COLORS[colorKey];
                    const isSelected = currentColor === colorKey;
                    
                    return (
                    <button
                        key={colorKey}
                        onClick={() => { onSelect({ type: 'color', value: colorKey }); onClose(); }}
                        className={`
                        relative aspect-square rounded-full flex items-center justify-center
                        ${bgClass} text-white font-bold text-xl shadow-sm
                        hover:scale-110 transition-transform
                        ring-offset-2 ring-offset-white dark:ring-offset-slate-900
                        ${isSelected ? 'ring-2 ring-slate-900 dark:ring-white' : ''}
                        `}
                    >
                        {getInitials(currentName)}
                        {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                            <Check size={20} />
                        </div>
                        )}
                    </button>
                    );
                })}
                </div>
            )}

            {activeTab === 'upload' && allowUpload && (
                <div className="flex flex-col items-center justify-center gap-4">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                    >
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 group-hover:text-primary-500 transition-colors mb-2">
                            <Upload size={24} />
                        </div>
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200">
                            Click to upload image
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">Max 2MB</span>
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept="image/*"
                    />
                </div>
            )}
        </div>
      </div>
    </div>,
    document.body
  );
};
