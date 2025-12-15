import { Request, Response } from 'express';
import { Article } from '../models/Article.js';
import { normalizeDoc, normalizeDocs } from '../utils/db.js';
import { createArticleSchema, updateArticleSchema } from '../utils/validation.js';

export const getArticles = async (req: Request, res: Response) => {
  try {
    const { authorId, q } = req.query;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 25, 1), 100);
    const skip = (page - 1) * limit;
    
    const query: any = {};
    if (authorId) {
      query.authorId = authorId;
    }
    if (q && typeof q === 'string' && q.trim().length > 0) {
      const regex = new RegExp(q.trim(), 'i');
      query.$or = [
        { title: regex },
        { excerpt: regex },
        { content: regex },
        { tags: regex }
      ];
    }
    
    const [articles, total] = await Promise.all([
      Article.find(query)
        .sort({ publishedAt: -1 })
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
    const newArticle = await Article.create({
      ...data,
      publishedAt: data.publishedAt || new Date().toISOString()
    });
    
    res.status(201).json(normalizeDoc(newArticle));
  } catch (error: any) {
    console.error('[Articles] Create article error:', error);
    res.status(500).json({ message: 'Internal server error' });
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


