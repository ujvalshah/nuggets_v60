import { AdminFeedback } from '../types/admin';
import { MOCK_FEEDBACK } from './mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class AdminFeedbackService {
  private feedback = [...MOCK_FEEDBACK];

  async listFeedback(filter: 'new' | 'read' | 'archived'): Promise<AdminFeedback[]> {
    await delay(300);
    return this.feedback.filter(f => f.status === filter);
  }

  async updateStatus(id: string, status: 'read' | 'archived'): Promise<void> {
    await delay(300);
    this.feedback = this.feedback.map(f => f.id === id ? { ...f, status } : f);
  }

  async getStats(): Promise<{ total: number }> {
    await delay(200);
    return {
      total: this.feedback.length
    };
  }
}

export const adminFeedbackService = new AdminFeedbackService();
