import React from 'react';
import { Article } from '@/types';
import { NewsCard } from './NewsCard';
import { EmptyState } from './UI/EmptyState';
import { ErrorBoundary } from './UI/ErrorBoundary';
import { SearchX } from 'lucide-react';
import { useRowExpansion } from '@/hooks/useRowExpansion';
import { getArticleId } from '@/utils/formatters';

interface ArticleGridProps {
  articles: Article[];
  viewMode: 'grid' | 'feed';
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

  if (isLoading) {
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

  return (
    <ErrorBoundary>
      <div
        className={
          viewMode === 'feed'
            ? "max-w-2xl mx-auto flex flex-col gap-8"
            : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-auto items-stretch mx-auto w-full"
        }
      >
        {articles.map((article) => {
          const articleId = getArticleId(article);
          // Skip articles without valid IDs
          if (!articleId) {
            console.warn('Article missing ID, skipping:', article);
            return null;
          }
          return (
            <ErrorBoundary key={articleId} fallback={null}>
              <NewsCard
                ref={(el) => registerCard(articleId, el)}
                article={article}
                viewMode={viewMode}
                isBookmarked={isBookmarked(articleId)}
                onToggleBookmark={onToggleBookmark}
                onCategoryClick={onCategoryClick}
                onClick={onArticleClick}
                expanded={expandedId === articleId}
                onToggleExpand={() => toggleExpansion(articleId)}
                currentUserId={currentUserId}
                selectionMode={selectionMode}
                isSelected={selectedIds.includes(articleId)}
                onSelect={onSelect}
                onTagClick={onTagClick}
              />
            </ErrorBoundary>
          );
        })}
      </div>
    </ErrorBoundary>
  );
};


