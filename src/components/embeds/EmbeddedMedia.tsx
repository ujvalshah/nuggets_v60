import React from 'react';
import { NuggetMedia } from '@/types';
import { Image } from '@/components/Image';

interface EmbeddedMediaProps {
  media: NuggetMedia;
  onClick?: (e: React.MouseEvent) => void;
}

export const EmbeddedMedia: React.FC<EmbeddedMediaProps> = ({ media, onClick }) => {
  const { url, type } = media;

  if (type === 'image') {
    return (
      <div className="w-full h-full relative overflow-hidden bg-slate-100 dark:bg-slate-900 rounded-xl" onClick={onClick}>
        <Image 
          src={url} 
          alt={media.previewMetadata?.title || 'Image'} 
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105 cursor-pointer"
        />
      </div>
    );
  }

  // Default: render as link preview
  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-100 dark:bg-slate-900 rounded-xl">
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block w-full h-full p-4 text-slate-600 dark:text-slate-300 hover:text-primary-500"
      >
        {media.previewMetadata?.title || url}
      </a>
    </div>
  );
};

