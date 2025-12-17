import { apiClient } from './apiClient';

export interface BookmarkFolder {
  id: string;
  userId: string;
  name: string;
  order: number;
  isDefault: boolean;
  createdAt: string;
}

export interface BookmarkFoldersResponse {
  folderIds: string[];
}

export interface BookmarksByFolderResponse {
  nuggetIds: string[];
}

/**
 * Get all bookmark folders for the current user
 */
export const getBookmarkFolders = async (): Promise<BookmarkFolder[]> => {
  return apiClient.get<BookmarkFolder[]>('/bookmark-folders');
};

/**
 * Create a new bookmark folder
 */
export const createBookmarkFolder = async (name: string, order?: number): Promise<BookmarkFolder> => {
  return apiClient.post<BookmarkFolder>('/bookmark-folders', { name, order });
};

/**
 * Delete a bookmark folder
 */
export const deleteBookmarkFolder = async (folderId: string): Promise<void> => {
  return apiClient.delete(`/bookmark-folders/${folderId}`);
};

/**
 * Get folders that contain a specific bookmark (by nuggetId)
 */
export const getBookmarkFoldersForNugget = async (nuggetId: string): Promise<BookmarkFoldersResponse> => {
  return apiClient.get<BookmarkFoldersResponse>(`/bookmark-folders/bookmarks/${nuggetId}/folders`);
};

/**
 * Add bookmark to folders (idempotent)
 */
export const addBookmarkToFolders = async (bookmarkId: string, folderIds: string[]): Promise<void> => {
  return apiClient.post('/bookmark-folders/links', { bookmarkId, folderIds });
};

/**
 * Remove bookmark from folder
 */
export const removeBookmarkFromFolder = async (bookmarkId: string, folderId: string): Promise<void> => {
  return apiClient.delete(`/bookmark-folders/links?bookmarkId=${encodeURIComponent(bookmarkId)}&folderId=${encodeURIComponent(folderId)}`);
};

/**
 * Create a bookmark (and ensure it's in General folder)
 */
export const createBookmark = async (nuggetId: string): Promise<{ bookmarkId: string; folderIds: string[] }> => {
  return apiClient.post('/bookmark-folders/bookmarks', { nuggetId });
};

/**
 * Delete a bookmark (and all folder links)
 */
export const deleteBookmark = async (nuggetId: string): Promise<void> => {
  return apiClient.delete(`/bookmark-folders/bookmarks/${nuggetId}`);
};

/**
 * Get bookmarks by folder ID
 * Returns nuggetIds for bookmarks in the specified folder
 */
export const getBookmarksByFolder = async (folderId: string): Promise<BookmarksByFolderResponse> => {
  return apiClient.get<BookmarksByFolderResponse>(`/bookmark-folders/bookmarks?folderId=${encodeURIComponent(folderId)}`);
};

