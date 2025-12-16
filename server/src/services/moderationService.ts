import { Report } from '../models/Report.js';

/**
 * Shared query builder for moderation reports
 * Single source of truth for report filtering logic
 * 
 * Ensures Dashboard stats and Moderation Queue use identical query conditions
 */
export interface ModerationQueryFilters {
  status?: 'open' | 'resolved' | 'dismissed';
  targetType?: 'nugget' | 'user' | 'collection';
  targetId?: string;
  searchQuery?: string;
}

export function buildModerationQuery(filters: ModerationQueryFilters = {}): any {
  const query: any = {};
  
  // Status filter - default to 'open' if not provided
  query.status = filters.status || 'open';
  
  // Optional filters
  if (filters.targetType) {
    query.targetType = filters.targetType;
  }
  if (filters.targetId) {
    query.targetId = filters.targetId;
  }
  
  // Search query (text search across multiple fields)
  if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
    const regex = new RegExp(filters.searchQuery.trim(), 'i');
    query.$or = [
      { reason: regex },
      { description: regex },
      { 'reporter.name': regex },
      { 'respondent.name': regex },
      { targetId: regex }
    ];
  }
  
  return query;
}

/**
 * Get moderation stats by status
 * Uses the same query builder as listReports for consistency
 */
export async function getModerationStats(): Promise<{ open: number; resolved: number; dismissed: number }> {
  // Use shared query builder for each status
  const [openCount, resolvedCount, dismissedCount] = await Promise.all([
    Report.countDocuments(buildModerationQuery({ status: 'open' })),
    Report.countDocuments(buildModerationQuery({ status: 'resolved' })),
    Report.countDocuments(buildModerationQuery({ status: 'dismissed' }))
  ]);
  
  return {
    open: openCount,
    resolved: resolvedCount,
    dismissed: dismissedCount
  };
}

