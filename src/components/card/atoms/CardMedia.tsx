import React from 'react';
import { Article } from '@/types';
import { EmbeddedMedia } from '@/components/embeds/EmbeddedMedia';
import { Image } from '@/components/Image';
import { ExternalLink, Lock } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface CardMediaProps {
  media: Article['media'];
  images: string[] | undefined;
  sourceType: string | undefined;
  visibility: 'public' | 'private' | undefined;
  onMediaClick: (e: React.MouseEvent) => void;
  className?: string;
}

export const CardMedia: React.FC<CardMediaProps> = ({
  media,
  images,
  sourceType,
  visibility,
  onMediaClick,
  className,
}) => {
  const hasMedia = !!media || (images && images.length > 0);

  if (!hasMedia) return null;

  return (
    <div
      className={twMerge(
        'w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative shrink-0 cursor-pointer group/media',
        className
      )}
      onClick={onMediaClick}
    >
      {media ? (
        <EmbeddedMedia media={media} onClick={onMediaClick} />
      ) : (
        images && images.length > 0 && (
          <Image
            src={images[0]}
            className="w-full h-full object-cover transition-transform duration-500 group-hover/media:scale-105"
          />
        )
      )}

      <div className="absolute top-2 left-2 flex gap-1">
        {sourceType === 'link' && (
          <div className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide flex items-center gap-1 transition-transform group-hover/media:scale-105">
            <ExternalLink size={8} /> Link
          </div>
        )}
        {visibility === 'private' && (
          <div className="bg-black/60 backdrop-blur-sm text-white p-1 rounded-full">
            <Lock size={10} />
          </div>
        )}
      </div>
    </div>
  );
};
