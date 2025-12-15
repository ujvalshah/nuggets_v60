import { AdminFeedback } from '../types/admin';
import { apiClient } from '@/services/apiClient';
import { mapFeedbackToAdminFeedback, RawFeedback } from './adminApiMappers';

interface SubmitFeedbackPayload {
  content: string;
  type?: 'bug' | 'feature' | 'general';
  user?: {
    id: string;
    name: string;
    fullName?: string;
    username?: string;
    avatar?: string;
  };
  email?: string;
}

class AdminFeedbackService {
  async listFeedback(filter: 'new' | 'read' | 'archived'): Promise<AdminFeedback[]> {
    const params = new URLSearchParams();
    params.append('status', filter);
    
    const feedback = await apiClient.get<RawFeedback[]>(`/feedback?${params.toString()}`, undefined, 'adminFeedbackService.listFeedback');
    return feedback.map(mapFeedbackToAdminFeedback);
  }

  async updateStatus(id: string, status: 'read' | 'archived'): Promise<void> {
    await apiClient.patch(`/feedback/${id}/status`, { status });
  }

  async getStats(): Promise<{ total: number }> {
    // Get all feedback to compute total
    const allFeedback = await apiClient.get<RawFeedback[]>('/feedback', undefined, 'adminFeedbackService.getStats');
    return {
      total: allFeedback.length
    };
  }

  async submitFeedback(
    content: string,
    type: 'bug' | 'feature' | 'general' = 'general',
    user?: { id: string; name: string; email?: string; avatarUrl?: string },
    email?: string
  ): Promise<void> {
    const payload: SubmitFeedbackPayload = {
      content,
      type,
      email: email || user?.email,
    };

    // Include user object if provided
    if (user) {
      payload.user = {
        id: user.id,
        name: user.name,
        avatar: user.avatarUrl,
      };
    }

    await apiClient.post('/feedback', payload);
  }
}

export const adminFeedbackService = new AdminFeedbackService();
