import { BatchRow } from '@/types/batch';
import { storageService } from './storageService';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { detectProviderFromUrl } from '@/utils/urlUtils';
import { normalizeCategoryLabel } from '@/utils/formatters';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const batchService = {
  // --- Generators ---
  generateId: () => Math.random().toString(36).substr(2, 9),

  // --- Parsers ---

  async parseLinks(text: string): Promise<BatchRow[]> {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    return lines.map(line => {
      const url = line.trim();
      return {
        id: this.generateId(),
        url,
        title: '', // Will be fetched
        content: '',
        categories: [],
        visibility: 'public',
        status: 'pending',
        selected: true
      };
    });
  },

  async parseCSV(file: File): Promise<BatchRow[]> {
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
            selected: true
          }));
          resolve(rows.filter(r => r.url)); // Filter out rows without URLs
        },
        error: (err) => reject(err)
      });
    });
  },

  async parseExcel(file: File): Promise<BatchRow[]> {
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
            selected: true
          }));
          resolve(rows.filter(r => r.url));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsBinaryString(file);
    });
  },

  // --- Processing ---

  async fetchMetadataForRows(rows: BatchRow[]): Promise<BatchRow[]> {
    // In a real app, we might use a Promise.all with concurrency limit
    // For now, we simulate a bulk fetch or individual fetches
    const updatedRows = [...rows];

    for (const row of updatedRows) {
      if (row.url && !row.title && row.status !== 'success') {
        row.status = 'fetching';
        
        try {
          // Simulate network request
          await delay(300 + Math.random() * 500);
          
          // Dummy logic to generate metadata from URL
          const urlObj = new URL(row.url);
          const domain = urlObj.hostname.replace('www.', '');
          
          row.title = `${domain} - ${urlObj.pathname.split('/').pop() || 'Untitled Page'} `
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .trim();
            
          if (row.title.length < 5) row.title = `Nugget from ${domain}`;

          row.content = row.content || `Saved from ${row.url}`;
          row.status = 'ready';
        } catch (e) {
          row.status = 'error';
          row.errorMessage = 'Failed to fetch preview';
        }
      }
    }
    
    return updatedRows;
  },

  async createBatch(rows: BatchRow[], currentUserId: string): Promise<BatchRow[]> {
    const results = [...rows];

    for (const row of results) {
      if (row.selected && row.status === 'ready') {
        try {
          // Create the article using existing storage service
          await storageService.createArticle({
            title: row.title || 'Untitled Nugget',
            content: row.content || row.url,
            excerpt: (row.content || row.url).substring(0, 150),
            author: { id: currentUserId, name: 'Admin User' }, // In real app, name comes from profile
            categories: row.categories.map(c => normalizeCategoryLabel(c).replace('#', '')).filter(Boolean),
            tags: [],
            readTime: 1,
            visibility: row.visibility,
            source_type: 'link',
            media: {
              type: detectProviderFromUrl(row.url),
              url: row.url,
              previewMetadata: {
                url: row.url,
                title: row.title,
                providerName: new URL(row.url).hostname
              }
            }
          });

          row.status = 'success';
          await delay(100); // Small delay to visualize progress
        } catch (e) {
          row.status = 'error';
          row.errorMessage = 'Creation failed';
        }
      }
    }

    return results;
  }
};
