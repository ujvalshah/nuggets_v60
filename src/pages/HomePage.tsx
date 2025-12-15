
import React, { useState, useRef, useEffect } from 'react';
import { Article, SortOrder, Collection } from '@/types';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useArticles } from '@/hooks/useArticles';
import { Loader2, AlertCircle, TrendingUp, Folder, Hash } from 'lucide-react';
import { ArticleModal } from '@/components/ArticleModal';
import { ArticleGrid } from '@/components/ArticleGrid';
import { storageService } from '@/services/storageService';
import { Badge } from '@/components/UI/Badge';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

interface HomePageProps {
  searchQuery: string;
  viewMode: 'grid' | 'feed' | 'masonry' | 'utility';
  setViewMode: (mode: 'grid' | 'feed' | 'masonry' | 'utility') => void;
  selectedCategories: string[];
  setSelectedCategories: (c: string[]) => void;
  selectedTag: string | null;
  setSelectedTag: (t: string | null) => void;
  sortOrder: SortOrder;
}

export const HomePage: React.FC<HomePageProps> = ({
  searchQuery,
  viewMode,
  selectedCategories,
  setSelectedCategories,
  selectedTag,
  setSelectedTag,
  sortOrder
}) => {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { currentUserId } = useAuth();

  // Sidebar Data
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [featuredCollections, setFeaturedCollections] = useState<Collection[]>([]);

  useEffect(() => {
    let isMounted = true;
    
    const loadSidebarData = async () => {
        try {
            const cats = await storageService.getCategories();
            const cols = await storageService.getCollections();
            
            // Only update state if component is still mounted
            if (!isMounted) return;
            
            setAllCategories(cats);
            
            // Sort by nugget count (descending) and take top 10
            const sortedCols = cols
                .filter(c => c.type === 'public')
                .sort((a, b) => b.entries.length - a.entries.length)
                .slice(0, 10);
                
            setFeaturedCollections(sortedCols);
        } catch (error: any) {
            // Ignore cancellation errors - they're expected when component unmounts or new requests start
            if (error.message === 'Request cancelled') {
                return;
            }
            // Log other errors for debugging but don't show to user (sidebar data is non-critical)
            console.warn('Failed to load sidebar data:', error);
        }
    };
    
    loadSidebarData();
    
    // Cleanup: mark component as unmounted
    return () => {
        isMounted = false;
    };
  }, []);

  const { articles = [], query } = useArticles({
    searchQuery,
    selectedCategories,
    selectedTag,
    sortOrder,
    userId: currentUserId,
    limit: 25 // Increased from 6 to show more nuggets on homepage
  });

  const handleRefreshFeed = async () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await query.refetch();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && !isRefreshing) {
      touchStartRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartRef.current;
    if (window.scrollY === 0 && diff > 0 && touchStartRef.current > 0) {
      const newPullY = Math.min(diff * 0.4, 120); 
      setPullY(newPullY);
    }
  };

  const handleTouchEnd = async () => {
    if (pullY > 60) {
      setIsRefreshing(true);
      setPullY(60); 
      await handleRefreshFeed();
      setIsRefreshing(false);
      setPullY(0);
    } else {
      setPullY(0);
    }
    touchStartRef.current = 0;
  };

  const toggleCategory = (cat: string) => {
      setSelectedCategories(
          selectedCategories.includes(cat) 
            ? selectedCategories.filter(c => c !== cat) 
            : [...selectedCategories, cat]
      );
  };

  if (query.isError) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-slate-500">
        <AlertCircle className="w-10 h-10 mb-2 text-red-500" />
        <p>Something went wrong loading the feed.</p>
        <button onClick={() => query.refetch()} className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700">Try Again</button>
      </div>
    );
  }

  return (
    <main className="w-full flex flex-col min-h-screen relative" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} ref={containerRef}>
      
      {/* Refresh Indicator */}
      <div className="absolute top-0 left-0 w-full flex justify-center pointer-events-none z-10" style={{ height: `${pullY}px`, opacity: pullY > 0 ? 1 : 0, transition: isRefreshing ? 'height 0.3s ease' : 'none' }}>
        <div className="mt-6 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 h-10 w-10 flex items-center justify-center transform transition-transform" style={{ transform: isRefreshing ? 'scale(1)' : `scale(${Math.min(pullY / 60, 1)}) rotate(${pullY * 3}deg)` }}>
          <Loader2 size={20} className={`text-primary-600 dark:text-primary-400 ${isRefreshing ? 'animate-spin' : ''}`} />
        </div>
      </div>

      <div className="w-full transition-transform duration-300 ease-out origin-top" style={{ transform: `translateY(${pullY}px)` }}>
        
        {/* Holy Grail Layout for Feed View */}
        {viewMode === 'feed' ? (
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
                
                {/* Left Sidebar: Topics Widget */}
                {/* Fixed height + Scrollable if too many topics */}
                <div className="hidden md:block md:col-span-3 lg:col-span-3 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar pr-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-white">
                            <Hash size={16} className="text-primary-500" />
                            <h3 className="text-sm font-bold uppercase tracking-wider">Topics</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {allCategories.map(cat => (
                                <Badge 
                                    key={cat} 
                                    label={cat} 
                                    variant={selectedCategories.includes(cat) ? 'primary' : 'neutral'}
                                    className="cursor-pointer text-[11px] py-1.5 px-3"
                                    onClick={() => toggleCategory(cat)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Site Footer Links - Moved to Left for visibility on MD */}
                    <div className="px-2">
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            <Link to="/about" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">About</Link>
                            <Link to="/terms" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Terms</Link>
                            <Link to="/privacy" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Privacy</Link>
                            <Link to="/guidelines" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Guidelines</Link>
                            <Link to="/contact" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Contact</Link>
                        </div>
                        <div className="mt-3 text-[10px] text-slate-300 dark:text-slate-600">
                            © {new Date().getFullYear()} Nuggets. All rights reserved.
                        </div>
                    </div>
                </div>

                {/* Center: Feed */}
                <div className="md:col-span-9 lg:col-span-6 w-full mx-auto">
                    <ArticleGrid 
                        articles={articles}
                        viewMode="feed" // Forces full width single column
                        isLoading={query.isLoading}
                        onArticleClick={setSelectedArticle}
                        isBookmarked={isBookmarked}
                        onToggleBookmark={toggleBookmark}
                        onTagClick={(t) => setSelectedTag(t)}
                        onCategoryClick={(c) => toggleCategory(c)}
                        emptyTitle="No nuggets found"
                        emptyMessage="We couldn't find any nuggets matching your filters."
                        currentUserId={currentUserId}
                    />
                </div>

                {/* Right Sidebar: Collections & Footer */}
                {/* Fixed height + Scrollable */}
                <div className="hidden lg:block lg:col-span-3 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar pl-2 space-y-6">
                    {/* Collections Widget */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-white">
                            <TrendingUp size={16} className="text-primary-500" />
                            <h3 className="text-sm font-bold uppercase tracking-wider">Top Collections</h3>
                        </div>
                        <div className="space-y-1">
                            {featuredCollections.map(col => (
                                <div key={col.id} className="group cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
                                            <Folder size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate group-hover:text-primary-600 transition-colors">{col.name}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">{col.entries.length} nuggets</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        ) : (
            // Grid/Masonry/Utility View: Standard Full Width Container
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <ArticleGrid 
                    articles={articles}
                    viewMode={viewMode}
                    isLoading={query.isLoading}
                    onArticleClick={setSelectedArticle}
                    isBookmarked={isBookmarked}
                    onToggleBookmark={toggleBookmark}
                    onTagClick={(t) => setSelectedTag(t)}
                    onCategoryClick={(c) => toggleCategory(c)}
                    currentUserId={currentUserId}
                />
            </div>
        )}
      </div>

      {selectedArticle && (
        <ArticleModal
          isOpen={!!selectedArticle}
          onClose={() => setSelectedArticle(null)}
          article={selectedArticle}
        />
      )}
    </main>
  );
};
