import { Request, Response } from 'express';
import { Article } from '../models/Article.js';
import { normalizeDoc, normalizeDocs } from '../utils/db.js';
import { createArticleSchema, updateArticleSchema } from '../utils/validation.js';

export const getArticles = async (req: Request, res: Response) => {
  try {
    const { authorId } = req.query;
    
    let query: any = {};
    if (authorId) {
      query.authorId = authorId;
    }
    
    const articles = await Article.find(query).sort({ publishedAt: -1 });
    res.json(normalizeDocs(articles));
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


