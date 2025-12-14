import React from 'react';
import { Article } from '@/types';
import { NewsCard } from './NewsCard';
import { EmptyState } from './UI/EmptyState';
import { SearchX } from 'lucide-react';
import { useRowExpansion } from '@/hooks/useRowExpansion';

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
    <div
      className={
        viewMode === 'feed'
          ? "max-w-2xl mx-auto flex flex-col gap-8"
          : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-auto items-stretch mx-auto w-full"
      }
    >
      {articles.map((article) => (
        <NewsCard
          key={article.id}
          ref={(el) => registerCard(article.id, el)}
          article={article}
          viewMode={viewMode}
          isBookmarked={isBookmarked(article.id)}
          onToggleBookmark={onToggleBookmark}
          onCategoryClick={onCategoryClick}
          onClick={onArticleClick}
          expanded={expandedId === article.id}
          onToggleExpand={() => toggleExpansion(article.id)}
          currentUserId={currentUserId}
          selectionMode={selectionMode}
          isSelected={selectedIds.includes(article.id)}
          onSelect={onSelect}
          onTagClick={onTagClick}
        />
      ))}
    </div>
  );
};

