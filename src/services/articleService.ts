import { storageService } from './storageService';
import { PaginatedArticlesResponse } from './adapters/IAdapter';
import { Article, FilterState } from '@/types';

export type { PaginatedArticlesResponse };

export const articleService = {
  getArticles: async (filters: FilterState, page: number = 1): Promise<PaginatedArticlesResponse> => {
    // Backend pagination is the single source of truth
    // Backend supports: q (search), page, limit
    // Backend does NOT support: categories filter, tag filter, sort order
    // Note: Categories/tag filters are ignored - backend limitation
    // Note: Sort order is always 'latest' - backend limitation
    
    const limit = filters.limit || 25;
    
    // Use type-safe interface method - no casting required
    // If adapter doesn't support pagination, it will throw a clear error
    try {
      return await storageService.getArticlesPaginated({
        q: filters.query || undefined,
        page,
        limit
      });
    } catch (error: any) {
      // Re-throw with context if it's an adapter capability error
      if (error.message && error.message.includes('not supported')) {
        throw new Error(`Pagination not available: ${error.message}`);
      }
      // Propagate API errors as-is
      throw error;
    }
  },

  getArticleById: async (id: string): Promise<Article | undefined> => {
    return storageService.getArticleById(id);
  }
};


