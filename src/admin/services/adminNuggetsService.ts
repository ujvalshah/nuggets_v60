
import { AdminNugget, AdminNuggetStatus } from '../types/admin';
import { MOCK_ADMIN_NUGGETS } from './mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class AdminNuggetsService {
  private nuggets = [...MOCK_ADMIN_NUGGETS];

  async listNuggets(filter?: 'all' | 'flagged' | 'hidden'): Promise<AdminNugget[]> {
    await delay(300); 
    
    // Privacy Rule: Filter out 'private' nuggets from the table view
    // Admins can only see public content in the list
    let result = this.nuggets.filter(n => n.visibility === 'public');

    if (filter === 'flagged') {
      return result.filter(n => n.status === 'flagged');
    }
    if (filter === 'hidden') {
      return result.filter(n => n.status === 'hidden');
    }
    return result;
  }

  async getNuggetDetails(id: string): Promise<AdminNugget | undefined> {
    await delay(200);
    return this.nuggets.find(n => n.id === id);
  }

  async getStats(): Promise<{ total: number; flagged: number; createdToday: number; public: number; private: number }> {
    await delay(200);
    const todayStr = new Date().toDateString();
    return {
      total: this.nuggets.length,
      flagged: this.nuggets.filter(n => n.status === 'flagged').length,
      createdToday: this.nuggets.filter(n => new Date(n.createdAt).toDateString() === todayStr).length,
      public: this.nuggets.filter(n => n.visibility === 'public').length,
      private: this.nuggets.filter(n => n.visibility === 'private').length,
    };
  }

  async updateNuggetStatus(id: string, status: AdminNuggetStatus): Promise<void> {
    await delay(300);
    this.nuggets = this.nuggets.map(n => n.id === id ? { ...n, status, reports: status === 'active' ? 0 : n.reports } : n);
  }

  async deleteNugget(id: string): Promise<void> {
    await delay(400);
    this.nuggets = this.nuggets.filter(n => n.id !== id);
  }
}

export const adminNuggetsService = new AdminNuggetsService();
