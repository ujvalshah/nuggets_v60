import { z } from 'zod';

/**
 * Validation schemas for request bodies
 */

export const createArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  excerpt: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  authorId: z.string().min(1, 'Author ID is required'),
  authorName: z.string().min(1, 'Author name is required'),
  category: z.string().min(1, 'Category is required'),
  categories: z.array(z.string()).optional(),
  publishedAt: z.string().optional(),
  tags: z.array(z.string()).default([]),
  readTime: z.number().optional(),
  visibility: z.enum(['public', 'private']).default('public')
});

export const updateArticleSchema = createArticleSchema.partial();

export const createCollectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  creatorId: z.string().min(1, 'Creator ID is required'),
  type: z.enum(['private', 'public']).default('public')
});

export const updateCollectionSchema = createCollectionSchema.partial();

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  preferences: z.object({
    interestedCategories: z.array(z.string())
  }).optional(),
  lastFeedVisit: z.string().optional(),
  profile: z.object({
    displayName: z.string().optional(),
    avatarUrl: z.string().optional(),
    bio: z.string().optional(),
    location: z.string().optional(),
    website: z.string().optional(),
    username: z.string().optional(),
    phoneNumber: z.string().optional(),
    avatarColor: z.string().optional(),
    pincode: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    gender: z.string().optional(),
    dateOfBirth: z.string().optional(),
    title: z.string().optional(),
    company: z.string().optional(),
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
  }).optional(),
  // Allow legacy flat fields for backward compatibility
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  avatarUrl: z.string().optional(),
  title: z.string().optional(),
  company: z.string().optional(),
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
});

export const addEntrySchema = z.object({
  articleId: z.string().min(1, 'Article ID is required'),
  userId: z.string().min(1, 'User ID is required')
});

export const flagEntrySchema = z.object({
  userId: z.string().min(1, 'User ID is required')
});

/**
 * Validation middleware factory
 */
export function validate(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: result.error.errors
      });
    }
    req.body = result.data;
    next();
  };
}
