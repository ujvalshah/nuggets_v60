import { AdminReport } from '../types/admin';
import { apiClient } from '@/services/apiClient';
import { mapReportToAdminReport, RawReport } from './adminApiMappers';

class AdminModerationService {
  async listReports(filter?: 'open' | 'resolved' | 'dismissed'): Promise<AdminReport[]> {
    // Build query params
    const params = new URLSearchParams();
    if (filter) {
      params.append('status', filter);
    }
    
    const queryString = params.toString();
    const endpoint = `/moderation/reports${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get<{ data: RawReport[] } | RawReport[]>(endpoint, undefined, 'adminModerationService.listReports');
    
    // Handle paginated response format { data: [...], total, ... } or direct array
    const reports = Array.isArray(response) ? response : (response.data || []);
    
    if (!Array.isArray(reports)) {
      console.error('Expected reports array but got:', typeof reports);
      return [];
    }
    
    return reports.map(mapReportToAdminReport);
  }

  async getReportDetails(id: string): Promise<AdminReport | undefined> {
    // Backend doesn't have GET /moderation/reports/:id
    // Get all reports and find by id
    const reports = await this.listReports();
    return reports.find(r => r.id === id);
  }

  async getStats(): Promise<{ open: number; resolved: number; dismissed: number }> {
    const reports = await this.listReports();
    return {
      open: reports.filter(r => r.status === 'open').length,
      resolved: reports.filter(r => r.status === 'resolved').length,
      dismissed: reports.filter(r => r.status === 'dismissed').length,
    };
  }

  async resolveReport(id: string, resolution: 'resolved' | 'dismissed'): Promise<void> {
    await apiClient.patch(`/moderation/reports/${id}/resolve`, { resolution });
  }

  async submitReport(
    targetId: string,
    targetType: 'nugget' | 'user' | 'collection',
    reason: 'spam' | 'misleading' | 'abusive' | 'copyright' | 'other',
    description?: string,
    reporter?: { id: string; name: string },
    respondent?: { id: string; name: string }
  ): Promise<void> {
    // Map frontend reason codes to backend reason codes
    const reasonMap: Record<string, 'spam' | 'harassment' | 'misinformation' | 'copyright' | 'other'> = {
      'spam': 'spam',
      'misleading': 'misinformation',
      'abusive': 'harassment',
      'copyright': 'copyright',
      'other': 'other'
    };

    const payload: any = {
      targetId,
      targetType,
      reason: reasonMap[reason] || 'other',
      description: description || undefined,
      reporter: reporter || { id: 'anonymous', name: 'Anonymous' },
    };

    if (respondent) {
      payload.respondent = respondent;
    }

    await apiClient.post('/moderation/reports', payload);
  }
}

export const adminModerationService = new AdminModerationService();
