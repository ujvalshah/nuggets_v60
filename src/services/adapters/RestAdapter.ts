import { IAdapter, PaginatedArticlesResponse } from './IAdapter';
import { Article, User, Collection } from '@/types';
import { apiClient } from '@/services/apiClient';

export class RestAdapter implements IAdapter {
  // --- Articles ---
  getAllArticles(params?: { q?: string; page?: number; limit?: number }): Promise<Article[]> {
    const queryParams = new URLSearchParams();
    if (params?.q) queryParams.set('q', params.q);
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    
    const endpoint = queryParams.toString() ? `/articles?${queryParams}` : '/articles';
    return apiClient.get<PaginatedArticlesResponse>(endpoint)
      .then(response => response.data);
  }

  // Paginated articles method - returns full pagination metadata
  getArticlesPaginated(params: { q?: string; page: number; limit: number; category?: string; sort?: string }): Promise<PaginatedArticlesResponse> {
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.set('q', params.q);
    if (params.category) queryParams.set('category', params.category);
    if (params.sort) queryParams.set('sort', params.sort);
    queryParams.set('page', params.page.toString());
    queryParams.set('limit', params.limit.toString());
    
    return apiClient.get<PaginatedArticlesResponse>(`/articles?${queryParams}`);
  }

  getArticleById(id: string): Promise<Article | undefined> {
    return apiClient.get<Article>(`/articles/${id}`).catch(() => undefined);
  }

  getArticlesByAuthor(authorId: string): Promise<Article[]> {
    return apiClient.get<PaginatedArticlesResponse>(`/articles?authorId=${authorId}`)
      .then(response => {
        if (!Array.isArray(response.data)) {
          throw new Error('Expected Article[] from getArticlesByAuthor, but received non-array data');
        }
        return response.data;
      });
  }

  createArticle(article: Omit<Article, 'id' | 'publishedAt'>): Promise<Article> {
    // Transform frontend format to server API format
    
    /**
     * PHASE 4: Tag Data Contract Enforcement
     * 
     * Backend validation requires:
     * - tags: string[] (non-empty, all elements must be non-empty strings)
     * 
     * This adapter normalizes and validates tags before sending to backend:
     * 1. Ensures tags is always an array
     * 2. Filters out invalid entries (null, undefined, empty strings)
     * 3. Rejects early if no valid tags remain (prevents backend validation error)
     */
    const tags = Array.isArray(article.tags) 
      ? article.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
      : [];
    
    // PHASE 5: Defensive validation - reject early if tags are empty
    // This prevents sending invalid payloads to backend and provides clearer error messages
    if (tags.length === 0) {
      return Promise.reject(new Error('At least one tag is required to create a nugget'));
    }
    
    const payload: any = {
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      authorId: article.author?.id || '',
      authorName: article.author?.name || '',
      // Server requires 'category' (singular, required string), use first category or 'General'
      category: article.categories && article.categories.length > 0 
        ? article.categories[0] 
        : 'General',
      categories: article.categories || [],
      tags: tags, // Use validated tags array
      readTime: article.readTime,
      visibility: article.visibility || 'public',
      publishedAt: new Date().toISOString(), // Generate timestamp for new articles
      // Include additional fields that might be in the Article type
      ...(article.images && article.images.length > 0 && { images: article.images }),
      ...(article.documents && article.documents.length > 0 && { documents: article.documents }),
      // Always include media if it exists (even if null, to explicitly clear it)
      ...(article.media !== undefined && { media: article.media }),
      ...(article.source_type && { source_type: article.source_type }),
      ...(article.displayAuthor && { displayAuthor: article.displayAuthor }),
    };
    
    return apiClient.post('/articles', payload);
  }

  updateArticle(id: string, updates: Partial<Article>): Promise<Article | null> {
    // Transform Article format to backend API format
    const payload: any = {};
    
    // Map editable fields
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.content !== undefined) payload.content = updates.content;
    if (updates.excerpt !== undefined) payload.excerpt = updates.excerpt;
    if (updates.categories !== undefined) {
      payload.categories = updates.categories;
      // Backend also requires category (singular) - use first category or 'General'
      payload.category = updates.categories && updates.categories.length > 0 
        ? updates.categories[0] 
        : 'General';
    }
    if (updates.visibility !== undefined) payload.visibility = updates.visibility;
    if (updates.media !== undefined) payload.media = updates.media;
    if (updates.images !== undefined) payload.images = updates.images;
    if (updates.documents !== undefined) payload.documents = updates.documents;
    if (updates.source_type !== undefined) payload.source_type = updates.source_type;
    if (updates.displayAuthor !== undefined) payload.displayAuthor = updates.displayAuthor;
    
    // Use PATCH for partial updates (more RESTful)
    return apiClient.patch<Article>(`/articles/${id}`, payload);
  }

  deleteArticle(id: string): Promise<boolean> {
    return apiClient.delete(`/articles/${id}`).then(() => true);
  }

  // --- Users ---
  getUsers(): Promise<User[]> {
    return apiClient.get<{ data: User[] } | User[]>('/users')
      .then(response => Array.isArray(response) ? response : (response.data || []));
  }

  getUserById(id: string): Promise<User | undefined> {
    return apiClient.get<User>(`/users/${id}`).catch(() => undefined);
  }

  updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    return apiClient.put(`/users/${id}`, updates);
  }

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  }

  // --- Personalization ---
  async updateUserPreferences(userId: string, interestedCategories: string[]): Promise<void> {
    await this.updateUser(userId, { preferences: { interestedCategories } });
  }

  async updateLastFeedVisit(userId: string): Promise<void> {
    await this.updateUser(userId, { lastFeedVisit: new Date().toISOString() });
  }

  async getPersonalizedFeed(userId: string): Promise<{ articles: Article[], newCount: number }> {
    return apiClient.get(`/users/${userId}/feed`);
  }

  // --- Categories ---
  async getCategories(): Promise<string[]> {
    // Backend returns Tag[] by default, but we need string[] for compatibility
    // Use ?format=simple to get array of tag names
    // Add cancelKey to prevent duplicate simultaneous requests
    try {
      const tags = await apiClient.get<any[]>('/categories?format=simple', undefined, 'restAdapter.getCategories');
      // If backend returns Tag objects, extract names
      if (tags && tags.length > 0 && typeof tags[0] === 'object') {
        return tags.map(tag => tag.name || tag);
      }
      return tags || [];
    } catch (error: any) {
      // Handle cancelled requests gracefully - return empty array instead of throwing
      if (error?.message === 'Request cancelled') {
        return [];
      }
      // Re-throw other errors
      throw error;
    }
  }

  async addCategory(category: string): Promise<void> {
    await apiClient.post('/categories', { name: category });
  }

  async deleteCategory(category: string): Promise<void> {
    await apiClient.delete(`/categories/${encodeURIComponent(category)}`);
  }

  // --- Collections ---
  getCollections(params?: { type?: 'public' | 'private'; includeCount?: boolean }): Promise<Collection[] | { data: Collection[]; count: number }> {
    // Add cancelKey to prevent duplicate simultaneous requests
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.set('type', params.type);
    if (params?.includeCount) queryParams.set('includeCount', 'true');
    
    const endpoint = queryParams.toString() ? `/collections?${queryParams}` : '/collections';
    return apiClient.get<Collection[] | { data: Collection[]; count: number }>(endpoint, undefined, 'restAdapter.getCollections')
      .then(response => {
        // Handle both array response (legacy) and object response (with count)
        if (Array.isArray(response)) {
          return response;
        }
        if (response && typeof response === 'object' && 'data' in response) {
          return response;
        }
        return [];
      });
  }

  getCollectionById(id: string): Promise<Collection | undefined> {
    return apiClient.get<Collection>(`/collections/${id}`).catch(() => undefined);
  }

  createCollection(name: string, description: string, creatorId: string, type: 'public' | 'private'): Promise<Collection> {
    return apiClient.post('/collections', { name, description, creatorId, type });
  }

  async deleteCollection(id: string): Promise<void> {
    await apiClient.delete(`/collections/${id}`);
  }

  updateCollection(id: string, updates: Partial<Collection>): Promise<Collection | null> {
    return apiClient.put(`/collections/${id}`, updates);
  }

  async addArticleToCollection(collectionId: string, articleId: string, userId: string): Promise<void> {
    await apiClient.post(`/collections/${collectionId}/entries`, { articleId, userId });
  }

  async removeArticleFromCollection(collectionId: string, articleId: string, userId: string): Promise<void> {
    await apiClient.delete(`/collections/${collectionId}/entries/${articleId}`);
  }

  async flagEntryAsIrrelevant(collectionId: string, articleId: string, userId: string): Promise<void> {
    await apiClient.post(`/collections/${collectionId}/entries/${articleId}/flag`, { userId });
  }

  async followCollection(collectionId: string): Promise<void> {
    await apiClient.post(`/collections/${collectionId}/follow`, {});
  }

  async unfollowCollection(collectionId: string): Promise<void> {
    await apiClient.post(`/collections/${collectionId}/unfollow`, {});
  }
}


