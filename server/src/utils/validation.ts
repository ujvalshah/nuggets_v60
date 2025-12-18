import { z } from 'zod';

/**
 * Validation schemas for request bodies
 */

// Schema for previewMetadata (nested object)
const previewMetadataSchema = z.object({
  url: z.string().optional(),
  finalUrl: z.string().optional(),
  providerName: z.string().optional(),
  siteName: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  authorName: z.string().optional(),
  publishDate: z.string().optional(),
  mediaType: z.string().optional(),
}).optional();

// Schema for media object
const mediaSchema = z.object({
  type: z.string(),
  url: z.string(),
  thumbnail_url: z.string().optional(),
  aspect_ratio: z.string().optional(),
  filename: z.string().optional(),
  previewMetadata: previewMetadataSchema,
}).optional().nullable();

// Schema for document object
const documentSchema = z.object({
  title: z.string(),
  url: z.string(),
  type: z.string(),
  size: z.string(),
}).array().optional();

// Base schema for article creation/updates (without refinement)
const baseArticleSchema = z.object({
  title: z.string().max(200, 'Title too long').optional(),
  excerpt: z.string().optional(),
  // Content is optional - only required if there's no media, images, or documents
  // This allows users to create nuggets with just URLs/images
  content: z.string().default(''),
  authorId: z.string().min(1, 'Author ID is required'),
  authorName: z.string().min(1, 'Author name is required'),
  category: z.string().min(1, 'Category is required'),
  categories: z.array(z.string()).optional(),
  publishedAt: z.string().optional(),
  tags: z.array(z.string()).default([]),
  readTime: z.number().optional(),
  visibility: z.enum(['public', 'private']).default('public'),
  // Media and attachment fields
  media: mediaSchema,
  images: z.array(z.string()).optional(),
  documents: documentSchema,
  source_type: z.string().optional(),
  // Display author (for aliases)
  displayAuthor: z.object({
    name: z.string(),
    avatarUrl: z.string().optional(),
  }).optional(),
});

// Create schema with refinement: at least one of content/media/images/documents must be present
// AND at least one tag must be present (tags are mandatory)
export const createArticleSchema = baseArticleSchema.refine(
  (data) => {
    // At least one of: content, media, images, or documents must be present
    const hasContent = data.content && data.content.trim().length > 0;
    const hasMedia = data.media !== null && data.media !== undefined;
    const hasImages = data.images && data.images.length > 0;
    const hasDocuments = data.documents && data.documents.length > 0;
    
    return hasContent || hasMedia || hasImages || hasDocuments;
  },
  {
    message: 'Please provide content, a URL, images, or documents',
    path: ['content'], // Error will appear on content field
  }
).refine(
  (data) => {
    // Tags are mandatory - at least one tag must be present
    const tags = data.tags || [];
    return tags.length > 0 && tags.every(tag => typeof tag === 'string' && tag.trim().length > 0);
  },
  {
    message: 'At least one tag is required',
    path: ['tags'], // Error will appear on tags field
  }
);

export const updateArticleSchema = baseArticleSchema.partial();

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

