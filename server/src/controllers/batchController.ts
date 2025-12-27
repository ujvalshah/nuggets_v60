import { Request, Response } from 'express';
import { Article } from '../models/Article.js';
import mongoose from 'mongoose';

/**
 * POST /api/batch/publish
 * 
 * Publish multiple draft nuggets by setting their visibility to 'public'
 * 
 * Body: {
 *   ids: string[] // Array of article IDs to publish
 * }
 * 
 * Returns: {
 *   success: boolean
 *   message: string
 *   updatedCount: number
 * }
 */
export const publishBatch = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    // Validate input
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Array of nugget IDs is required'
      });
    }

    // Validate all IDs are valid MongoDB ObjectIds
    const validIds = ids.filter(id => {
      if (typeof id !== 'string') return false;
      return mongoose.Types.ObjectId.isValid(id);
    });

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid nugget IDs provided'
      });
    }

    if (validIds.length !== ids.length) {
      console.warn(`[BatchPublish] ${ids.length - validIds.length} invalid IDs filtered out`);
    }

    // Perform bulk update using updateMany
    // Set visibility to 'public' for all matching IDs
    const result = await Article.updateMany(
      { _id: { $in: validIds } },
      {
        $set: {
          visibility: 'public',
          updated_at: new Date().toISOString()
        }
      }
    );

    console.log(`[BatchPublish] Published ${result.modifiedCount} of ${validIds.length} nuggets`);

    res.json({
      success: true,
      message: `Successfully published ${result.modifiedCount} nugget${result.modifiedCount !== 1 ? 's' : ''}`,
      updatedCount: result.modifiedCount,
      requestedCount: validIds.length
    });
  } catch (error: any) {
    console.error('[BatchPublish] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



