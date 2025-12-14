import { storageService } from './storageService';
import { Article, FilterState } from '@/types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const articleService = {
  getArticles: async (filters: FilterState): Promise<Article[]> => {
    // Simulate network delay
    await delay(300);

    // Fetch from dynamic storage
    let filtered = await storageService.getAllArticles();

    // 1. Filter by Query
    if (filters.query) {
      const q = filters.query.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(q) || 
        a.excerpt.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.categories.some(cat => cat.toLowerCase().includes(q)) ||
        a.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    // 2. Filter by Categories (Multiple)
    if (filters.categories && filters.categories.length > 0) {
      // Check if the article has ANY of the selected categories
      filtered = filtered.filter(a => 
        a.categories.some(cat => filters.categories.includes(cat))
      );
    }

    // 3. Filter by Tag
    if (filters.tag) {
      filtered = filtered.filter(a => a.tags.includes(filters.tag!));
    }

    // 4. Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      return filters.sort === 'oldest' ? dateA - dateB : dateB - dateA;
    });

    // 5. Limit
    if (filters.limit && filters.limit > 0) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  },

  getArticleById: async (id: string): Promise<Article | undefined> => {
    await delay(200);
    return storageService.getArticleById(id);
  }
};


