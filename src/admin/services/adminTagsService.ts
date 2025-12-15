import { AdminTag, AdminTagRequest } from '../types/admin';
import { apiClient } from '@/services/apiClient';
import { mapTagToAdminTag, RawTag } from './adminApiMappers';

class AdminTagsService {
  async listTags(query?: string): Promise<AdminTag[]> {
    // Get all tags (without format=simple to get full objects)
    const endpoint = query ? `/categories?q=${encodeURIComponent(query)}` : '/categories';
    const tags = await apiClient.get<RawTag[]>(endpoint, undefined, 'adminTagsService.listTags');
    
    // Filter out pending
    const filtered = tags.filter(t => t.status !== 'pending');
    
    return filtered.map(mapTagToAdminTag).sort((a, b) => b.usageCount - a.usageCount);
  }

  async listRequests(): Promise<AdminTagRequest[]> {
    // Get all tags and filter for pending
    const tags = await apiClient.get<any[]>('/categories');
    const pending = tags.filter(t => t.status === 'pending');
    
    return pending.map(tag => ({
      id: tag.id,
      name: tag.name,
      requestedBy: {
        id: 'u-unknown', // Backend doesn't track requester
        name: tag.requestedBy || 'Unknown User'
      },
      requestedAt: new Date().toISOString(), // Backend doesn't track request date
      status: 'pending'
    }));
  }

  async getStats(): Promise<{ total: number; totalTags: number; pending: number; categories: number }> {
    const tags = await apiClient.get<RawTag[]>('/categories', undefined, 'adminTagsService.getStats');
    return {
      total: tags.length,
      totalTags: tags.filter(t => t.status !== 'pending').length,
      pending: tags.filter(t => t.status === 'pending').length,
      categories: tags.filter(t => t.type === 'category' && t.status !== 'pending').length
    };
  }

  async toggleOfficialStatus(id: string): Promise<void> {
    // Get current tag
    const tags = await apiClient.get<any[]>('/categories');
    const tag = tags.find(t => t.id === id);
    if (!tag) throw new Error('Tag not found');
    
    // Backend doesn't support updating isOfficial or type
    // This would need backend support
    throw new Error('Toggle official status not supported by backend');
  }

  async updateTag(id: string, updates: Partial<AdminTag>): Promise<void> {
    // Backend doesn't support updating tag fields other than delete
    // This would need backend support
    throw new Error('Tag updates not supported by backend');
  }

  async renameTag(id: string, newName: string): Promise<void> {
    // Backend doesn't support renaming tags
    // Would need to delete old and create new, but that's complex
    throw new Error('Tag renaming not supported by backend');
  }

  async deleteTag(id: string): Promise<void> {
    // Get tag name first
    const tags = await apiClient.get<any[]>('/categories');
    const tag = tags.find(t => t.id === id);
    if (!tag) throw new Error('Tag not found');
    
    await apiClient.delete(`/categories/${encodeURIComponent(tag.name)}`);
  }

  async approveRequest(id: string): Promise<void> {
    // Get tag and update status
    const tags = await apiClient.get<any[]>('/categories');
    const tag = tags.find(t => t.id === id);
    if (!tag) throw new Error('Tag not found');
    
    // Backend doesn't support updating tag status
    // This would need backend support
    throw new Error('Tag approval not supported by backend');
  }

  async rejectRequest(id: string): Promise<void> {
    // Delete the pending tag
    await this.deleteTag(id);
  }

  async mergeTags(sourceIds: string[], targetName: string): Promise<void> {
    // Backend doesn't support tag merging
    // This would need backend support
    throw new Error('Tag merging not supported by backend');
  }
}

export const adminTagsService = new AdminTagsService();
