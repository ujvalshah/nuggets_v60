import { AdminNugget, AdminNuggetStatus } from '../types/admin';
import { apiClient } from '@/services/apiClient';
import { mapArticleToAdminNugget, RawReport } from './adminApiMappers';
import { Article } from '@/types';

class AdminNuggetsService {
  async listNuggets(filter?: 'all' | 'flagged' | 'hidden'): Promise<AdminNugget[]> {
    // Fetch articles and reports in parallel for better performance
    const [articlesResponse, reportsResponse] = await Promise.all([
      apiClient.get<{ data: Article[] } | Article[]>('/articles'),
      apiClient.get<{ data: RawReport[] } | RawReport[]>('/moderation/reports')
    ]);
    
    // Handle paginated response format { data: [...], total, ... } or direct array
    const articles = Array.isArray(articlesResponse) ? articlesResponse : (articlesResponse.data || []);
    const reports = Array.isArray(reportsResponse) ? reportsResponse : (reportsResponse.data || []);
    
    // Ensure arrays
    if (!Array.isArray(articles) || !Array.isArray(reports)) {
      console.error('Expected arrays but got:', { articles: typeof articles, reports: typeof reports });
      return [];
    }
    
    // Filter by visibility (only show public in admin list)
    let filtered = articles.filter(a => a.visibility === 'public');
    const flaggedArticleIds = new Set(
      reports
        .filter(r => r.targetType === 'nugget' && r.status === 'open')
        .map(r => r.targetId)
    );
    
    // Map articles to AdminNuggets with report counts
    const nuggets = filtered.map(article => {
      const reportsCount = flaggedArticleIds.has(article.id) 
        ? reports.filter(r => r.targetId === article.id).length 
        : 0;
      return mapArticleToAdminNugget(article, reportsCount);
    });
    
    // Apply filter
    if (filter === 'flagged') {
      return nuggets.filter(n => n.status === 'flagged');
    }
    if (filter === 'hidden') {
      return nuggets.filter(n => n.status === 'hidden');
    }
    
    return nuggets;
  }

  async getNuggetDetails(id: string): Promise<AdminNugget | undefined> {
    const article = await apiClient.get<Article>(`/articles/${id}`);
    
    // Get reports for this article
    const reportsResponse = await apiClient.get<{ data: RawReport[] } | RawReport[]>('/moderation/reports');
    const reports = Array.isArray(reportsResponse) ? reportsResponse : (reportsResponse.data || []);
    
    if (!Array.isArray(reports)) {
      console.error('Expected reports array but got:', typeof reports);
      return mapArticleToAdminNugget(article, 0);
    }
    
    const reportsCount = reports.filter(r => r.targetId === id && r.targetType === 'nugget').length;
    
    return mapArticleToAdminNugget(article, reportsCount);
  }

  async getStats(): Promise<{ total: number; flagged: number; createdToday: number; public: number; private: number }> {
    // Fetch articles and reports in parallel for better performance
    const [articlesResponse, reportsResponse] = await Promise.all([
      apiClient.get<{ data: Article[] } | Article[]>('/articles', undefined, 'adminNuggetsService.getStats.articles'),
      apiClient.get<{ data: RawReport[] } | RawReport[]>('/moderation/reports', undefined, 'adminNuggetsService.getStats.reports')
    ]);
    
    // Handle paginated response format { data: [...], total, ... } or direct array
    const articles = Array.isArray(articlesResponse) ? articlesResponse : (articlesResponse.data || []);
    const reports = Array.isArray(reportsResponse) ? reportsResponse : (reportsResponse.data || []);
    
    // Ensure arrays
    if (!Array.isArray(articles) || !Array.isArray(reports)) {
      console.error('Expected arrays but got:', { articles: typeof articles, reports: typeof reports });
      return { total: 0, flagged: 0, createdToday: 0, public: 0, private: 0 };
    }
    
    const todayStr = new Date().toDateString();
    const flaggedArticleIds = new Set(
      reports
        .filter(r => r.targetType === 'nugget' && r.status === 'open')
        .map(r => r.targetId)
    );
    
    return {
      total: articles.length,
      flagged: flaggedArticleIds.size,
      createdToday: articles.filter(a => {
        const createdDate = new Date(a.publishedAt).toDateString();
        return createdDate === todayStr;
      }).length,
      public: articles.filter(a => a.visibility === 'public').length,
      private: articles.filter(a => a.visibility === 'private').length,
    };
  }

  async updateNuggetStatus(id: string, status: AdminNuggetStatus): Promise<void> {
    // Backend doesn't have status field for articles
    // For 'hidden', we could delete the article, but that's destructive
    // For 'flagged', we rely on reports
    // This would need backend support for article status
    if (status === 'hidden') {
      // Option: Delete article (destructive) or add backend status field
      throw new Error('Hiding articles not supported by backend. Use delete instead.');
    }
    // For 'active' or 'flagged', status is determined by reports
  }

  async deleteNugget(id: string): Promise<void> {
    await apiClient.delete(`/articles/${id}`);
  }
}

export const adminNuggetsService = new AdminNuggetsService();
