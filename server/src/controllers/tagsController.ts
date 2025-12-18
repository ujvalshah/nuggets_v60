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
      const tags = await Tag.find({ status: 'active' }).sort({ name: 1 });
      const tagNames = tags.map(tag => tag.name);
      return res.json(tagNames);
    }
    
    // Return full tag objects for Admin Panel
    const tags = await Tag.find().sort({ name: 1 });
    res.json(normalizeDocs(tags));
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

