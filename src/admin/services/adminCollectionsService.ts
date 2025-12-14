
import { AdminCollection } from '../types/admin';
import { MOCK_ADMIN_COLLECTIONS } from './mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class AdminCollectionsService {
  private collections = [...MOCK_ADMIN_COLLECTIONS];

  async listCollections(query?: string): Promise<AdminCollection[]> {
    await delay(600);
    if (!query) return this.collections;
    const q = query.toLowerCase();
    return this.collections.filter(c => c.name.toLowerCase().includes(q));
  }

  async getCollectionDetails(id: string): Promise<AdminCollection | undefined> {
    await delay(300);
    return this.collections.find(c => c.id === id);
  }

  async getStats(): Promise<{ totalCommunity: number; totalNuggetsInCommunity: number }> {
    await delay(200);
    const publicCols = this.collections.filter(c => c.type === 'public');
    return {
      totalCommunity: publicCols.length,
      totalNuggetsInCommunity: publicCols.reduce((acc, c) => acc + c.itemCount, 0)
    };
  }

  async updateCollectionStatus(id: string, status: 'active' | 'hidden'): Promise<void> {
    await delay(400);
    this.collections = this.collections.map(c => c.id === id ? { ...c, status } : c);
  }

  async deleteCollection(id: string): Promise<void> {
    await delay(500);
    this.collections = this.collections.filter(c => c.id !== id);
  }
}

export const adminCollectionsService = new AdminCollectionsService();
