
import { AdminTag, AdminTagRequest } from '../types/admin';
import { MOCK_ADMIN_TAGS } from './mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class AdminTagsService {
  private tags = [...MOCK_ADMIN_TAGS];

  async listTags(query?: string): Promise<AdminTag[]> {
    await delay(500);
    let result = this.tags.filter(t => t.status !== 'pending');
    
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q));
    }
    
    return result.sort((a, b) => b.usageCount - a.usageCount);
  }

  async listRequests(): Promise<AdminTagRequest[]> {
    await delay(400);
    return this.tags
      .filter(t => t.status === 'pending')
      .map(t => ({
        id: t.id,
        name: t.name,
        requestedBy: {
          id: 'u-unknown',
          name: t.requestedBy || 'Unknown User'
        },
        requestedAt: new Date().toISOString(), // Mock date
        status: 'pending'
      }));
  }

  async getStats(): Promise<{ total: number; totalTags: number; pending: number; categories: number }> {
    await delay(200);
    return {
      total: this.tags.length,
      totalTags: this.tags.filter(t => t.status !== 'pending').length,
      pending: this.tags.filter(t => t.status === 'pending').length,
      categories: this.tags.filter(t => t.type === 'category' && t.status !== 'pending').length
    };
  }

  async toggleOfficialStatus(id: string): Promise<void> {
    await delay(300);
    this.tags = this.tags.map(t => t.id === id ? { ...t, isOfficial: !t.isOfficial, type: !t.isOfficial ? 'category' : 'tag' } : t);
  }

  async updateTag(id: string, updates: Partial<AdminTag>): Promise<void> {
    await delay(300);
    this.tags = this.tags.map(t => t.id === id ? { ...t, ...updates } : t);
  }

  async renameTag(id: string, newName: string): Promise<void> {
    await delay(600);
    // In a real app, this would trigger a massive DB update for all related nuggets
    this.tags = this.tags.map(t => t.id === id ? { ...t, name: newName } : t);
  }

  async deleteTag(id: string): Promise<void> {
    await delay(400);
    this.tags = this.tags.filter(t => t.id !== id);
  }

  async approveRequest(id: string): Promise<void> {
    await delay(500);
    const tag = this.tags.find(t => t.id === id);
    if (tag) {
        tag.status = 'active';
        tag.isOfficial = true; 
        tag.type = 'category';
    }
  }

  async rejectRequest(id: string): Promise<void> {
    await delay(500);
    this.tags = this.tags.filter(t => t.id !== id);
  }

  async mergeTags(sourceIds: string[], targetName: string): Promise<void> {
    await delay(800);
    
    // 1. Calculate total usage of source tags
    const sources = this.tags.filter(t => sourceIds.includes(t.id));
    const totalUsage = sources.reduce((acc, t) => acc + t.usageCount, 0);

    // 2. Remove source tags
    this.tags = this.tags.filter(t => !sourceIds.includes(t.id));

    // 3. Find or Create target tag
    const existingTargetIndex = this.tags.findIndex(t => t.name.toLowerCase() === targetName.toLowerCase());
    
    if (existingTargetIndex !== -1) {
        // Update existing
        this.tags[existingTargetIndex].usageCount += totalUsage;
    } else {
        // Create new
        this.tags.push({
            id: `t-merged-${Date.now()}`,
            name: targetName,
            type: 'tag',
            status: 'active',
            isOfficial: false,
            usageCount: totalUsage
        });
    }
  }
}

export const adminTagsService = new AdminTagsService();
