export interface BatchRow {
  id: string;
  url: string;
  title: string;
  content: string; // Maps to 'text' or 'excerpt'
  categories: string[];
  visibility: 'public' | 'private';
  status: 'pending' | 'fetching' | 'ready' | 'success' | 'error';
  errorMessage?: string;
  selected?: boolean;
}

export type ImportMode = 'links' | 'csv' | 'excel';
