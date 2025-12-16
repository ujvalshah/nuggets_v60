import { Request, Response } from 'express';
import { Report } from '../models/Report.js';
import { normalizeDoc, normalizeDocs } from '../utils/db.js';
import { z } from 'zod';
import { buildModerationQuery } from '../services/moderationService.js';

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
  resolution: z.enum(['resolved', 'dismissed'])
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
    
    // TEMPORARY: Log final query for debugging (remove after verification)
    if (process.env.NODE_ENV === 'development') {
      console.log('[ModerationQuery] Collection: reports');
      console.log('[ModerationQuery] Query:', JSON.stringify(query, null, 2));
      console.log('[ModerationQuery] Status value:', query.status);
    }
    
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
 * PATCH /api/moderation/reports/:id/resolve
 * Resolve or dismiss a report
 */
export const resolveReport = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = resolveReportSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationResult.error.errors 
      });
    }

    const { resolution } = validationResult.data;
    
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status: resolution },
      { new: true, runValidators: true }
    );
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    res.json(normalizeDoc(report));
  } catch (error: any) {
    console.error('[Moderation] Resolve report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

