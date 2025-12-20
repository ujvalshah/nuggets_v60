import React from 'react';
import { Article } from '@/types';
import { MasonryAtom } from './masonry/MasonryAtom';
import { useMasonry } from '@/hooks/useMasonry';

interface MasonryGridProps {
  articles: Article[];
  isLoading: boolean;
  onArticleClick: (article: Article) => void;
  onCategoryClick: (category: string) => void;
  currentUserId?: string;
  onTagClick?: (tag: string) => void;
}

/**
 * MasonryGrid: Dedicated Masonry layout renderer
 * 
 * Architecture:
 * - Uses useMasonry hook for layout logic (Layer 1)
 * - Renders flex-based columns (Layer 2)
 * - Uses MasonryAtom for content-first rendering (Layer 3)
 * 
 * Rules:
 * - Deterministic Round-Robin distribution (index % columnCount)
 * - Flex-based columns (NOT CSS columns)
 * - SSR-safe (uses defaultColumns on server)
 * - Debounced resize handling
 * - Fixed gap (~1rem)
 * - Fixed column count per breakpoint
 * - NO card components
 * - NO card styling
 */
export const MasonryGrid: React.FC<MasonryGridProps> = ({
  articles,
  isLoading,
  onArticleClick,
  onCategoryClick,
  currentUserId,
  onTagClick,
}) => {
  // Layer 1: Layout logic (delegated to hook)
  const { columns, columnCount } = useMasonry(articles, {
    breakpoints: [
      { minWidth: 0, columnCount: 1 },      // < 768px: 1 column
      { minWidth: 768, columnCount: 3 },    // 768-1024: 3 columns (tablet)
      { minWidth: 1024, columnCount: 4 },  // 1024-1536: 4 columns (desktop)
      { minWidth: 1536, columnCount: 5 },  // >= 1536: 5 columns (large desktop)
    ],
    defaultColumns: 1, // SSR-safe default (mobile-first, reduces CLS)
    debounceMs: 100,
  });

  // Layer 2: Presentational rendering only
  if (isLoading) {
    return (
      <div className="flex gap-4 w-full">
        {Array.from({ length: columnCount }).map((_, colIdx) => (
          <div key={colIdx} className="flex-1 flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-100 dark:bg-slate-800 h-80 animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 w-full">
      {columns.map((columnArticles, colIdx) => (
        <div key={colIdx} className="flex-1 flex flex-col gap-4">
          {columnArticles.map((article) => (
            <MasonryAtom
              key={article.id}
              article={article}
              onArticleClick={onArticleClick}
              onCategoryClick={onCategoryClick}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

