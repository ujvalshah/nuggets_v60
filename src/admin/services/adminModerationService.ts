
import { AdminReport } from '../types/admin';
import { MOCK_REPORTS } from './mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class AdminModerationService {
  private reports = [...MOCK_REPORTS];

  async listReports(filter?: 'open' | 'resolved' | 'dismissed'): Promise<AdminReport[]> {
    await delay(500);
    if (filter) {
      return this.reports.filter(r => r.status === filter);
    }
    return this.reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getReportDetails(id: string): Promise<AdminReport | undefined> {
    await delay(200);
    return this.reports.find(r => r.id === id);
  }

  async getStats(): Promise<{ open: number; resolved: number; dismissed: number }> {
    await delay(200);
    return {
      open: this.reports.filter(r => r.status === 'open').length,
      resolved: this.reports.filter(r => r.status === 'resolved').length,
      dismissed: this.reports.filter(r => r.status === 'dismissed').length,
    };
  }

  async resolveReport(id: string, resolution: 'resolved' | 'dismissed'): Promise<void> {
    await delay(400);
    this.reports = this.reports.map(r => r.id === id ? { ...r, status: resolution } : r);
  }
}

export const adminModerationService = new AdminModerationService();
