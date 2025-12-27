import { Request, Response } from 'express';
import { Article } from '../models/Article.js';
import { normalizeDoc, normalizeDocs } from '../utils/db.js';
import { createArticleSchema, updateArticleSchema } from '../utils/validation.js';
import { cleanupCollectionEntries } from '../utils/collectionHelpers.js';
import {
  sendErrorResponse,
  sendValidationError,
  sendUnauthorizedError,
  sendForbiddenError,
  sendNotFoundError,
  sendPayloadTooLargeError,
  sendInternalError
} from '../utils/errorResponse.js';

export const getArticles = async (req: Request, res: Response) => {
  try {
    const { authorId, q, category, categories, sort } = req.query;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 25, 1), 100);
    const skip = (page - 1) * limit;
    
    // Build MongoDB query object
    const query: any = {};
    
    // Author filter
    if (authorId) {
      query.authorId = authorId;
    }
    
    // Search query (case-insensitive regex)
    if (q && typeof q === 'string' && q.trim().length > 0) {
      const regex = new RegExp(q.trim(), 'i');
      query.$or = [
        { title: regex },
        { excerpt: regex },
        { content: regex },
        { tags: regex }
      ];
    }
    
    // Category filter (case-insensitive, supports both single and array)
    if (category && typeof category === 'string') {
      // Single category: case-insensitive match
      query.categories = { $in: [new RegExp(`^${category.trim()}$`, 'i')] };
    } else if (categories) {
      // Multiple categories: handle both string and array
      const categoryArray = Array.isArray(categories) 
        ? categories 
        : [categories];
      query.categories = { 
        $in: categoryArray
          .filter((cat): cat is string => typeof cat === 'string')
          .map((cat: string) => new RegExp(`^${cat.trim()}$`, 'i'))
      };
    }
    
    // Sort parameter (map frontend values to MongoDB sort)
    const sortMap: Record<string, any> = {
      'latest': { publishedAt: -1 },
      'oldest': { publishedAt: 1 },
      'title': { title: 1 },
      'title-desc': { title: -1 }
    };
    const sortOrder = sortMap[sort as string] || { publishedAt: -1 }; // Default: latest first
    
    const [articles, total] = await Promise.all([
      Article.find(query)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .lean(), // Use lean() for read-only queries
      Article.countDocuments(query)
    ]);

    res.json({
      data: normalizeDocs(articles),
      total,
      page,
      limit,
      hasMore: page * limit < total
    });
  } catch (error: any) {
    console.error('[Articles] Get articles error:', error);
    sendInternalError(res);
  }
};

export const getArticleById = async (req: Request, res: Response) => {
  try {
    const article = await Article.findById(req.params.id).lean();
    if (!article) return sendNotFoundError(res, 'Article not found');
    res.json(normalizeDoc(article));
  } catch (error: any) {
    console.error('[Articles] Get article by ID error:', error);
    sendInternalError(res);
  }
};

export const createArticle = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = createArticleSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        path: err.path,
        message: err.message,
        code: err.code
      }));
      return sendValidationError(res, 'Validation failed', errors);
    }

    const data = validationResult.data;
    
    // Log payload size for debugging (especially for images)
    const payloadSize = JSON.stringify(data).length;
    if (payloadSize > 1000000) { // > 1MB
      console.warn(`[Articles] Large payload detected: ${(payloadSize / 1024 / 1024).toFixed(2)}MB`);
      if (data.images && data.images.length > 0) {
        const imagesSize = data.images.reduce((sum: number, img: string) => sum + (img?.length || 0), 0);
        console.warn(`[Articles] Images total size: ${(imagesSize / 1024 / 1024).toFixed(2)}MB`);
      }
    }
    
    const newArticle = await Article.create({
      ...data,
      publishedAt: data.publishedAt || new Date().toISOString()
    });
    
    res.status(201).json(normalizeDoc(newArticle));
  } catch (error: any) {
    console.error('[Articles] Create article error:', error);
    console.error('[Articles] Error name:', error.name);
    console.error('[Articles] Error message:', error.message);
    console.error('[Articles] Error stack:', error.stack);
    
    // Log more details for debugging
    if (error.name === 'ValidationError') {
      console.error('[Articles] Mongoose validation errors:', error.errors);
      const errors = Object.keys(error.errors).map(key => ({
        path: key,
        message: error.errors[key].message
      }));
      return sendValidationError(res, 'Validation failed', errors);
    }
    
    // Check for BSON size limit (MongoDB document size limit is 16MB)
    if (error.message && error.message.includes('BSON')) {
      console.error('[Articles] Document size limit exceeded');
      return sendPayloadTooLargeError(res, 'Payload too large. Please reduce image sizes or use fewer images.');
    }
    
    sendInternalError(res);
  }
};

export const updateArticle = async (req: Request, res: Response) => {
  try {
    // Get current user from authentication middleware
    const currentUserId = (req as any).user?.userId;
    if (!currentUserId) {
      return sendUnauthorizedError(res, 'Authentication required');
    }

    // Find article first to verify ownership
    const existingArticle = await Article.findById(req.params.id).lean();
    if (!existingArticle) {
      return sendNotFoundError(res, 'Article not found');
    }

    // Verify ownership (user must be the author or admin)
    // Note: Admin check would require role from JWT, for now just check authorId
    if (existingArticle.authorId !== currentUserId) {
      return sendForbiddenError(res, 'You can only edit your own articles');
    }

    // Validate input
    const validationResult = updateArticleSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        path: err.path,
        message: err.message,
        code: err.code
      }));
      return sendValidationError(res, 'Validation failed', errors);
    }

    // GUARD: Prevent overwriting existing YouTube titles (backend is source of truth)
    // If backend already has media.previewMetadata.title, don't allow updates to it
    const updates = { ...validationResult.data };
    if (
      existingArticle.media?.previewMetadata?.title &&
      updates.media?.previewMetadata?.title
    ) {
      console.debug(
        `[Articles] Ignoring YouTube title update for article ${req.params.id} - backend title already exists`
      );
      // Remove title fields from update to preserve existing backend data
      if (updates.media.previewMetadata) {
        delete updates.media.previewMetadata.title;
        delete updates.media.previewMetadata.titleSource;
        delete updates.media.previewMetadata.titleFetchedAt;
      }
    }

    // CRITICAL FIX: Convert nested media.previewMetadata updates to dot notation
    // This prevents Mongoose from replacing the entire media object (which fails validation)
    // when we only want to update previewMetadata fields
    let mongoUpdate: any = { ...updates };
    
    if (updates.media && !updates.media.type && !updates.media.url && updates.media.previewMetadata) {
      // This is a partial media update (only previewMetadata) - use dot notation
      delete mongoUpdate.media;
      
      // Convert previewMetadata fields to dot notation
      const previewMetadata = updates.media.previewMetadata;
      if (previewMetadata.title) {
        mongoUpdate['media.previewMetadata.title'] = previewMetadata.title;
      }
      if (previewMetadata.titleSource) {
        mongoUpdate['media.previewMetadata.titleSource'] = previewMetadata.titleSource;
      }
      if (previewMetadata.titleFetchedAt) {
        mongoUpdate['media.previewMetadata.titleFetchedAt'] = previewMetadata.titleFetchedAt;
      }
      // Add other previewMetadata fields as needed
      if (previewMetadata.url) {
        mongoUpdate['media.previewMetadata.url'] = previewMetadata.url;
      }
      if (previewMetadata.title !== undefined) {
        mongoUpdate['media.previewMetadata.title'] = previewMetadata.title;
      }
      if (previewMetadata.description !== undefined) {
        mongoUpdate['media.previewMetadata.description'] = previewMetadata.description;
      }
      
      console.debug(`[Articles] Using dot notation for media.previewMetadata update on article ${req.params.id}`);
    }

    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { $set: mongoUpdate },
      { new: true, runValidators: false } // Disable runValidators for partial updates
    ).lean();
    
    if (!article) return sendNotFoundError(res, 'Article not found');
    res.json(normalizeDoc(article));
  } catch (error: any) {
    console.error('[Articles] Update article error:', error);
    sendInternalError(res);
  }
};

export const deleteArticle = async (req: Request, res: Response) => {
  try {
    const articleId = req.params.id;
    
    // Delete the article first
    const article = await Article.findByIdAndDelete(articleId);
    if (!article) return sendNotFoundError(res, 'Article not found');
    
    // Cascade cleanup: Remove article references from all collections
    // This maintains referential integrity
    const collectionsUpdated = await cleanupCollectionEntries(articleId);
    if (collectionsUpdated > 0) {
      console.log(`[Articles] Cleaned up article ${articleId} from ${collectionsUpdated} collection(s)`);
    }
    
    // Mark associated media as orphaned (MongoDB-first cleanup)
    try {
      const { markMediaAsOrphaned } = await import('../services/mediaCleanupService.js');
      const orphanedCount = await markMediaAsOrphaned('nugget', articleId);
      if (orphanedCount > 0) {
        console.log(`[Articles] Marked ${orphanedCount} media files as orphaned for article ${articleId}`);
      }
    } catch (mediaError: any) {
      // Log but don't fail article deletion if media cleanup fails
      console.error(`[Articles] Failed to mark media as orphaned:`, mediaError.message);
    }
    
    res.status(204).send();
  } catch (error: any) {
    console.error('[Articles] Delete article error:', error);
    sendInternalError(res);
  }
};


