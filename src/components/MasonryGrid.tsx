import React from 'react';
import { Article } from '@/types';
import { NewsCard } from './NewsCard';
import { useRowExpansion } from '@/hooks/useRowExpansion';
import { useMasonry } from '@/hooks/useMasonry';

interface MasonryGridProps {
  articles: Article[];
  isLoading: boolean;
  onArticleClick: (article: Article) => void;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
  onCategoryClick: (category: string) => void;
  currentUserId?: string;
  onTagClick?: (tag: string) => void;
}

/**
 * PRESENTATIONAL Masonry Grid Component
 * 
 * Architecture:
 * - Uses useMasonry hook for layout logic (Layer 1)
 * - Renders flex-based columns (Layer 2)
 * - No layout logic beyond flex structure
 * - No business logic
 * - No measurements
 * - No conditional reshuffling
 * 
 * Rules:
 * - Deterministic Round-Robin distribution (index % columnCount)
 * - Flex-based columns (NOT CSS columns)
 * - SSR-safe (uses defaultColumns on server)
 * - Debounced resize handling
 * - No height measurement
 * - No shortest-column logic
 */
export const MasonryGrid: React.FC<MasonryGridProps> = ({
  articles,
  isLoading,
  onArticleClick,
  isBookmarked,
  onToggleBookmark,
  onCategoryClick,
  currentUserId,
  onTagClick
}) => {
  const { registerCard } = useRowExpansion();
  
  // Layer 1: Layout logic (delegated to hook)
  const { columns, columnCount } = useMasonry(articles, {
    breakpoints: [
      { minWidth: 0, columnCount: 1 },      // < 768px: 1 column
      { minWidth: 768, columnCount: 2 },    // 768-1024: 2 columns
      { minWidth: 1024, columnCount: 3 },   // 1024-1536: 3 columns
      { minWidth: 1536, columnCount: 4 },   // >= 1536: 4 columns
    ],
    defaultColumns: 3, // SSR-safe default (matches expected desktop render)
    debounceMs: 100,
  });

  // Layer 2: Presentational rendering only
  if (isLoading) {
    return (
      <div className="flex gap-6 w-full">
        {Array.from({ length: columnCount }).map((_, colIdx) => (
          <div key={colIdx} className="flex-1 flex flex-col gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-100 dark:bg-slate-800 rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-6 w-full">
      {columns.map((columnArticles, colIdx) => (
        <div key={colIdx} className="flex-1 flex flex-col gap-6">
          {columnArticles.map((article) => (
            <NewsCard
              key={article.id}
              ref={(el) => registerCard(article.id, el)}
              article={article}
              viewMode="masonry"
              isBookmarked={isBookmarked(article.id)}
              onToggleBookmark={onToggleBookmark}
              onCategoryClick={onCategoryClick}
              onClick={onArticleClick}
              currentUserId={currentUserId}
              onTagClick={onTagClick}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
