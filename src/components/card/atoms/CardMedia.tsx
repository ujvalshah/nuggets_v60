import React, { useCallback, useMemo } from 'react';
import { Article } from '@/types';
import { EmbeddedMedia } from '@/components/embeds/EmbeddedMedia';
import { Image } from '@/components/Image';
import { ImageGrid } from './ImageGrid';
import { Lock } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface CardMediaProps {
  media: Article['media'];
  images: string[] | undefined;
  visibility: 'public' | 'private' | undefined;
  onMediaClick: (e: React.MouseEvent, imageIndex?: number) => void;
  className?: string;
  articleTitle?: string; // For generating meaningful alt text
}

export const CardMedia: React.FC<CardMediaProps> = React.memo(({
  media,
  images,
  visibility,
  onMediaClick,
  className,
  articleTitle,
}) => {
  const hasMedia = !!media || (images && images.length > 0);

  // Memoize aspect ratio calculations
  const { aspectRatio, backgroundClass, isDocument, isSocialMedia, isImageOnly } = useMemo(() => {
    if (!hasMedia) return { aspectRatio: undefined, backgroundClass: '', isDocument: false, isSocialMedia: false, isImageOnly: false };

    // FIX #1: Aspect ratio validation and fallback
    // aspect_ratio is stored as string like "16/9" or "4/3"
    // CSS aspect-ratio property requires valid format: /^\d+\/\d+$/
    // Invalid formats can cause layout shifts, so we validate strictly
    const validateAspectRatio = (ratio: string): boolean => {
      return /^\d+\/\d+$/.test(ratio.trim());
    };

    // For YouTube videos, use 16:9 aspect ratio and remove background
    const isYouTube = media?.type === 'youtube';
    // For documents, use fixed height instead of aspect ratio (compact horizontal layout)
    const isDoc = media?.type === 'document' || 
                     media?.type === 'link' && (
                       media?.url?.toLowerCase().includes('drive.google.com') ||
                       media?.url?.toLowerCase().includes('docs.google.com') ||
                       media?.previewMetadata?.title?.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip)$/i)
                     );
    // For LinkedIn/Twitter links, use compact horizontal layout (always, regardless of images)
    const isSocial = media?.type === 'linkedin' || media?.type === 'twitter' || 
                        media?.url?.toLowerCase().includes('linkedin.com') ||
                        media?.url?.toLowerCase().includes('twitter.com') ||
                        media?.url?.toLowerCase().includes('x.com');
    
    // For images without media object, don't force aspect ratio (let image determine)
    const isImage = !media && images && images.length > 0;
    
    const rawAspectRatio = media?.aspect_ratio?.trim();
    const aspect = isYouTube 
      ? '16/9' // YouTube videos are always 16:9
      : (rawAspectRatio && validateAspectRatio(rawAspectRatio)
        ? rawAspectRatio
        : isImage 
          ? undefined // Let images use their natural aspect ratio
          : '4/3'); // Safe fallback for invalid or missing ratios (only for media)

    // For documents and social media, use transparent/light background (they have their own styling)
    const bgClass = isYouTube 
      ? 'bg-transparent' 
      : (isDoc || isSocial)
      ? 'bg-transparent'
      : 'bg-slate-100 dark:bg-slate-800';

    return { aspectRatio: aspect, backgroundClass: bgClass, isDocument: isDoc, isSocialMedia: isSocial, isImageOnly: isImage };
  }, [hasMedia, media, images]);

  if (!hasMedia) return null;

  // Memoize image click handler
  const handleImageClick = useCallback((index: number) => {
    const syntheticEvent = {
      stopPropagation: () => {},
      preventDefault: () => {}
    } as React.MouseEvent;
    onMediaClick(syntheticEvent, index);
  }, [onMediaClick]);

  return (
    <div
      className={twMerge(
        // Design System: Base media styling - variants override with specific aspect ratios
        'w-full rounded-xl overflow-hidden relative shrink-0 cursor-pointer group/media',
        backgroundClass,
        // For documents and social media links, use fixed height instead of aspect ratio
        (isDocument || isSocialMedia) ? 'h-16' : '',
        className
      )}
      style={
        className?.includes('aspect-') || isDocument || isSocialMedia || isImageOnly 
          ? {} 
          : aspectRatio 
            ? { aspectRatio } 
            : {}
      }
      onClick={onMediaClick}
    >
      {/* Prioritize images array when it has multiple images, even if media exists */}
      {(() => {
        // Filter out any null, undefined, or empty image URLs
        const validImages = images?.filter((img): img is string => 
          typeof img === 'string' && img.trim().length > 0
        ) || [];
        
        if (validImages.length > 0) {
          if (validImages.length > 1) {
            return (
              <ImageGrid
                images={validImages}
                onImageClick={handleImageClick}
                className="w-full h-full"
                articleTitle={articleTitle}
              />
            );
          } else {
            // Single image: use object-contain to avoid cropping, preserve aspect ratio
            return (
              <div className="w-full h-full flex items-center justify-center">
                <Image
                  src={validImages[0]}
                  alt={articleTitle ? `Image for ${articleTitle}` : 'Article image'}
                  className="max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-500 group-hover/media:scale-105"
                />
              </div>
            );
          }
        }
        
        // Fallback to media if no valid images
        if (media) {
          return <EmbeddedMedia media={media} onClick={onMediaClick} />;
        }
        
        return null;
      })()}

      {/* Removed all platform badges - keeping only private visibility indicator */}
      {visibility === 'private' && (
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white p-1 rounded-full">
          <Lock size={10} />
        </div>
      )}
    </div>
  );
});

