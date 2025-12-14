import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { storageService } from '@/services/storageService';

export const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const { currentUserId } = useAuth();

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('newsbytes_bookmarks');
        if (saved) {
          setBookmarks(JSON.parse(saved));
        }
      }
    } catch (e) {
      console.warn('Failed to load bookmarks from storage:', e);
    }
  }, []);

  const toggleBookmark = async (articleId: string) => {
    // Optimistic Update
    const isAdding = !bookmarks.includes(articleId);
    
    setBookmarks(prev => {
      const newBookmarks = isAdding
        ? [...prev, articleId]
        : prev.filter(id => id !== articleId);
      
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('newsbytes_bookmarks', JSON.stringify(newBookmarks));
        }
      } catch (e) {
        console.warn('Failed to save bookmarks to storage:', e);
      }
      return newBookmarks;
    });

    // Background Sync with "General Bookmarks" Collection
    if (currentUserId) {
        try {
            const collections = await storageService.getCollections();
            // Find user's general bookmarks
            let generalCol = collections.find(c => c.creatorId === currentUserId && c.name === 'General Bookmarks' && c.type === 'private');
            
            // Auto-create if missing
            if (!generalCol) {
                generalCol = await storageService.createCollection('General Bookmarks', 'Auto-saved bookmarks.', currentUserId, 'private');
            }

            if (isAdding) {
                await storageService.addArticleToCollection(generalCol.id, articleId, currentUserId);
            } else {
                await storageService.removeArticleFromCollection(generalCol.id, articleId, currentUserId);
            }
        } catch (error) {
            console.error("Failed to sync bookmark with collection:", error);
        }
    }
  };

  const isBookmarked = (articleId: string) => bookmarks.includes(articleId);

  return { bookmarks, toggleBookmark, isBookmarked };
};

