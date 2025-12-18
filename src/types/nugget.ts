/**
 * Canonical Nugget Schema
 * 
 * This schema is IMMUTABLE once stored.
 * All metadata must be normalized server-side.
 * Frontend MUST NOT guess dimensions or calculate aspectRatio.
 */

export interface Nugget {
  id: string;
  url: string;
  domain: string;
  contentType: 'article' | 'video' | 'social' | 'image' | 'document';
  title: string;
  description?: string;

  media?: {
    type: 'image' | 'video';
    src: string;
    width: number;            // MUST be integer
    height: number;           // MUST be integer
    aspectRatio: number;      // width / height (calculated server-side)
    renderMode?: 'contain' | 'cover';
    isEstimated?: boolean;
  };

  source: {
    name: string;
    domain: string;
    favicon?: string;
    platformColor?: string;
  };

  author?: string;
  publishedAt?: string;
  quality?: 'full' | 'partial' | 'fallback';
}


