import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Article, Collection } from '@/types';
import { storageService } from '@/services/storageService';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { TabsBar } from '@/components/profile/TabsBar';
import { NewsCard } from '@/components/NewsCard';
import { CollectionsGrid } from '@/components/profile/CollectionsGrid';
import { Loader2, Layers, CheckSquare, X, Trash2, Lock, Globe, FolderPlus, ChevronDown, Info, Folder, Plus } from 'lucide-react';
import { ArticleModal } from '@/components/ArticleModal';
import { AddToCollectionModal } from '@/components/AddToCollectionModal';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useToast } from '@/hooks/useToast';
import { ConfirmActionModal } from '@/components/settings/ConfirmActionModal';
import { Tooltip } from '@/components/UI/Tooltip';

interface MySpacePageProps {
  currentUserId: string;
}

// Dynamic descriptions based on state
const getDescription = (tab: string, visibility: 'public' | 'private') => {
  if (tab === 'collections') return "Thematic lists you have curated for the community.";
  if (tab === 'folders') return "Your private folders for organizing nuggets. Visible only to you.";
  if (tab === 'bookmarks') return "A flat list of everything you've saved.";
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

  // Hooks
  const { isBookmarked, toggleBookmark, bookmarks } = useBookmarks();
  
  // Context
  const targetUserId = userId || currentUserId;
  const isOwner = currentUserId === targetUserId;

  useEffect(() => {
    const isMounted = { current: true };
    
    loadData(isMounted);
    
    // Cleanup on unmount
    return () => {
      isMounted.current = false;
    };
  }, [targetUserId, bookmarks]);

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
  
  const publicNuggets = safeArticles.filter(a => a.visibility === 'public' || !a.visibility);
  const privateNuggets = safeArticles.filter(a => a.visibility === 'private');
  
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
      if (activeTab !== 'nuggets') return;
      
      for (const id of selectedIds) {
          await storageService.updateArticle(id, { visibility });
      }
      toast.success(`Updated ${selectedIds.length} items to ${visibility}`);
      setSelectionMode(false);
      setSelectedIds([]);
      loadData();
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
                                            disabled={selectedIds.length === 0}
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold shadow-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Actions <ChevronDown size={14} />
                                        </button>

                                        {isActionMenuOpen && (
                                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in zoom-in-95 duration-100 origin-top-right">
                                                {activeTab === 'nuggets' && (
                                                    <>
                                                        {nuggetVisibility === 'private' && (
                                                            <button onClick={() => { handleBulkVisibility('public'); setIsActionMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                                <Globe size={14} className="text-blue-500" /> Make Public
                                                            </button>
                                                        )}
                                                        {nuggetVisibility === 'public' && (
                                                            <button onClick={() => { handleBulkVisibility('private'); setIsActionMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                                <Lock size={14} className="text-amber-500" /> Make Private
                                                            </button>
                                                        )}
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
