import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Article, Collection } from '@/types';
import { storageService } from '@/services/storageService';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { TabsBar } from '@/components/profile/TabsBar';
import { NewsCard } from '@/components/NewsCard';
import { CollectionsGrid } from '@/components/profile/CollectionsGrid';
import { Loader2, Layers, CheckSquare, X, Trash2, Lock, Globe, FolderPlus, ChevronDown, Info, Folder, Plus, Edit2 } from 'lucide-react';
import { ArticleModal } from '@/components/ArticleModal';
import { AddToCollectionModal } from '@/components/AddToCollectionModal';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useToast } from '@/hooks/useToast';
import { ConfirmActionModal } from '@/components/settings/ConfirmActionModal';
import { Tooltip } from '@/components/UI/Tooltip';
import { queryClient } from '@/queryClient';
import { getBookmarkFolders, getBookmarksByFolder, deleteBookmarkFolder, type BookmarkFolder } from '@/services/bookmarkFoldersService';

interface MySpacePageProps {
  currentUserId: string;
}

// Dynamic descriptions based on state
const getDescription = (tab: string, visibility: 'public' | 'private') => {
  if (tab === 'collections') return "Thematic lists you have curated for the community.";
  if (tab === 'folders') return "Your private folders for organizing nuggets. Visible only to you.";
  if (tab === 'bookmarks') return "Your saved nuggets organized by folder.";
  if (tab === 'nuggets') {
      return visibility === 'public' 
        ? "Your nuggets that you've shared with the community."
        : "These are nuggets you have created that are not shared publicly.";
  }
  return "";
};

export const MySpacePage: React.FC<MySpacePageProps> = ({ currentUserId }) => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  
  // Data State
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [bookmarkedArticles, setBookmarkedArticles] = useState<Article[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  
  // Bookmark Folders State
  const [bookmarkFolders, setBookmarkFolders] = useState<BookmarkFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [isLoadingBookmarkFolders, setIsLoadingBookmarkFolders] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  
  // UI State
  const [activeTab, setActiveTab] = useState('nuggets');
  
  // Sub-Navigation State (Hierarchy)
  const [nuggetVisibility, setNuggetVisibility] = useState<'public' | 'private'>('public');

  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  // Selection Mode State
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  // Hooks
  const { isBookmarked, toggleBookmark, bookmarks } = useBookmarks();
  
  // Context
  const targetUserId = userId || currentUserId;
  const isOwner = currentUserId === targetUserId;

  // Normalize visibility: treat missing visibility as 'private'
  const getVisibility = (article: Article): 'public' | 'private' => {
    return article.visibility ?? 'private';
  };

  useEffect(() => {
    const isMounted = { current: true };
    
    loadData(isMounted);
    
    // Cleanup on unmount
    return () => {
      isMounted.current = false;
    };
  }, [targetUserId, bookmarks]);

  // Load bookmark folders when bookmarks tab is active
  useEffect(() => {
    if (activeTab === 'bookmarks' && isOwner && currentUserId) {
      loadBookmarkFolders();
    } else if (activeTab !== 'bookmarks') {
      // Reset active folder when leaving bookmarks tab
      setActiveFolderId(null);
    }
  }, [activeTab, isOwner, currentUserId]);

  // Set default folder when folders are loaded
  useEffect(() => {
    if (bookmarkFolders.length > 0 && activeFolderId === null && activeTab === 'bookmarks') {
      const generalFolder = bookmarkFolders.find(f => f.isDefault);
      if (generalFolder) {
        setActiveFolderId(generalFolder.id);
        loadBookmarksForFolder(generalFolder.id);
      }
    }
  }, [bookmarkFolders, activeTab]);

  // Load bookmarks when folder selection changes or bookmarks array changes
  useEffect(() => {
    if (activeFolderId && activeTab === 'bookmarks' && isOwner) {
      loadBookmarksForFolder(activeFolderId);
    }
  }, [activeFolderId, activeTab, isOwner, bookmarks.length]);

  // Clear selection when tab changes
  useEffect(() => {
      setSelectionMode(false);
      setSelectedIds([]);
      setIsActionMenuOpen(false);
  }, [activeTab, nuggetVisibility]);

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setIsActionMenuOpen(false);
      }
    };
    if (isActionMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isActionMenuOpen]);

  const loadData = async (isMounted: { current: boolean } = { current: true }) => {
    setLoading(true);
    
    try {
      const [user, userArticles, allCollections, allArticles] = await Promise.all([
        storageService.getUserById(targetUserId),
        storageService.getArticlesByAuthor(targetUserId),
        storageService.getCollections(),
        storageService.getAllArticles()
      ]);

      // Only update state if component is still mounted
      if (!isMounted.current) return;

      // Defensive checks: ensure arrays are always arrays
      const safeUserArticles = Array.isArray(userArticles) ? userArticles : [];
      const safeAllCollections = Array.isArray(allCollections) ? allCollections : [];
      const safeAllArticles = Array.isArray(allArticles) ? allArticles : [];

      setProfileUser(user || null);
      setArticles(safeUserArticles);
      setCollections(safeAllCollections.filter(c => c.creatorId === targetUserId));
      
      const userBookmarks = safeAllArticles.filter(a => bookmarks.includes(a.id));
      setBookmarkedArticles(userBookmarks);

    } catch (e: any) {
      // Ignore cancellation errors - they're expected when component unmounts or new requests start
      if (e?.message === 'Request cancelled') {
        return;
      }
      console.error("Failed to load profile data", e);
      // On error, ensure arrays are set to empty arrays to prevent filter crashes
      if (isMounted.current) {
        setArticles([]);
        setCollections([]);
        setBookmarkedArticles([]);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Defensive checks: ensure arrays before calling filter
  const safeArticles = Array.isArray(articles) ? articles : [];
  const safeCollections = Array.isArray(collections) ? collections : [];
  
  const publicNuggets = safeArticles.filter(a => getVisibility(a) === 'public');
  const privateNuggets = safeArticles.filter(a => getVisibility(a) === 'private');
  
  // SEGREGATION LOGIC
  const publicCollections = safeCollections.filter(c => c.type === 'public');
  const privateFolders = safeCollections.filter(c => c.type === 'private');

  // Hierarchy: Top Level Tabs - Updated per requirements
  const tabs: { id: string; label: string; count?: number }[] = [
    { 
        id: 'nuggets', 
        label: 'My Nuggets', 
        count: isOwner ? (publicNuggets.length + privateNuggets.length) : publicNuggets.length 
    },
    { 
        id: 'bookmarks', 
        label: 'Bookmarks', 
        count: bookmarkedArticles.length 
    },
    { 
        id: 'collections', 
        label: 'Community Collections', 
        count: publicCollections.length 
    },
  ];

  const handleUpdateProfile = (updated: User) => setProfileUser(updated);

  const toggleSelectionMode = () => {
      const newMode = !selectionMode;
      setSelectionMode(newMode);
      if (!newMode) setSelectedIds([]);
  };

  const handleSelect = (id: string) => {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
      if (selectedIds.length === 0) return;
      
      if (activeTab === 'collections' || activeTab === 'folders') {
          for (const id of selectedIds) {
              await storageService.deleteCollection(id);
          }
          toast.success(`Deleted ${selectedIds.length} ${activeTab === 'folders' ? 'folders' : 'collections'}`);
      } else {
          if (activeTab === 'bookmarks') {
              for (const id of selectedIds) {
                  toggleBookmark(id);
              }
              toast.success(`Removed ${selectedIds.length} bookmarks`);
              // Refresh bookmark list for current folder
              if (activeFolderId) {
                  await loadBookmarksForFolder(activeFolderId);
              }
          } else {
              for (const id of selectedIds) {
                  await storageService.deleteArticle(id);
              }
              toast.success(`Deleted ${selectedIds.length} nuggets`);
          }
      }
      
      setShowDeleteConfirm(false);
      setSelectionMode(false);
      setSelectedIds([]);
      loadData();
  };

  const handleBulkVisibility = async (visibility: 'public' | 'private') => {
      if (activeTab !== 'nuggets' || selectedIds.length === 0) return;
      
      setIsUpdatingVisibility(true);
      
      // Filter out nuggets already in target state
      const nuggetsToUpdate = currentList.filter((item: Article) => 
          selectedIds.includes(item.id) && getVisibility(item) !== visibility
      );
      
      if (nuggetsToUpdate.length === 0) {
          toast.info(`All selected nuggets are already ${visibility}`);
          setIsUpdatingVisibility(false);
          setSelectionMode(false);
          setSelectedIds([]);
          return;
      }
      
      // Snapshot previous state for rollback
      const previousArticles = [...articles];
      const failedIds: string[] = [];
      
      // Optimistic update: update local state immediately
      setArticles(prev => prev.map(a => {
          if (nuggetsToUpdate.some(n => n.id === a.id)) {
              return { ...a, visibility };
          }
          return a;
      }));
      
      // Optimistic cache update
      queryClient.setQueryData(['articles'], (oldData: any) => {
          if (!oldData) return oldData;
          
          // Handle paginated response
          if (oldData.data && Array.isArray(oldData.data)) {
              return {
                  ...oldData,
                  data: oldData.data.map((a: Article) => 
                      nuggetsToUpdate.some(n => n.id === a.id) 
                          ? { ...a, visibility }
                          : a
                  )
              };
          }
          
          // Handle array response
          if (Array.isArray(oldData)) {
              return oldData.map((a: Article) => 
                  nuggetsToUpdate.some(n => n.id === a.id) 
                      ? { ...a, visibility }
                      : a
              );
          }
          
          return oldData;
      });
      
      try {
          // Parallel PATCH calls
          const updatePromises = nuggetsToUpdate.map(async (nugget: Article) => {
              try {
                  const updated = await storageService.updateArticle(nugget.id, { visibility });
                  if (!updated) {
                      throw new Error('Update failed');
                  }
                  return { id: nugget.id, success: true, article: updated };
              } catch (error: any) {
                  failedIds.push(nugget.id);
                  return { id: nugget.id, success: false, error };
              }
          });
          
          const results = await Promise.all(updatePromises);
          const successCount = results.filter(r => r.success).length;
          const failureCount = results.filter(r => !r.success).length;
          
          if (failureCount > 0) {
              // Rollback failed IDs
              setArticles(prev => prev.map(a => {
                  if (failedIds.includes(a.id)) {
                      const original = previousArticles.find(pa => pa.id === a.id);
                      return original || a;
                  }
                  return a;
              }));
              
              // Rollback cache for failed IDs
              queryClient.setQueryData(['articles'], (oldData: any) => {
                  if (!oldData) return oldData;
                  
                  if (oldData.data && Array.isArray(oldData.data)) {
                      return {
                          ...oldData,
                          data: oldData.data.map((a: Article) => {
                              if (failedIds.includes(a.id)) {
                                  const original = previousArticles.find(pa => pa.id === a.id);
                                  return original || a;
                              }
                              return a;
                          })
                      };
                  }
                  
                  if (Array.isArray(oldData)) {
                      return oldData.map((a: Article) => {
                          if (failedIds.includes(a.id)) {
                              const original = previousArticles.find(pa => pa.id === a.id);
                              return original || a;
                          }
                          return a;
                      });
                  }
                  
                  return oldData;
              });
              
              if (successCount > 0) {
                  toast.warning(`Updated ${successCount} nugget${successCount > 1 ? 's' : ''}, ${failureCount} failed`);
              } else {
                  toast.error(`Failed to update ${failureCount} nugget${failureCount > 1 ? 's' : ''}`);
              }
          } else {
              // All succeeded - update cache with server responses
              const successfulUpdates = results.filter(r => r.success && r.article) as Array<{ id: string; article: Article }>;
              
              queryClient.setQueryData(['articles'], (oldData: any) => {
                  if (!oldData) return oldData;
                  
                  if (oldData.data && Array.isArray(oldData.data)) {
                      return {
                          ...oldData,
                          data: oldData.data.map((a: Article) => {
                              const update = successfulUpdates.find(u => u.id === a.id);
                              return update ? update.article : a;
                          })
                      };
                  }
                  
                  if (Array.isArray(oldData)) {
                      return oldData.map((a: Article) => {
                          const update = successfulUpdates.find(u => u.id === a.id);
                          return update ? update.article : a;
                      });
                  }
                  
                  return oldData;
              });
              
              // Invalidate to ensure consistency
              await queryClient.invalidateQueries({ queryKey: ['articles'] });
              
              // Refresh local articles state to update filtered lists (public/private)
              const refreshedArticles = await storageService.getArticlesByAuthor(targetUserId);
              setArticles(Array.isArray(refreshedArticles) ? refreshedArticles : []);
              
              toast.success(`Updated ${successCount} nugget${successCount > 1 ? 's' : ''} to ${visibility}`);
          }
          
          setSelectionMode(false);
          setSelectedIds([]);
          setIsActionMenuOpen(false);
      } catch (error: any) {
          // Full rollback on unexpected error
          setArticles(previousArticles);
          
          queryClient.setQueryData(['articles'], (oldData: any) => {
              if (!oldData) return oldData;
              
              if (oldData.data && Array.isArray(oldData.data)) {
                  return {
                      ...oldData,
                      data: oldData.data.map((a: Article) => {
                          const original = previousArticles.find(pa => pa.id === a.id);
                          return original || a;
                      })
                  };
              }
              
              if (Array.isArray(oldData)) {
                  return oldData.map((a: Article) => {
                      const original = previousArticles.find(pa => pa.id === a.id);
                      return original || a;
                  });
              }
              
              return oldData;
          });
          
          toast.error('Failed to update visibility. Please try again.');
      } finally {
          setIsUpdatingVisibility(false);
      }
  };

  const handleBulkFollow = async (action: 'follow' | 'unfollow') => {
      if (selectedIds.length === 0 || activeTab !== 'collections') return;
      
      // Store previous state for rollback
      const previousCollections = [...collections];
      
      // Optimistic update
      setCollections(prev => prev.map(c => {
          if (selectedIds.includes(c.id)) {
              const change = action === 'follow' ? 1 : -1;
              const newFollowersCount = Math.max(0, c.followersCount + change);
              return { 
                  ...c, 
                  followersCount: newFollowersCount,
                  followers: action === 'follow' 
                      ? [...(c.followers || []), 'temp'] // Temporary, will be updated by backend
                      : (c.followers || []).slice(0, -1) // Remove last (optimistic)
              };
          }
          return c;
      }));

      try {
          // Parallel API calls
          await Promise.all(
              selectedIds.map(id => 
                  action === 'follow' 
                      ? storageService.followCollection(id)
                      : storageService.unfollowCollection(id)
              )
          );
          
          // Reload data to get accurate state from backend
          await loadData();
          
          toast.success(`${action === 'follow' ? 'Followed' : 'Unfollowed'} ${selectedIds.length} collections`);
          setSelectionMode(false);
          setSelectedIds([]);
          setIsActionMenuOpen(false);
      } catch (error: any) {
          // Rollback on error
          setCollections(previousCollections);
          toast.error(`Failed to ${action} collections`);
      }
  };

  const handleCollectionUpdate = (updatedCollection: Collection) => {
      setCollections(prev => prev.map(c => 
          c.id === updatedCollection.id ? updatedCollection : c
      ));
  };

  // Bookmark Folders Functions
  const loadBookmarkFolders = async () => {
    if (!isOwner || !currentUserId) return;
    
    setIsLoadingBookmarkFolders(true);
    try {
      const folders = await getBookmarkFolders();
      const sortedFolders = folders.sort((a, b) => a.order - b.order);
      setBookmarkFolders(sortedFolders);
    } catch (error: any) {
      console.error('Failed to load bookmark folders:', error);
      toast.error('Failed to load bookmark folders');
    } finally {
      setIsLoadingBookmarkFolders(false);
    }
  };

  const loadBookmarksForFolder = async (folderId: string) => {
    if (!isOwner || !currentUserId) return;

    try {
      const response = await getBookmarksByFolder(folderId);
      const nuggetIds = response.nuggetIds || [];

      // Fetch articles for these nugget IDs
      const articlePromises = nuggetIds.map(id => storageService.getArticleById(id));
      const articleResults = await Promise.all(articlePromises);
      const validArticles = articleResults.filter((article): article is Article => article !== undefined);

      setBookmarkedArticles(validArticles);
    } catch (error: any) {
      // Ignore cancellation errors - they're expected when switching folders quickly or component unmounts
      if (error?.name === 'AbortError' || error?.message === 'Request cancelled') {
        return; // expected, ignore silently
      }

      console.error('Failed to load bookmarks for folder:', error);
      toast.error('Failed to load bookmarks');
      setBookmarkedArticles([]);
    }
  };

  const handleFolderDelete = async (folderId: string) => {
    if (!isOwner || !currentUserId) return;

    const folder = bookmarkFolders.find(f => f.id === folderId);
    if (!folder || folder.isDefault) {
      toast.error('Cannot delete the default folder');
      return;
    }

    const wasActiveFolder = activeFolderId === folderId;

    try {
      await deleteBookmarkFolder(folderId);
      toast.success('Folder deleted');
      
      // Refresh folders
      const updatedFolders = await getBookmarkFolders();
      const sortedFolders = updatedFolders.sort((a, b) => a.order - b.order);
      setBookmarkFolders(sortedFolders);
      
      // Switch to General folder if deleted folder was active
      if (wasActiveFolder) {
        const generalFolder = sortedFolders.find(f => f.isDefault);
        if (generalFolder) {
          setActiveFolderId(generalFolder.id);
          await loadBookmarksForFolder(generalFolder.id);
        }
      }
    } catch (error: any) {
      console.error('Failed to delete folder:', error);
      toast.error('Failed to delete folder');
    }
  };

  const handleFolderRenameStart = (folder: BookmarkFolder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const handleFolderRenameCancel = () => {
    setEditingFolderId(null);
    setEditingFolderName('');
  };

  const handleFolderRenameSave = async (folderId: string) => {
    // Note: Backend doesn't have update endpoint yet, so this is a placeholder
    // The UI will be ready but won't work until backend is added
    toast.error('Rename functionality requires backend support');
    handleFolderRenameCancel();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-slate-400" /></div>;
  if (!profileUser) return <div className="p-12 text-center text-slate-500">User not found</div>;

  // --- HIERARCHY LOGIC ---
  // Determine what list to show based on Tab + Sub-Filter
  let currentList: any[] = [];
  
  if (activeTab === 'nuggets') {
      if (nuggetVisibility === 'public') currentList = publicNuggets;
      else currentList = privateNuggets;
  } else if (activeTab === 'collections') {
      currentList = publicCollections;
  } else if (activeTab === 'folders') {
      currentList = privateFolders;
  } else if (activeTab === 'bookmarks') {
      currentList = bookmarkedArticles;
  }

  // Determine current description
  const tabDescription = getDescription(activeTab, nuggetVisibility);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-white pb-32">
      <div className="max-w-[1280px] mx-auto px-6 py-8">
        
        <div className="flex flex-col lg:flex-row items-start">
          
          {/* Left Column: Sidebar */}
          <div className="w-full lg:w-[270px] flex-shrink-0 mb-8 lg:mb-0">
            <ProfileCard 
                user={profileUser} 
                nuggetCount={publicNuggets.length} 
                isOwner={isOwner}
                onUpdate={handleUpdateProfile}
            />
          </div>

          {/* Right Column: Content */}
          <div className="flex-grow min-w-0 lg:ml-10 w-full relative">
            
            {/* Header / Toolbar Area */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 min-h-[44px]">
                    
                    {/* Tabs */}
                    <div className={`overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto transition-opacity duration-200 ${selectionMode ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                        <TabsBar 
                            tabs={tabs} 
                            activeTab={activeTab} 
                            onTabChange={(t) => {
                                setActiveTab(t);
                                // Reset visibility filter to public when switching back to nuggets tab
                                if (t === 'nuggets') setNuggetVisibility('public');
                            }} 
                        />
                    </div>
                    
                    {/* Contextual Toolbar */}
                    {isOwner && currentList.length > 0 && (
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                            
                            {selectionMode ? (
                                // --- SELECTION ACTIVE STATE ---
                                <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-2">
                                        {selectedIds.length} Selected
                                    </span>

                                    {/* Dropdown Menu */}
                                    <div className="relative" ref={actionMenuRef}>
                                        <button 
                                            onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                                            disabled={selectedIds.length === 0 || isUpdatingVisibility}
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold shadow-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isUpdatingVisibility ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" /> Updating...
                                                </>
                                            ) : (
                                                <>
                                                    Actions <ChevronDown size={14} />
                                                </>
                                            )}
                                        </button>

                                        {isActionMenuOpen && (
                                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in zoom-in-95 duration-100 origin-top-right">
                                                {activeTab === 'nuggets' && (
                                                    <>
                                                        <button 
                                                            onClick={() => { handleBulkVisibility('public'); setIsActionMenuOpen(false); }} 
                                                            disabled={isUpdatingVisibility}
                                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <Globe size={14} className="text-blue-500" /> Make Public
                                                        </button>
                                                        <button 
                                                            onClick={() => { handleBulkVisibility('private'); setIsActionMenuOpen(false); }} 
                                                            disabled={isUpdatingVisibility}
                                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <Lock size={14} className="text-amber-500" /> Make Private
                                                        </button>
                                                        <button onClick={() => { setShowAddToCollection(true); setIsActionMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                            <FolderPlus size={14} className="text-indigo-500" /> Add to Collection
                                                        </button>
                                                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                                                    </>
                                                )}
                                                
                                                {activeTab === 'bookmarks' && (
                                                    <>
                                                        <button onClick={() => { setShowAddToCollection(true); setIsActionMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                            <FolderPlus size={14} className="text-indigo-500" /> Organize to Folder
                                                        </button>
                                                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                                                    </>
                                                )}

                                                {activeTab === 'collections' && (
                                                    <>
                                                        <button onClick={() => { handleBulkFollow('follow'); setIsActionMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors">
                                                            <Plus size={14} /> Follow Selected
                                                        </button>
                                                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                                                        <button onClick={() => { handleBulkFollow('unfollow'); setIsActionMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                                                            <X size={14} /> Unfollow Selected
                                                        </button>
                                                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                                                    </>
                                                )}

                                                <button 
                                                    onClick={() => { setShowDeleteConfirm(true); setIsActionMenuOpen(false); }} 
                                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    <Trash2 size={14} /> {activeTab === 'bookmarks' ? 'Remove Bookmarks' : 'Delete Items'}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        onClick={toggleSelectionMode}
                                        className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        title="Cancel Selection"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ) : (
                                // --- DEFAULT STATE ---
                                <>
                                    <Tooltip content="Import links or CSV files">
                                        <button 
                                            onClick={() => navigate('/bulk-create')}
                                            className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl text-xs font-bold transition-colors"
                                        >
                                            <Layers size={16} /> Batch Import
                                        </button>
                                    </Tooltip>
                                    
                                    <Tooltip content="Select multiple items to organize or delete">
                                        <button 
                                            onClick={toggleSelectionMode}
                                            className="flex items-center gap-2 px-3 py-2 bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 dark:bg-primary-900/10 dark:text-primary-400 dark:border-primary-900/30 rounded-xl text-xs font-bold transition-all shadow-sm"
                                        >
                                            <CheckSquare size={16} /> Select
                                        </button>
                                    </Tooltip>
                                </>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full">
                        {/* Hierarchy Sub-Navigation (For Nuggets Tab Only) - MOVED TO LEFT */}
                        {activeTab === 'nuggets' && isOwner && (
                            <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                                <button
                                    onClick={() => setNuggetVisibility('public')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${nuggetVisibility === 'public' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    <Globe size={12} /> Public <span className="opacity-60 text-[10px]">{publicNuggets.length}</span>
                                </button>
                                <button
                                    onClick={() => setNuggetVisibility('private')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${nuggetVisibility === 'private' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    <Lock size={12} /> Private <span className="opacity-60 text-[10px]">{privateNuggets.length}</span>
                                </button>
                            </div>
                        )}

                        {/* Tab Description Helper */}
                        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 px-1 animate-in fade-in">
                            <Info size={12} className="shrink-0" />
                            {tabDescription}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            {activeTab === 'bookmarks' && isOwner ? (
              // Bookmarks Tab: Two-column layout (Folders | Nuggets)
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Column: Folder List */}
                <div className="w-full lg:w-64 flex-shrink-0">
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Folders</h3>
                    </div>
                    
                    {isLoadingBookmarkFolders ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin text-slate-400" size={20} />
                      </div>
                    ) : bookmarkFolders.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-sm">
                        No folders found
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {bookmarkFolders.map((folder) => (
                          <div
                            key={folder.id}
                            className={`group flex items-center justify-between p-2 rounded-lg transition-colors ${
                              activeFolderId === folder.id
                                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {editingFolderId === folder.id ? (
                              <div className="flex-1 flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingFolderName}
                                  onChange={(e) => setEditingFolderName(e.target.value)}
                                  onBlur={() => handleFolderRenameSave(folder.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleFolderRenameSave(folder.id);
                                    } else if (e.key === 'Escape') {
                                      handleFolderRenameCancel();
                                    }
                                  }}
                                  autoFocus
                                  className="flex-1 px-2 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded"
                                />
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setActiveFolderId(folder.id);
                                    setSelectionMode(false);
                                    setSelectedIds([]);
                                  }}
                                  className="flex-1 text-left text-sm font-medium"
                                >
                                  {folder.name}
                                  {folder.isDefault && (
                                    <span className="ml-2 text-xs text-slate-500">(Default)</span>
                                  )}
                                </button>
                                {!folder.isDefault && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleFolderRenameStart(folder);
                                      }}
                                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                                      title="Rename folder"
                                    >
                                      <Edit2 size={14} className="text-slate-500" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`Delete folder "${folder.name}"? Bookmarks in this folder will not be deleted.`)) {
                                          handleFolderDelete(folder.id);
                                        }
                                      }}
                                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                                      title="Delete folder"
                                    >
                                      <Trash2 size={14} className="text-red-500" />
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Nuggets Grid */}
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentList.map(item => (
                      <NewsCard 
                        key={item.id} 
                        article={item as Article}
                        viewMode="grid"
                        isBookmarked={isBookmarked(item.id)}
                        onToggleBookmark={toggleBookmark}
                        onTagClick={() => {}}
                        onCategoryClick={() => {}}
                        onClick={() => setSelectedArticle(item as Article)}
                        currentUserId={currentUserId}
                        selectionMode={selectionMode}
                        isSelected={selectedIds.includes(item.id)}
                        onSelect={handleSelect}
                      />
                    ))}

                    {currentList.length === 0 && (
                      <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <div className="flex flex-col items-center">
                          <Folder className="w-12 h-12 text-slate-300 mb-2" />
                          <p className="text-slate-400 text-sm">No bookmarks yet in this folder.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Other tabs: Standard grid layout
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTab === 'collections' || activeTab === 'folders' ? (
                    <div className="col-span-full">
                        <CollectionsGrid 
                          collections={currentList} 
                          onCollectionClick={(id) => selectionMode ? handleSelect(id) : navigate(`/collections/${id}`)}
                          selectionMode={selectionMode}
                          selectedIds={selectedIds}
                          onSelect={handleSelect}
                          onCollectionUpdate={handleCollectionUpdate}
                        />
                    </div>
                ) : (
                    currentList.map(item => (
                      <NewsCard 
                        key={item.id} 
                        article={item as Article}
                        viewMode="grid"
                        isBookmarked={isBookmarked(item.id)}
                        onToggleBookmark={toggleBookmark}
                        onTagClick={() => {}}
                        onCategoryClick={() => {}}
                        onClick={() => setSelectedArticle(item as Article)}
                        currentUserId={currentUserId}
                        selectionMode={selectionMode}
                        isSelected={selectedIds.includes(item.id)}
                        onSelect={handleSelect}
                      />
                    ))
                )}

                {currentList.length === 0 && (
                  <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    {activeTab === 'folders' ? (
                        <div className="flex flex-col items-center">
                            <Folder className="w-12 h-12 text-slate-300 mb-2" />
                            <p className="text-slate-400 text-sm">No folders yet. Save a bookmark to create one.</p>
                        </div>
                    ) : (
                        <p className="text-slate-400 text-sm">Nothing to see here yet.</p>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {selectedArticle && (
        <ArticleModal
          isOpen={!!selectedArticle}
          onClose={() => setSelectedArticle(null)}
          article={selectedArticle}
        />
      )}

      <ConfirmActionModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title={activeTab === 'bookmarks' ? "Remove Bookmarks?" : activeTab === 'folders' ? "Delete Folders?" : "Delete Items?"}
        description={`Are you sure you want to delete ${selectedIds.length} items? This cannot be undone.`}
        actionLabel="Delete"
        isDestructive
      />

      <AddToCollectionModal 
        isOpen={showAddToCollection}
        onClose={() => setShowAddToCollection(false)}
        articleIds={selectedIds}
        mode={activeTab === 'bookmarks' ? 'private' : 'public'} 
      />
    </div>
  );
};
