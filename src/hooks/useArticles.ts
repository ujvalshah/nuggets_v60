import { useQuery } from '@tanstack/react-query';
import { articleService } from '@/services/articleService';
import { FilterState, SortOrder } from '@/types';

interface UseArticlesOptions {
  searchQuery: string;
  selectedCategories: string[];
  selectedTag: string | null;
  sortOrder: SortOrder;
  userId?: string;
  limit?: number;
}

export const useArticles = ({
  searchQuery,
  selectedCategories,
  selectedTag,
  sortOrder,
  limit
}: UseArticlesOptions) => {
  return useQuery({
    queryKey: ['articles', 'discover', searchQuery, selectedCategories, selectedTag, sortOrder, limit],
    queryFn: async () => {
      // Standard Discover Feed
      const filters: FilterState = {
        query: searchQuery,
        categories: selectedCategories,
        tag: selectedTag,
        sort: sortOrder,
        limit
      };
      return articleService.getArticles(filters);
    },
    // Keep previous data to avoid flickering
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};


