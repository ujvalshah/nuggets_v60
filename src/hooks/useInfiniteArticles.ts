import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { articleService, PaginatedArticlesResponse } from '@/services/articleService';
import { FilterState, SortOrder, Article } from '@/types';

interface UseInfiniteArticlesOptions {
  searchQuery: string;
  activeCategory: string; // 'All', 'Today', or category name
  sortOrder?: SortOrder;
  limit?: number;
}

/**
 * Unified infinite scroll hook using React Query's useInfiniteQuery
 * 
 * Phase 3: Replaces manual state management in Feed.tsx
 * - Handles pagination automatically
 * - Accumulates pages across fetches
 * - Resets on filter changes via query key
 * - Provides fetchNextPage for infinite scroll
 */
export interface UseInfiniteArticlesResult {
  articles: Article[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: Error | null;
  refetch: () => void;
}

export const useInfiniteArticles = ({
  searchQuery,
  activeCategory,
  sortOrder = 'latest',
  limit = 25,
}: UseInfiniteArticlesOptions): UseInfiniteArticlesResult => {
  // useInfiniteQuery automatically handles:
  // - Page accumulation
  // - Reset on query key change (category/search/sort changes)
  // - Caching
  // - Race condition protection
  const query = useInfiniteQuery<PaginatedArticlesResponse>({
    queryKey: ['articles', 'infinite', searchQuery.trim(), activeCategory, sortOrder, limit],
    queryFn: async ({ pageParam = 1 }) => {
      // Build filters inside queryFn to avoid stale closures
      // Determine category parameter for backend
      const categoryParam = activeCategory === 'All' || activeCategory === 'Today'
        ? []
        : [activeCategory];

      // Build filter state
      const filters: FilterState = {
        query: searchQuery.trim() || undefined,
        categories: categoryParam,
        tag: null,
        sort: sortOrder,
        limit,
      };

      return articleService.getArticles(filters, pageParam as number);
    },
    getNextPageParam: (lastPage) => {
      // Return next page number if there are more pages
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 30, // 30 seconds
    // Keep previous data during refetch to avoid flickering
    placeholderData: (previousData) => previousData,
  });

  // Accumulate all pages into a single articles array (memoized)
  const articles = useMemo(() => {
    return query.data?.pages.flatMap((page) => page.data) || [];
  }, [query.data?.pages]);

  // Filter "Today" client-side (backend doesn't support date filtering)
  // Memoized to prevent unnecessary re-renders
  const filteredArticles = useMemo(() => {
    if (activeCategory !== 'Today') return articles;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    return articles.filter((article) => {
      const publishedDate = new Date(article.publishedAt);
      return publishedDate >= today && publishedDate <= todayEnd;
    });
  }, [articles, activeCategory]);

  return {
    articles: filteredArticles,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: () => query.fetchNextPage(),
    error: query.error as Error | null,
    refetch: () => query.refetch(),
  };
};

