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
    // Use backend count for community collections (public only)
    // This ensures consistency with Community Collections page
    const response = await apiClient.get<{ data: Collection[]; count: number } | Collection[]>(
      '/collections?type=public&includeCount=true', 
      undefined, 
      'adminCollectionsService.getStats'
    );
    
    let collections: Collection[] = [];
    let totalCommunity = 0;
    
    // Handle both array response (legacy) and object response (with count)
    if (Array.isArray(response)) {
      collections = response;
      totalCommunity = collections.filter(c => c.type === 'public').length;
    } else if (response && typeof response === 'object' && 'data' in response) {
      collections = response.data || [];
      // Use backend-provided count for consistency
      totalCommunity = response.count || collections.length;
    } else {
      console.error('Expected collections array or object but got:', typeof response);
      return { totalCommunity: 0, totalNuggetsInCommunity: 0 };
    }
    
    // Filter to public collections for nugget count calculation
    const publicCols = collections.filter(c => c.type === 'public');
    
    return {
      totalCommunity: totalCommunity, // Use backend count
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
