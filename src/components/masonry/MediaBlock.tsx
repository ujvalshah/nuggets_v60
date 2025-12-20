import React from 'react';
import { Article } from '@/types';
import { EmbeddedMedia } from '@/components/embeds/EmbeddedMedia';
import { Image } from '@/components/Image';
import { ImageGrid } from '@/components/card/atoms/ImageGrid';

interface MediaBlockProps {
  article: Article;
  onCategoryClick?: (category: string) => void;
}

/**
 * MediaBlock: Renders media nuggets directly without card wrapper
 * 
 * Rules:
 * - No card wrapper
 * - No background container
 * - No shadow
 * - Media element renders directly
 * - Optional minimal border-radius only if needed
 */
export const MediaBlock: React.FC<MediaBlockProps> = ({
  article,
  onCategoryClick,
}) => {
  const hasMedia = !!(article.media || (article.images && article.images.length > 0));
  if (!hasMedia) return null;

  // Prioritize images array when it has multiple images
  const validImages = article.images?.filter((img): img is string => 
    typeof img === 'string' && img.trim().length > 0
  ) || [];

  if (validImages.length > 0) {
    if (validImages.length > 1) {
      return (
        <div className="w-full">
          <ImageGrid
            images={validImages}
            onImageClick={() => {}}
            className="w-full"
            articleTitle={article.title}
          />
        </div>
      );
    } else {
      // Single image: render directly
      return (
        <div className="w-full">
          <Image
            src={validImages[0]}
            alt={article.title ? `Image for ${article.title}` : 'Article image'}
            className="w-full h-auto object-contain"
          />
        </div>
      );
    }
  }

  // Fallback to media if no valid images
  if (article.media) {
    return (
      <div className="w-full">
        <EmbeddedMedia
          media={article.media}
          onClick={() => {}}
        />
      </div>
    );
  }

  return null;
};

