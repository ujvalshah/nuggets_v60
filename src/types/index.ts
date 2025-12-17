import type { AuthProvider } from './auth';

// --- Domain Models ---

export interface Document {
  title: string;
  url: string;
  type: 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'ppt' | 'pptx' | 'txt' | 'zip';
  size: string;
}

export type MediaType = 'image' | 'video' | 'document' | 'link' | 'text' | 'youtube' | 'twitter' | 'linkedin' | 'instagram' | 'tiktok' | 'rich';

export interface PreviewMetadata {
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
}

export interface NuggetMedia {
  type: MediaType;
  url: string;
  thumbnail_url?: string;
  aspect_ratio?: string;
  filename?: string;
  previewMetadata?: PreviewMetadata;
}

export interface Engagement {
  likes: number;
  bookmarks: number;
  shares: number;
  views: number;
}

export interface Contributor {
  userId: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  addedAt?: string;
}

export interface DisplayAuthor {
  name: string;
  avatarUrl?: string;
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  // New field for masking the real author
  displayAuthor?: DisplayAuthor;
  
  publishedAt: string; // ISO date string
  categories: string[]; 
  tags: string[];
  readTime: number; 
  visibility?: 'public' | 'private';
  
  // Media
  media?: NuggetMedia | null;
  // Legacy fields
  images?: string[]; 
  video?: string; 
  documents?: Document[]; 
  themes?: string[]; 

  // System
  created_at?: string;
  updated_at?: string;
  engagement?: Engagement;
  source_type?: string; // 'link' | 'video' | 'note' | 'idea' | etc
  
  // Contextual
  addedBy?: Contributor; // When inside a collection
}

// Alias
export type Nugget = Article;

export interface User {
  id: string;
  name: string; // Display Name
  username?: string; // Added for auth
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'blocked';
  joinedAt: string;
  
  // Auth Specific
  authProvider?: AuthProvider;
  emailVerified?: boolean;
  phoneNumber?: string;
  avatarUrl?: string;
  
  // Extended profile fields (from ModularUser)
  pincode?: string;
  city?: string;
  country?: string;
  gender?: string;
  dateOfBirth?: string;
  website?: string;
  bio?: string;
  location?: string;
  
  preferences?: {
      interestedCategories: string[];
  };
  lastFeedVisit?: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  createdAt: string;
  updatedAt?: string;
  followersCount: number;
  followers?: string[]; // Array of userIds who follow this collection
  entries: CollectionEntry[];
  validEntriesCount?: number; // Backend-validated count (preferred over entries.length)
  type: 'public' | 'private';
  
  // Display
  creator?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface CollectionEntry {
  articleId: string;
  addedByUserId: string;
  addedAt: string;
  flaggedBy: string[];
}

// --- UI & State ---

export type Theme = 'light' | 'dark';
export type SortOrder = 'latest' | 'oldest';

export interface FilterState {
  query: string;
  categories: string[];
  tag: string | null;
  sort: SortOrder;
  limit?: number;
}


