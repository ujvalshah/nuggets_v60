import { Request, Response } from 'express';
import { Tag } from '../models/Tag.js';
import { normalizeDoc, normalizeDocs } from '../utils/db.js';
import { z } from 'zod';

// Validation schemas
const createTagSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Category name too long'),
  type: z.enum(['category', 'tag']).optional(),
  status: z.enum(['active', 'pending', 'deprecated']).optional(),
  isOfficial: z.boolean().optional()
});

export const getTags = async (req: Request, res: Response) => {
  try {
    // Support format=simple query parameter for backward compatibility
    if (req.query.format === 'simple') {
      // Even simple format should have pagination for safety
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 500);
      const skip = (page - 1) * limit;
      
      const [tags, total] = await Promise.all([
        Tag.find({ status: 'active' })
          .sort({ name: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Tag.countDocuments({ status: 'active' })
      ]);
      
      const tagNames = tags.map(tag => tag.name);
      return res.json({
        data: tagNames,
        total,
        page,
        limit,
        hasMore: page * limit < total
      });
    }
    
    // Return full tag objects for Admin Panel with pagination
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 25, 1), 100);
    const skip = (page - 1) * limit;
    
    const [tags, total] = await Promise.all([
      Tag.find()
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Tag.countDocuments()
    ]);
    
    res.json({
      data: normalizeDocs(tags),
      total,
      page,
      limit,
      hasMore: page * limit < total
    });
  } catch (error: any) {
    console.error('[Tags] Get tags error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createTag = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = createTagSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationResult.error.errors 
      });
    }

    const { name, type = 'tag' } = validationResult.data;

    // Check if tag already exists (case-insensitive)
    const existingTag = await Tag.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
    });
    if (existingTag) {
      return res.status(409).json({ message: 'Tag already exists' });
    }

    // Create new tag with defaults
    const newTag = new Tag({ 
      name: name.trim(),
      type: type,
      status: 'active',
      isOfficial: type === 'category' // Categories are official by default
    });
    await newTag.save();

    res.status(201).json(normalizeDoc(newTag));
  } catch (error: any) {
    console.error('[Tags] Create tag error:', error);
    
    // Handle duplicate key error (MongoDB unique constraint)
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Tag already exists' });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteTag = async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const tag = await Tag.findOneAndDelete({ name });
    
    if (!tag) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.status(204).send();
  } catch (error: any) {
    console.error('[Tags] Delete tag error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};









