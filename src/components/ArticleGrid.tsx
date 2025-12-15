import React from 'react';
import { Article } from '@/types';
import { NewsCard } from './NewsCard';
import { MasonryGrid } from './MasonryGrid';
import { EmptyState } from './UI/EmptyState';
import { SearchX } from 'lucide-react';
import { useRowExpansion } from '@/hooks/useRowExpansion';
import { ErrorBoundary } from './UI/ErrorBoundary';
import { sanitizeArticle } from '@/utils/errorHandler';

interface ArticleGridProps {
  articles: Article[];
  viewMode: 'grid' | 'feed' | 'masonry' | 'utility';
  isLoading: boolean;
  onArticleClick: (article: Article) => void;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
  onCategoryClick: (category: string) => void;
  emptyTitle?: string;
  emptyMessage?: string;
  currentUserId?: string;
  // Selection Props
  selectionMode?: boolean;
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  onTagClick?: (tag: string) => void;
}

export const ArticleGrid: React.FC<ArticleGridProps> = ({
  articles,
  viewMode,
  isLoading,
  onArticleClick,
  isBookmarked,
  onToggleBookmark,
  onCategoryClick,
  emptyTitle = "No nuggets found",
  emptyMessage = "Try adjusting your search or filters.",
  currentUserId,
  selectionMode = false,
  selectedIds = [],
  onSelect,
  onTagClick
}) => {
  const { expandedId, toggleExpansion, registerCard } = useRowExpansion();

  // FIX #2: Remove duplicate masonry loading logic
  // MasonryGrid handles its own loading state with correct column count
  // This prevents visual mismatch between loading and loaded states
  if (isLoading && viewMode !== 'masonry') {
    return (
      <div
        className={
          viewMode === 'feed'
            ? "max-w-2xl mx-auto flex flex-col gap-8"
            : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-auto items-stretch mx-auto w-full"
        }
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-slate-100 dark:bg-slate-800 rounded-2xl h-80 animate-pulse" />
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <EmptyState
        icon={<SearchX />}
        title={emptyTitle}
        description={emptyMessage}
      />
    );
  }

  // Render masonry layout
  if (viewMode === 'masonry') {
    return (
      <MasonryGrid
        articles={articles}
        isLoading={isLoading}
        onArticleClick={onArticleClick}
        isBookmarked={isBookmarked}
        onToggleBookmark={onToggleBookmark}
        onCategoryClick={onCategoryClick}
        currentUserId={currentUserId}
        onTagClick={onTagClick}
      />
    );
  }

  // Render feed, grid, or utility layout
  // Debug: Log viewMode to verify it's being passed correctly
  if (process.env.NODE_ENV === 'development' && viewMode === 'utility') {
    console.log('[ArticleGrid] Rendering utility viewMode for', articles.length, 'articles');
  }
  
  return (
    <div
      className={
        viewMode === 'feed'
          ? "max-w-2xl mx-auto flex flex-col gap-8"
          : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-auto items-stretch mx-auto w-full"
      }
    >
      {articles.map((article) => {
        // Sanitize article data before rendering
        const sanitized = sanitizeArticle(article);
        if (!sanitized) {
          console.warn('[ArticleGrid] Skipping invalid article:', article);
          return null;
        }
        
        return (
          <ErrorBoundary key={sanitized.id} fallback={<div className="p-4 text-sm text-slate-500">Failed to load nugget</div>}>
            <NewsCard
              ref={(el) => registerCard(sanitized.id, el)}
              article={sanitized}
              viewMode={viewMode}
              isBookmarked={isBookmarked(sanitized.id)}
              onToggleBookmark={onToggleBookmark}
              onCategoryClick={onCategoryClick}
              onClick={onArticleClick}
              currentUserId={currentUserId}
              onTagClick={onTagClick}
            />
          </ErrorBoundary>
        );
      })}
    </div>
  );
};


