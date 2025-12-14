
import { AdminActivityEvent } from '../types/admin';
import { MOCK_ACTIVITY_LOG } from './mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class AdminActivityService {
  private logs = [...MOCK_ACTIVITY_LOG];

  async listActivityEvents(limit: number = 50): Promise<AdminActivityEvent[]> {
    await delay(400);
    return this.logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }

  async addEvent(event: Omit<AdminActivityEvent, 'id' | 'timestamp'>): Promise<void> {
    const newEvent: AdminActivityEvent = {
        ...event,
        id: `ev-${Date.now()}`,
        timestamp: new Date().toISOString()
    };
    this.logs.unshift(newEvent);
  }
}

export const adminActivityService = new AdminActivityService();
