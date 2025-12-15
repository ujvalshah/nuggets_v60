import mongoose, { Schema, Document } from 'mongoose';

// Media types matching frontend
export type MediaType = 'image' | 'video' | 'document' | 'link' | 'text' | 'youtube' | 'twitter' | 'linkedin' | 'instagram' | 'tiktok' | 'rich';

export interface INuggetMedia {
  type: MediaType;
  url: string;
  thumbnail_url?: string;
  aspect_ratio?: string;
  filename?: string;
  previewMetadata?: {
    url: string;
    finalUrl?: string;
    providerName?: string;
    siteName?: string;
    title?: string;
    description?: string;
    imageUrl?: string;
    faviconUrl?: string;
    authorName?: string;
    publishDate?: string;
    mediaType?: MediaType;
  };
}

export interface IEngagement {
  likes: number;
  bookmarks: number;
  shares: number;
  views: number;
}

export interface IDocument {
  title: string;
  url: string;
  type: 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'ppt' | 'pptx' | 'txt' | 'zip';
  size: string;
}

export interface IArticle extends Document {
  title: string;
  excerpt?: string; // Short summary/description
  content: string;
  authorId: string;
  authorName: string;
  category: string; // Single category (legacy)
  categories?: string[]; // Array of categories (new)
  publishedAt: string;
  tags: string[];
  readTime?: number; // Estimated read time in minutes
  visibility?: 'public' | 'private'; // Default: public
  
  // Media fields (matching frontend Article interface)
  media?: INuggetMedia | null;
  images?: string[]; // Legacy field
  video?: string; // Legacy field
  documents?: IDocument[]; // Legacy field
  themes?: string[];
  
  // Engagement metrics
  engagement?: IEngagement;
  
  // System fields
  source_type?: string; // 'link' | 'video' | 'note' | 'idea' | etc
  created_at?: string;
  updated_at?: string;
}

const NuggetMediaSchema = new Schema<INuggetMedia>({
  type: { type: String, required: true },
  url: { type: String, required: true },
  thumbnail_url: { type: String },
  aspect_ratio: { type: String },
  filename: { type: String },
  previewMetadata: {
    type: {
      url: String,
      finalUrl: String,
      providerName: String,
      siteName: String,
      title: String,
      description: String,
      imageUrl: String,
      faviconUrl: String,
      authorName: String,
      publishDate: String,
      mediaType: String
    },
    required: false
  }
}, { _id: false });

const EngagementSchema = new Schema<IEngagement>({
  likes: { type: Number, default: 0 },
  bookmarks: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  views: { type: Number, default: 0 }
}, { _id: false });

const DocumentSchema = new Schema<IDocument>({
  title: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: String, required: true }
}, { _id: false });

const ArticleSchema = new Schema<IArticle>({
  title: { type: String, required: true },
  excerpt: { type: String }, // Optional excerpt
  content: { type: String, default: '' }, // Optional - validation handled by Zod schema
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  category: { type: String, required: true }, // Keep for backward compatibility
  categories: { type: [String], default: [] }, // New field
  publishedAt: { type: String, required: true },
  tags: { type: [String], default: [] },
  readTime: { type: Number }, // Optional read time
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  
  // Media fields
  media: { type: NuggetMediaSchema, default: null },
  images: { type: [String], default: [] }, // Legacy
  video: { type: String }, // Legacy
  documents: { type: [DocumentSchema], default: [] }, // Legacy
  themes: { type: [String], default: [] },
  
  // Engagement
  engagement: { type: EngagementSchema },
  
  // System
  source_type: { type: String },
  created_at: { type: String },
  updated_at: { type: String }
}, {
  timestamps: false // We manage our own timestamps
});

export const Article = mongoose.model<IArticle>('Article', ArticleSchema);


