import React from 'react';
import { Share2 } from 'lucide-react';

interface ShareItemData {
  type: 'nugget' | 'collection';
  id: string;
  title: string;
  shareUrl: string;
}

interface ShareMenuProps {
  data: ShareItemData;
  meta?: { text?: string; author?: string };
  className?: string;
  iconSize?: number;
}

export const ShareMenu: React.FC<ShareMenuProps> = ({ 
  data, 
  className = '',
  iconSize = 14 
}) => {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.title,
          url: data.shareUrl
        });
      } catch (e) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(data.shareUrl);
    }
  };

  return (
    <button 
      onClick={handleShare} 
      className={`w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors ${className}`}
      title="Share"
    >
      <Share2 size={iconSize} strokeWidth={1.5} />
    </button>
  );
};


