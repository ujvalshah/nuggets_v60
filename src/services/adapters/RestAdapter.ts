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
  getArticlesPaginated(params: { q?: string; page: number; limit: number }): Promise<PaginatedArticlesResponse> {
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.set('q', params.q);
    queryParams.set('page', params.page.toString());
    queryParams.set('limit', params.limit.toString());
    
    return apiClient.get<PaginatedArticlesResponse>(`/articles?${queryParams}`);
  }

  getArticleById(id: string): Promise<Article | undefined> {
    return apiClient.get<Article>(`/articles/${id}`).catch(() => undefined);
  }

  getArticlesByAuthor(authorId: string): Promise<Article[]> {
    return apiClient.get(`/articles?authorId=${authorId}`);
  }

  createArticle(article: Omit<Article, 'id' | 'publishedAt'>): Promise<Article> {
    // Transform frontend format to server API format
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
      tags: article.tags || [],
      readTime: article.readTime,
      visibility: article.visibility || 'public',
      publishedAt: article.publishedAt,
      // Include additional fields that might be in the Article type
      ...(article.images && { images: article.images }),
      ...(article.documents && { documents: article.documents }),
      ...(article.media && { media: article.media }),
      ...(article.source_type && { source_type: article.source_type }),
      ...(article.displayAuthor && { displayAuthor: article.displayAuthor }),
    };
    
    return apiClient.post('/articles', payload);
  }

  updateArticle(id: string, updates: Partial<Article>): Promise<Article | null> {
    return apiClient.put(`/articles/${id}`, updates);
  }

  deleteArticle(id: string): Promise<boolean> {
    return apiClient.delete(`/articles/${id}`).then(() => true);
  }

  // --- Users ---
  getUsers(): Promise<User[]> {
    return apiClient.get('/users');
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
    const tags = await apiClient.get<any[]>('/categories?format=simple');
    // If backend returns Tag objects, extract names
    if (tags && tags.length > 0 && typeof tags[0] === 'object') {
      return tags.map(tag => tag.name || tag);
    }
    return tags;
  }

  async addCategory(category: string): Promise<void> {
    await apiClient.post('/categories', { name: category });
  }

  async deleteCategory(category: string): Promise<void> {
    await apiClient.delete(`/categories/${encodeURIComponent(category)}`);
  }

  // --- Collections ---
  getCollections(): Promise<Collection[]> {
    return apiClient.get('/collections');
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
}


