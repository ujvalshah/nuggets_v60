import { BatchRow } from '@/types/batch';
import { storageService } from './storageService';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { detectProviderFromUrl, shouldAutoGenerateTitle } from '@/utils/urlUtils';
import { normalizeCategoryLabel } from '@/utils/formatters';
import { unfurlUrl } from './unfurlService';
import type { Article } from '@/types';
import type { NuggetMedia } from '@/types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Constants for validation
const MAX_URLS_PER_BATCH = 100;
const MAX_URL_LENGTH = 2048;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Extract URLs from text (one per line, or from pasted blocks)
 * Handles URLs embedded in text, validates protocol, deduplicates
 */
function extractUrls(text: string): string[] {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const urlRegex = /https?:\/\/[^\s]+/gi;
  const urls: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // If line looks like a URL, use it directly
    if (trimmed.match(/^https?:\/\//i)) {
      urls.push(trimmed);
    } else {
      // Otherwise, extract URLs from the line
      const matches = trimmed.match(urlRegex);
      if (matches) {
        urls.push(...matches);
      }
    }
  }
  
  // Validate and deduplicate
  const validUrls: string[] = [];
  const seen = new Set<string>();
  
  for (const url of urls) {
    try {
      const parsed = new URL(url);
      
      // Only allow http and https
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        continue;
      }
      
      // Normalize URL (remove trailing slash, lowercase hostname)
      const normalized = `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/$/, '')}${parsed.search}${parsed.hash}`;
      
      if (!seen.has(normalized)) {
        seen.add(normalized);
        validUrls.push(url); // Keep original URL for display
      }
    } catch {
      // Invalid URL, skip
      continue;
    }
  }
  
  return validUrls;
}

/**
 * Transform Nugget metadata to Article format for preview
 */
function nuggetToArticle(
  url: string,
  nuggetMedia: NuggetMedia | null,
  currentUserId: string,
  authorName: string,
  customTitle?: string,
  customContent?: string,
  categories: string[] = []
): Article {
  // CRITICAL: Only use metadata title for Social/Video content types
  // For news sites, articles, blogs, etc., metadata title should be ignored
  let title = customTitle;
  if (!title && nuggetMedia?.previewMetadata?.title) {
    // Only use metadata title if URL allows auto-title generation (Social/Video only)
    if (shouldAutoGenerateTitle(url)) {
      title = nuggetMedia.previewMetadata.title;
    }
  }
  // Fallback to "Untitled Nugget" if no title is available
  if (!title) {
    title = 'Untitled Nugget';
  }
  const description = nuggetMedia?.previewMetadata?.description || '';
  const content = customContent || description || url;
  const excerpt = content.substring(0, 150) + (content.length > 150 ? '...' : '');
  
  // Calculate read time (200 words per minute)
  const wordCount = content.trim().split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  
  return {
    id: `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title,
    excerpt,
    content,
    author: {
      id: currentUserId,
      name: authorName,
    },
    publishedAt: new Date().toISOString(),
    categories,
    tags: [],
    readTime,
    visibility: 'public',
    source_type: 'link',
    media: nuggetMedia,
  };
}

/**
 * Process URLs with concurrency limit
 * Uses Set to avoid race conditions when multiple promises complete simultaneously
 */
async function processWithConcurrency<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  concurrency: number = 3
): Promise<void> {
  const executing = new Set<Promise<void>>();
  
  for (const item of items) {
    const promise = processor(item).finally(() => {
      executing.delete(promise);
    });
    
    executing.add(promise);
    
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  
  // Wait for all remaining promises
  await Promise.all(executing);
}

export const batchService = {
  // --- Generators ---
  generateId: () => Math.random().toString(36).substr(2, 9),

  // --- Parsers ---

  /**
   * Parse links from text input
   * Extracts URLs robustly, validates protocol, deduplicates
   * Validates input limits
   */
  async parseLinks(text: string): Promise<BatchRow[]> {
    if (!text || !text.trim()) {
      throw new Error('Input cannot be empty');
    }
    
    const urls = extractUrls(text);
    
    // Validate limits
    if (urls.length === 0) {
      throw new Error('No valid URLs found. Please check your input.');
    }
    
    if (urls.length > MAX_URLS_PER_BATCH) {
      throw new Error(`Maximum ${MAX_URLS_PER_BATCH} URLs allowed per batch. Found ${urls.length}.`);
    }
    
    // Validate URL lengths
    const invalidUrls = urls.filter(url => url.length > MAX_URL_LENGTH);
    if (invalidUrls.length > 0) {
      throw new Error(`Some URLs exceed maximum length of ${MAX_URL_LENGTH} characters.`);
    }
    
    return urls.map(url => ({
      id: this.generateId(),
      url,
      title: '', // Will be fetched via unfurl
      content: '',
      categories: [],
      visibility: 'public',
      status: 'pending',
      selected: true,
      errorMessage: undefined,
      previewArticle: undefined,
    }));
  },

  async parseCSV(file: File): Promise<BatchRow[]> {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }
    
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows: BatchRow[] = results.data.map((row: any) => ({
            id: this.generateId(),
            url: row.url || '',
            title: row.title || '',
            content: row.text || row.content || row.notes || '',
            categories: row.categories ? row.categories.split(',').map((c: string) => c.trim()) : [],
            visibility: (row.visibility?.toLowerCase() === 'private') ? 'private' : 'public',
            status: 'ready',
            selected: true,
            errorMessage: undefined,
            previewArticle: undefined,
          }));
          
          const validRows = rows.filter(r => r.url);
          
          // Validate limits
          if (validRows.length === 0) {
            reject(new Error('No valid URLs found in CSV file.'));
            return;
          }
          
          if (validRows.length > MAX_URLS_PER_BATCH) {
            reject(new Error(`Maximum ${MAX_URLS_PER_BATCH} URLs allowed per batch. Found ${validRows.length}.`));
            return;
          }
          
          resolve(validRows);
        },
        error: (err) => reject(err)
      });
    });
  },

  async parseExcel(file: File): Promise<BatchRow[]> {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json: any[] = XLSX.utils.sheet_to_json(sheet);

          const rows: BatchRow[] = json.map((row: any) => ({
            id: this.generateId(),
            url: row.url || '',
            title: row.title || '',
            content: row.text || row.content || row.notes || '',
            categories: row.categories ? row.categories.toString().split(',').map((c: string) => c.trim()) : [],
            visibility: (row.visibility?.toLowerCase() === 'private') ? 'private' : 'public',
            status: 'ready',
            selected: true,
            errorMessage: undefined,
            previewArticle: undefined,
          }));
          
          const validRows = rows.filter(r => r.url);
          
          // Validate limits
          if (validRows.length === 0) {
            reject(new Error('No valid URLs found in Excel file.'));
            return;
          }
          
          if (validRows.length > MAX_URLS_PER_BATCH) {
            reject(new Error(`Maximum ${MAX_URLS_PER_BATCH} URLs allowed per batch. Found ${validRows.length}.`));
            return;
          }
          
          resolve(validRows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsBinaryString(file);
    });
  },

  // --- Processing ---

  /**
   * Fetch metadata for rows using the real unfurl service
   * Uses concurrency control (3 requests at a time)
   * Always returns a fallback if metadata fetch fails
   * Aggregates errors for user feedback
   */
  async fetchMetadataForRows(
    rows: BatchRow[],
    currentUserId: string,
    authorName: string
  ): Promise<{ rows: BatchRow[]; errors: string[] }> {
    const rowsToFetch = rows.filter(
      row => row.url && row.status !== 'success' && row.status !== 'fetching'
    );
    
    if (rowsToFetch.length === 0) {
      return { rows, errors: [] };
    }
    
    // Mark as fetching
    const updatedRows = rows.map(row => {
      if (rowsToFetch.find(r => r.id === row.id)) {
        return { ...row, status: 'fetching' as const };
      }
      return row;
    });
    
    const errors: string[] = [];
    
    // Process with concurrency limit (3 concurrent requests)
    await processWithConcurrency(
      rowsToFetch,
      async (row) => {
        const index = updatedRows.findIndex(r => r.id === row.id);
        if (index === -1) return;
        
        try {
          // Call real unfurl service
          const nuggetMedia = await unfurlUrl(row.url);
          
          // Create preview article from metadata
          const previewArticle = nuggetToArticle(
            row.url,
            nuggetMedia,
            currentUserId,
            authorName,
            row.title || undefined, // Use custom title if provided
            row.content || undefined, // Use custom content if provided
            row.categories
          );
          
          // Update row with fetched data
          updatedRows[index] = {
            ...updatedRows[index],
            title: previewArticle.title,
            content: row.content || previewArticle.content,
            status: 'ready' as const,
            previewArticle,
            errorMessage: undefined,
          };
        } catch (error: any) {
          // Track error for aggregation
          const errorMsg = error?.message || 'Failed to fetch metadata';
          errors.push(`${row.url}: ${errorMsg}`);
          
          // Create fallback article even on error
          let siteName = 'unknown';
          try {
            siteName = new URL(row.url).hostname.replace('www.', '');
          } catch {
            // URL parsing failed, use default
          }
          
          const fallbackMedia: NuggetMedia = {
            type: 'link',
            url: row.url,
            previewMetadata: {
              url: row.url,
              title: row.title || 'Content Preview',
              siteName,
            },
          };
          
          const fallbackArticle = nuggetToArticle(
            row.url,
            fallbackMedia,
            currentUserId,
            authorName,
            row.title,
            row.content,
            row.categories
          );
          
          updatedRows[index] = {
            ...updatedRows[index],
            title: fallbackArticle.title,
            content: row.content || fallbackArticle.content,
            status: 'ready' as const, // Still ready, just with fallback data
            previewArticle: fallbackArticle,
            errorMessage: errorMsg,
          };
        }
      },
      3 // Concurrency limit: 3 requests at a time
    );
    
    return { rows: updatedRows, errors };
  },

  /**
   * Create articles from batch rows
   * Uses preview article data if available, otherwise constructs from row data
   * Supports progress callback for UI updates
   */
  async createBatch(
    rows: BatchRow[],
    currentUserId: string,
    authorName: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<BatchRow[]> {
    const results = [...rows];
    const rowsToCreate = results.filter(r => r.selected && r.status === 'ready');
    let completed = 0;

    for (const row of rowsToCreate) {
      try {
        // Use preview article if available, otherwise construct from row
        const articleData = row.previewArticle || nuggetToArticle(
          row.url,
          null,
          currentUserId,
          authorName,
          row.title,
          row.content,
          row.categories
        );
        
        // Create the article using existing storage service
        // Priority: User-provided title > Metadata title (ONLY for Social/Video) > Fallback
        // CRITICAL: Metadata titles should ONLY be used for Social/Video content types
        let resolvedTitle = row.title && row.title.trim() ? row.title : undefined;
        
        if (!resolvedTitle && articleData.media?.previewMetadata?.title) {
          // Only use metadata title if URL allows auto-title generation (Social/Video only)
          if (shouldAutoGenerateTitle(row.url)) {
            resolvedTitle = articleData.media.previewMetadata.title.trim();
          }
        }
        
        // Final fallback
        if (!resolvedTitle) {
          resolvedTitle = articleData.title;
        }
        
        await storageService.createArticle({
          title: resolvedTitle,
          content: row.content || articleData.content,
          excerpt: articleData.excerpt,
          author: { id: currentUserId, name: authorName },
          categories: row.categories.map(c => normalizeCategoryLabel(c).replace('#', '')).filter(Boolean),
          tags: [],
          readTime: articleData.readTime,
          visibility: row.visibility || 'public', // Ensure public visibility by default
          source_type: 'link',
          // Ensure media includes previewMetadata with title for display resolution
          // For YouTube videos, ensure proper aspect ratio (16:9) to prevent cropping
          media: (() => {
            if (articleData.media) {
              return articleData.media;
            }
            const detectedType = detectProviderFromUrl(row.url);
            const fallbackMedia: any = {
              type: detectedType,
              url: row.url,
              previewMetadata: {
                url: row.url,
                title: resolvedTitle,
                providerName: new URL(row.url).hostname,
              },
            };
            
            // Set aspect ratio for YouTube videos to prevent cropping
            if (detectedType === 'youtube') {
              fallbackMedia.aspect_ratio = '16/9';
            }
            
            return fallbackMedia;
          })(),
        });

        row.status = 'success';
        completed++;
        
        // Report progress
        if (onProgress) {
          onProgress(completed, rowsToCreate.length);
        }
        
        await delay(100); // Small delay to visualize progress
      } catch (e: any) {
        row.status = 'error';
        const errorMsg = e?.message || 'Creation failed';
        row.errorMessage = errorMsg;
        console.error(`Failed to create nugget for ${row.url}:`, errorMsg, e);
        completed++;
        
        // Report progress even on error
        if (onProgress) {
          onProgress(completed, rowsToCreate.length);
        }
      }
    }

    return results;
  }
};
