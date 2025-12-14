import { IAdapter } from './IAdapter';
import { Article, User, Collection } from '@/types';
import { apiClient } from '@/services/apiClient';

/**
 * Normalize MongoDB document to Article format (_id -> id)
 */
const normalizeArticle = (doc: any): Article => {
  if (!doc) return doc;
  // If already has id and no _id, return as-is
  if (doc.id && !doc._id) return doc as Article;
  // If has _id, copy it to id
  if (doc._id) {
    const { _id, ...rest } = doc;
    return { ...rest, id: _id } as Article;
  }
  return doc as Article;
};

const normalizeArticles = (docs: any[]): Article[] => {
  return docs.map(normalizeArticle);
};

export class RestAdapter implements IAdapter {
  // --- Articles ---
  async getAllArticles(): Promise<Article[]> {
    const articles = await apiClient.get<any[]>('/articles');
    return normalizeArticles(articles);
  }

  async getArticleById(id: string): Promise<Article | undefined> {
    const article = await apiClient.get<any>(`/articles/${id}`).catch(() => undefined);
    return article ? normalizeArticle(article) : undefined;
  }

  async getArticlesByAuthor(authorId: string): Promise<Article[]> {
    const articles = await apiClient.get<any[]>(`/articles?authorId=${authorId}`);
    return normalizeArticles(articles);
  }

  async createArticle(article: Omit<Article, 'id' | 'publishedAt'>): Promise<Article> {
    const created = await apiClient.post<any>('/articles', article);
    return normalizeArticle(created);
  }

  async updateArticle(id: string, updates: Partial<Article>): Promise<Article | null> {
    const updated = await apiClient.put<any>(`/articles/${id}`, updates).catch(() => null);
    return updated ? normalizeArticle(updated) : null;
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
    const feed = await apiClient.get<{ articles: any[], newCount: number }>(`/users/${userId}/feed`);
    return {
      articles: normalizeArticles(feed.articles || []),
      newCount: feed.newCount || 0
    };
  }

  // --- Categories ---
  getCategories(): Promise<string[]> {
    return apiClient.get('/categories');
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


