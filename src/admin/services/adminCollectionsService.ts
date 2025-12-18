import { AdminCollection } from '../types/admin';
import { apiClient } from '@/services/apiClient';
import { mapCollectionToAdminCollection } from './adminApiMappers';
import { Collection } from '@/types';

class AdminCollectionsService {
  async listCollections(query?: string): Promise<AdminCollection[]> {
    const endpoint = query ? `/collections?q=${encodeURIComponent(query)}` : '/collections';
    const response = await apiClient.get<Collection[]>(endpoint, undefined, 'adminCollectionsService.listCollections');
    
    // Collections endpoint returns array directly (not paginated)
    const collections = Array.isArray(response) ? response : [];
    
    if (!Array.isArray(collections)) {
      console.error('Expected collections array but got:', typeof collections);
      return [];
    }
    
    return collections.map(mapCollectionToAdminCollection);
  }

  async getCollectionDetails(id: string): Promise<AdminCollection | undefined> {
    const collection = await apiClient.get<Collection>(`/collections/${id}`).catch(() => undefined);
    if (!collection) return undefined;
    return mapCollectionToAdminCollection(collection);
  }

  async getStats(): Promise<{ totalCommunity: number; totalNuggetsInCommunity: number }> {
    const response = await apiClient.get<Collection[]>('/collections', undefined, 'adminCollectionsService.getStats');
    
    // Collections endpoint returns array directly (not paginated)
    const collections = Array.isArray(response) ? response : [];
    
    if (!Array.isArray(collections)) {
      console.error('Expected collections array but got:', typeof collections);
      return { totalCommunity: 0, totalNuggetsInCommunity: 0 };
    }
    
    const publicCols = collections.filter(c => c.type === 'public');
    
    return {
      totalCommunity: publicCols.length,
      totalNuggetsInCommunity: publicCols.reduce((acc, c) => acc + (c.validEntriesCount ?? c.entries?.length ?? 0), 0)
    };
  }

  async updateCollectionStatus(_id: string, _status: 'active' | 'hidden'): Promise<void> {
    // Backend doesn't have status field for collections
    // This would need backend support
    throw new Error('Collection status update not supported by backend');
  }

  async deleteCollection(id: string): Promise<void> {
    await apiClient.delete(`/collections/${id}`);
  }
}

export const adminCollectionsService = new AdminCollectionsService();
