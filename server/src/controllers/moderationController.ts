import { Request, Response } from 'express';
import { Report } from '../models/Report.js';
import { normalizeDoc, normalizeDocs } from '../utils/db.js';
import { z } from 'zod';

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
    const { status, targetType, targetId } = req.query;
    
    // Build query
    const query: any = {};
    if (status) {
      query.status = status;
    }
    if (targetType) {
      query.targetType = targetType;
    }
    if (targetId) {
      query.targetId = targetId;
    }
    
    const reports = await Report.find(query)
      .sort({ createdAt: -1 }); // Most recent first
    
    res.json(normalizeDocs(reports));
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

    const { id, ...reportData } = validationResult.data; // Remove id if present (let MongoDB generate _id)
    
    // Create new report
    const newReport = await Report.create({
      ...reportData,
      status: 'open'
    });
    
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
