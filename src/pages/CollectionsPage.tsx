import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Collection } from '@/types';
import { storageService } from '@/services/storageService';
import { Search, LayoutGrid, List, ArrowUp, ArrowDown, ChevronDown, Plus, X, Folder, CheckSquare } from 'lucide-react';
import { EmptyState } from '@/components/UI/EmptyState';
import { useNavigate } from 'react-router-dom';
import { CollectionCard } from '@/components/collections/CollectionCard';
import { TableView } from '@/components/collections/TableView';
import { createPortal } from 'react-dom';
import { useToast } from '@/hooks/useToast';
import { Tooltip } from '@/components/UI/Tooltip';

type ViewMode = 'grid' | 'table';
type SortField = 'created' | 'updated' | 'followers' | 'nuggets' | 'name';
type SortDirection = 'asc' | 'desc';

// -- Internal Instruction Modal --
const CreateCollectionInstructionModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X size={20} />
        </button>
        
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mb-4">
            <Folder size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">How to create a Collection</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Collections must start with at least one nugget. <br/>
            To create a new one, find any nugget in your feed, click the <strong>Folder Icon</strong>, and select <strong>"Create new public collection"</strong>.
          </p>
          <button 
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const CollectionsPage: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showInstruction, setShowInstruction] = useState(false);

  // Selection State
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    loadCollections();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setIsActionMenuOpen(false);
      }
    };
    if (isActionMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isActionMenuOpen]);

  const loadCollections = async () => {
    setIsLoading(true);
    try {
      const [all, allUsersResponse] = await Promise.all([
          storageService.getCollections(),
          storageService.getUsers()
      ]);

      // Ensure allUsers is an array
      const allUsers = Array.isArray(allUsersResponse) ? allUsersResponse : [];

      const hydrated = all.map(col => ({
          ...col,
          creator: allUsers.find(u => u.id === col.creatorId)
      }));

      setCollections(hydrated.filter(c => c.type === 'public'));
    } catch (error: any) {
      // Handle cancelled requests gracefully
      if (error?.message !== 'Request cancelled') {
        console.error('Error loading collections:', error);
      }
      setCollections([]);
    } finally {
      setIsLoading(false);
    }
  };

  const processedCollections = useMemo(() => {
    let result = [...collections];
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(c => c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q)));
    }
    result.sort((a, b) => {
        let valA: any, valB: any;
        switch (sortField) {
            case 'created': valA = new Date(a.createdAt).getTime(); valB = new Date(b.createdAt).getTime(); break;
            case 'updated': valA = new Date(a.updatedAt || a.createdAt).getTime(); valB = new Date(b.updatedAt || b.createdAt).getTime(); break;
            case 'followers': valA = a.followersCount; valB = b.followersCount; break;
            case 'nuggets': valA = a.entries.length; valB = b.entries.length; break;
            case 'name': valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break;
            default: return 0;
        }
        return sortDirection === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
    return result;
  }, [collections, searchQuery, sortField, sortDirection]);

  const toggleSelectionMode = () => {
      const newMode = !selectionMode;
      setSelectionMode(newMode);
      if (!newMode) setSelectedIds([]);
  };

  const handleSelect = (id: string) => {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkFollow = async (action: 'follow' | 'unfollow') => {
      if (selectedIds.length === 0) return;
      
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
          
          // Reload collections to get accurate state from backend
          await loadCollections();
          
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

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
      <div className="sticky top-[4.5rem] z-30 bg-slate-900 border-b border-slate-800 shadow-sm transition-colors">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Community Collections</h1>
                        <p className="text-sm text-slate-400 max-w-xl">Curated themes and topics shared across the Nuggets ecosystem.</p>
                    </div>
                    
                    <div className="flex gap-2 items-center self-end md:self-auto">
                        {/* Select Toggle */}
                        {collections.length > 0 && (
                            <>
                                {selectionMode ? (
                                    <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-right-4 duration-200">
                                        <span className="text-xs font-bold text-slate-300 ml-2">{selectedIds.length} Selected</span>
                                        
                                        <div className="relative" ref={actionMenuRef}>
                                            <button 
                                                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                                                disabled={selectedIds.length === 0}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 text-slate-900 rounded-lg text-xs font-bold hover:bg-primary-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Actions <ChevronDown size={14} />
                                            </button>
                                            
                                            {isActionMenuOpen && (
                                                <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in zoom-in-95 duration-100 origin-top-right">
                                                    <button onClick={() => handleBulkFollow('follow')} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors">
                                                        <Plus size={14} /> Follow All
                                                    </button>
                                                    <div className="h-px bg-slate-100 dark:bg-slate-800" />
                                                    <button onClick={() => handleBulkFollow('unfollow')} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                                                        <X size={14} /> Unfollow All
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <button 
                                            onClick={toggleSelectionMode}
                                            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <Tooltip content="Select collections to follow/unfollow">
                                        <button 
                                            onClick={toggleSelectionMode}
                                            className="flex items-center gap-2 px-3 py-2 bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 dark:bg-primary-900/10 dark:text-primary-400 dark:border-primary-900/30 rounded-xl text-sm font-bold transition-all shadow-sm"
                                        >
                                            <CheckSquare size={16} /> Select
                                        </button>
                                    </Tooltip>
                                )}
                            </>
                        )}
                        
                        {!selectionMode && (
                            <button 
                                onClick={() => setShowInstruction(true)} 
                                className="flex items-center gap-2 bg-slate-800 text-white border border-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-700 transition-all"
                            >
                                <Plus size={16} /> Create
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Row */}
                <div className={`flex flex-col md:flex-row gap-4 items-center justify-between w-full transition-opacity duration-300 ${selectionMode ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    <div className="relative w-full md:max-w-2xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Search collections..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 focus:bg-slate-900 focus:border-primary-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all shadow-sm" />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 p-0.5 shadow-sm">
                            <div className="relative shrink-0 border-r border-slate-700 pr-1">
                                <select value={sortField} onChange={(e) => setSortField(e.target.value as SortField)} className="appearance-none pl-3 pr-8 py-2 bg-transparent text-sm font-medium text-slate-200 focus:outline-none cursor-pointer w-[140px]">
                                    <option value="created" className="text-slate-900 bg-white">Created Date</option>
                                    <option value="updated" className="text-slate-900 bg-white">Last Updated</option>
                                    <option value="followers" className="text-slate-900 bg-white">Followers</option>
                                    <option value="nuggets" className="text-slate-900 bg-white">Nugget Count</option>
                                    <option value="name" className="text-slate-900 bg-white">Name (A-Z)</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>
                            <button onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')} className="p-2 text-slate-400 hover:text-white transition-colors">
                                {sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                            </button>
                        </div>
                        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 shrink-0 shadow-sm">
                            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}><LayoutGrid size={18} /></button>
                            <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}><List size={18} /></button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {processedCollections.length === 0 ? (
            <EmptyState icon={<Search />} title="No collections found" description={searchQuery ? `We couldn't find anything matching "${searchQuery}".` : "Be the first to create a community collection!"} />
        ) : (
            <div className={`animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {processedCollections.map(col => (
                            <CollectionCard 
                                key={col.id} 
                                collection={col} 
                                onClick={() => selectionMode ? handleSelect(col.id) : navigate(`/collections/${col.id}`)} 
                                selectionMode={selectionMode}
                                isSelected={selectedIds.includes(col.id)}
                                onSelect={handleSelect}
                                onCollectionUpdate={handleCollectionUpdate}
                            />
                        ))}
                    </div>
                ) : (
                    <TableView collections={processedCollections} onClick={(id) => navigate(`/collections/${id}`)} />
                )}
            </div>
        )}
      </div>

      {showInstruction && <CreateCollectionInstructionModal isOpen={showInstruction} onClose={() => setShowInstruction(false)} />}
    </div>
  );
};
