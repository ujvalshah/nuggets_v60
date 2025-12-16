import { Request, Response } from 'express';
import { Article } from '../models/Article.js';
import { normalizeDoc, normalizeDocs } from '../utils/db.js';
import { createArticleSchema, updateArticleSchema } from '../utils/validation.js';

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
        .limit(limit),
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
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getArticleById = async (req: Request, res: Response) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });
    res.json(normalizeDoc(article));
  } catch (error: any) {
    console.error('[Articles] Get article by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createArticle = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = createArticleSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationResult.error.errors 
      });
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
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: Object.keys(error.errors).map(key => ({
          path: key,
          message: error.errors[key].message
        }))
      });
    }
    
    // Check for BSON size limit (MongoDB document size limit is 16MB)
    if (error.message && error.message.includes('BSON')) {
      console.error('[Articles] Document size limit exceeded');
      return res.status(413).json({ 
        message: 'Payload too large. Please reduce image sizes or use fewer images.' 
      });
    }
    
    // Return more helpful error message in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message || 'Internal server error'
      : 'Internal server error';
    
    res.status(500).json({ message: errorMessage });
  }
};

export const updateArticle = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = updateArticleSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationResult.error.errors 
      });
    }

    const article = await Article.findByIdAndUpdate(
      req.params.id,
      validationResult.data,
      { new: true, runValidators: true }
    );
    
    if (!article) return res.status(404).json({ message: 'Article not found' });
    res.json(normalizeDoc(article));
  } catch (error: any) {
    console.error('[Articles] Update article error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteArticle = async (req: Request, res: Response) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });
    res.status(204).send();
  } catch (error: any) {
    console.error('[Articles] Delete article error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


