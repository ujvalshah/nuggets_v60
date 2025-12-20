import React from 'react';
import { Article } from '@/types';

interface TextBlockProps {
  article: Article;
  onCategoryClick?: (category: string) => void;
}

/**
 * TextBlock: Lightweight text renderer for text-only nuggets
 * 
 * Rules:
 * - No card wrapper
 * - Minimal transparent hit-box only for hover/click
 * - No persistent background
 * - Title is primary element
 * - Body text clamped to 4-6 lines with fade-out mask
 * - Metadata hidden by default, appears only on hover
 */
export const TextBlock: React.FC<TextBlockProps> = ({
  article,
  onCategoryClick,
}) => {
  const title = article.title || '';
  const content = article.excerpt || article.content || '';
  
  // Format date for metadata (only show on hover)
  const formattedDate = React.useMemo(() => {
    if (!article.publishedAt) return '';
    try {
      const date = new Date(article.publishedAt);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }, [article.publishedAt]);

  return (
    <div className="w-full py-2">
      {/* Title - Primary element */}
      {title && (
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2 leading-tight">
          {title}
        </h3>
      )}

      {/* Body text - Clamped with fade-out */}
      {content && (
        <div className="relative">
          <p
            className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-5"
            style={{
              WebkitLineClamp: 5,
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {content}
          </p>
          {/* Fade-out mask at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-slate-900 dark:via-slate-900/90 pointer-events-none" />
        </div>
      )}

      {/* Metadata - Hidden by default, shown on hover via parent group */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 mt-2">
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {formattedDate}
        </span>
      </div>
    </div>
  );
};

