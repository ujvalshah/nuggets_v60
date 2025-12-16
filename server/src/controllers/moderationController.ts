import { Request, Response } from 'express';
import { Report } from '../models/Report.js';
import { ModerationAuditLog } from '../models/ModerationAuditLog.js';
import { normalizeDoc, normalizeDocs } from '../utils/db.js';
import { z } from 'zod';
import { buildModerationQuery } from '../services/moderationService.js';
import { AdminRequest } from '../middleware/requireAdmin.js';

// Validation schemas
const createReportSchema = z.object({
  targetId: z.string().min(1, 'Target ID is required'),
  targetType: z.enum(['nugget', 'user', 'collection']),
  reason: z.enum(['spam', 'harassment', 'misinformation', 'copyright', 'other']),
  description: z.string().max(2000, 'Description too long').optional(),
  reporter: z.object({
    id: z.string(),
    name: z.string()
  }),
  respondent: z.object({
    id: z.string(),
    name: z.string()
  }).optional()
});

const resolveReportSchema = z.object({
  resolution: z.enum(['resolved', 'dismissed']),
  actionReason: z.string().max(500).optional()
});

/**
 * GET /api/moderation/reports
 * Get all reports
 */
export const getReports = async (req: Request, res: Response) => {
  try {
    const { status, targetType, targetId, q } = req.query;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 25, 1), 100);
    const skip = (page - 1) * limit;
    
    // Use shared query builder - ensures consistency with stats endpoint
    const query = buildModerationQuery({
      status: status as 'open' | 'resolved' | 'dismissed' | undefined,
      targetType: targetType as 'nugget' | 'user' | 'collection' | undefined,
      targetId: targetId as string | undefined,
      searchQuery: q as string | undefined
    });
    
    const [reports, total] = await Promise.all([
      Report.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments(query)
    ]);
    
    // Normalize reports - ensure all fields are properly converted
    const normalizedReports = normalizeDocs(reports);
    
    // Debug logging (remove in production if not needed)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Moderation] Found ${reports.length} reports (total: ${total}) with query:`, query);
      if (reports.length > 0) {
        console.log(`[Moderation] First report status:`, reports[0]?.status);
      }
    }
    
    res.json({
      data: normalizedReports,
      total,
      page,
      limit,
      hasMore: page * limit < total
    });
  } catch (error: any) {
    console.error('[Moderation] Get reports error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/moderation/reports
 * Create a new report
 */
export const createReport = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = createReportSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationResult.error.errors 
      });
    }

    // Remove id if present (let MongoDB generate _id)
    const reportData = validationResult.data;
    if ('id' in reportData) {
      delete (reportData as any).id;
    }
    
    // Create new report - explicitly set status to 'open'
    const newReport = await Report.create({
      ...reportData,
      status: 'open'
    });
    
    // Debug logging (remove in production if not needed)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Moderation] Created report:`, {
        id: newReport._id?.toString(),
        targetId: newReport.targetId,
        targetType: newReport.targetType,
        status: newReport.status,
        reason: newReport.reason
      });
    }
    
    res.status(201).json(normalizeDoc(newReport));
  } catch (error: any) {
    console.error('[Moderation] Create report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/moderation/reports/:id/resolve
 * Resolve a report (idempotent)
 * Only admins can perform this action
 */
export const resolveReport = async (req: AdminRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const reportId = req.params.id;
    const { actionReason } = req.body || {};

    // Find the report
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const previousStatus = report.status;

    // Idempotency: If already resolved, return success
    if (previousStatus === 'resolved') {
      return res.json(normalizeDoc(report));
    }

    // Cannot resolve if dismissed
    if (previousStatus === 'dismissed') {
      return res.status(409).json({ 
        message: 'Cannot resolve a dismissed report' 
      });
    }

    // Update report
    const now = new Date();
    report.status = 'resolved';
    report.resolvedAt = now;
    report.actionedBy = req.userId;
    if (actionReason) {
      report.actionReason = actionReason;
    }
    await report.save();

    // Create audit log
    await ModerationAuditLog.create({
      reportId: reportId,
      action: 'resolve',
      performedBy: req.userId,
      previousStatus: previousStatus,
      newStatus: 'resolved',
      timestamp: now,
      metadata: {
        actionReason: actionReason || null
      }
    });

    res.json(normalizeDoc(report));
  } catch (error: any) {
    console.error('[Moderation] Resolve report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/moderation/reports/:id/dismiss
 * Dismiss a report (idempotent)
 * Only admins can perform this action
 */
export const dismissReport = async (req: AdminRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const reportId = req.params.id;
    const { actionReason } = req.body || {};

    // Find the report
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const previousStatus = report.status;

    // Idempotency: If already dismissed, return success
    if (previousStatus === 'dismissed') {
      return res.json(normalizeDoc(report));
    }

    // Cannot dismiss if resolved
    if (previousStatus === 'resolved') {
      return res.status(409).json({ 
        message: 'Cannot dismiss a resolved report' 
      });
    }

    // Update report
    const now = new Date();
    report.status = 'dismissed';
    report.dismissedAt = now;
    report.actionedBy = req.userId;
    if (actionReason) {
      report.actionReason = actionReason;
    }
    await report.save();

    // Create audit log
    await ModerationAuditLog.create({
      reportId: reportId,
      action: 'dismiss',
      performedBy: req.userId,
      previousStatus: previousStatus,
      newStatus: 'dismissed',
      timestamp: now,
      metadata: {
        actionReason: actionReason || null
      }
    });

    res.json(normalizeDoc(report));
  } catch (error: any) {
    console.error('[Moderation] Dismiss report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

