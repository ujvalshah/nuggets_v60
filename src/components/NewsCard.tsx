
import React, { useState, forwardRef, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Article } from '@/types';
import { formatDate } from '@/utils/formatters';
import { Bookmark, FolderPlus, MoreVertical, Flag, Trash2, Edit2, FileText, StickyNote, Lightbulb } from 'lucide-react';
import { ShareMenu } from './shared/ShareMenu';
import { CollectionPopover } from './CollectionPopover';
import { ReportModal } from './ReportModal';
import { useToast } from '@/hooks/useToast';
import { storageService } from '@/services/storageService';
import { ArticleModal } from './ArticleModal';
import { Tooltip } from './UI/Tooltip';
import { NewsCardMedia } from './newscard/NewsCardMedia';
import { ImageLightbox } from './ImageLightbox';
import { useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/queryClient';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface NewsCardProps {
  article: Article;
  viewMode: 'grid' | 'feed';
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onTagClick: (tag: string) => void;
  onCategoryClick: (category: string) => void;
  onClick: (article: Article) => void;
  expanded?: boolean; 
  onToggleExpand?: () => void;
  currentUserId?: string;
}

const TagPill: React.FC<{ label: string; onClick?: (e: React.MouseEvent) => void }> = ({ label, onClick }) => {
  const pill = (
    <span 
        onClick={onClick}
        className={`
            inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors border
            ${onClick ? 'cursor-pointer hover:border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:shadow-sm' : ''}
            bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700
        `}
    >
        {label}
    </span>
  );
  return onClick ? <Tooltip content="Click to filter">{pill}</Tooltip> : pill;
};

export const NewsCard = forwardRef<HTMLDivElement, NewsCardProps>(({
  article,
  viewMode,
  isBookmarked,
  onToggleBookmark,
  onCategoryClick,
  onClick,
  currentUserId,
}, ref) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAdmin } = useAuth();
  const { withAuth } = useRequireAuth();
  
  // -- State --
  const [showCollection, setShowCollection] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showTagPopover, setShowTagPopover] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  
  const [collectionMode, setCollectionMode] = useState<'public' | 'private'>('public');
  const [collectionAnchor, setCollectionAnchor] = useState<DOMRect | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const tagPopoverRef = useRef<HTMLDivElement>(null);
  const bookmarkButtonRef = useRef<HTMLButtonElement>(null);

  if (!article) return null;

  const isOwner = currentUserId === article.author.id;

  // -- Content Classification --
  const hasMedia = !!article.media || (article.images && article.images.length > 0) || !!article.video;
  const isLink = article.source_type === 'link';
  const isNoteOrIdea = article.source_type === 'note' || article.source_type === 'idea';
  const isTextNugget = !hasMedia && !isLink; 

  // -- Contributor Logic --
  // Show only if addedBy exists AND the user who added it is NOT the original author
  const showContributor = article.addedBy && article.addedBy.userId !== article.author.id;

  // -- Event Handlers --
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowMenu(false);
      if (tagPopoverRef.current && !tagPopoverRef.current.contains(event.target as Node)) setShowTagPopover(false);
    };
    if (showMenu || showTagPopover) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu, showTagPopover]);

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleBookmark(article.id);
    
    if (!isBookmarked) {
        // "Toast-Action" Flow:
        // 1. Save immediately (handled by useBookmarks hook syncing to General)
        // 2. Show success toast with "Change" button to organize
        toast.success("Saved to General Bookmarks", { 
            actionLabel: "Change", 
            onAction: () => {
                setCollectionMode('private');
                // Use ref to get fresh coordinates even if user scrolled
                if (bookmarkButtonRef.current) {
                    setCollectionAnchor(bookmarkButtonRef.current.getBoundingClientRect());
                } else {
                    // Fallback to event coordinates if ref missing (unlikely)
                    setCollectionAnchor(e.currentTarget.getBoundingClientRect());
                }
                setShowCollection(true);
            },
            duration: 4000
        });
    } else {
        // Undo Flow
        toast.info("Removed from Bookmarks", {
            actionLabel: "Undo",
            onAction: () => onToggleBookmark(article.id), // Toggling again re-adds it
            duration: 3000
        });
        setShowCollection(false);
    }
  };

  const handleMediaClick = (e: React.MouseEvent) => {
      e?.stopPropagation();
      const linkUrl = article.media?.previewMetadata?.url || article.media?.url;
      if (article.source_type === 'link' && linkUrl) {
          window.open(linkUrl, '_blank', 'noopener,noreferrer');
      } else {
          // If image type, open lightbox, else modal
          if (article.media?.type === 'image' || (article.images && article.images.length > 0)) {
             setShowLightbox(true);
          } else {
             setShowFullModal(true);
          }
      }
  };

  const handleDelete = async (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowMenu(false);
      if(window.confirm("Delete this nugget permanently?")) {
          await storageService.deleteArticle(article.id);
          await queryClient.invalidateQueries({ queryKey: ['articles'] });
          toast.success("Nugget deleted");
      }
  };

  const shouldShowTitle = article.title && !isNoteOrIdea; 

  return (
    <>
      <div 
        ref={ref}
        className={`group relative flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 ${viewMode === 'feed' ? 'w-full' : 'h-full'} p-4 gap-3`}
        onClick={() => onClick(article)}
      >
        {hasMedia && <NewsCardMedia article={article} onClick={handleMediaClick} />}

        <div className="flex flex-col flex-1 min-w-0">
            {isTextNugget && (
                <div className="mb-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold tracking-wider">
                        {article.source_type === 'idea' ? <Lightbulb size={10} /> : article.source_type === 'note' ? <StickyNote size={10} /> : <FileText size={10} />}
                        {article.source_type === 'idea' ? 'Thoughts' : article.source_type === 'note' ? 'Note' : 'Text'}
                    </span>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5 mb-2 relative">
              {(article.categories || []).slice(0, 2).map(cat => (
                  <TagPill key={cat} label={cat} onClick={(e) => { e.stopPropagation(); onCategoryClick(cat); }} />
              ))}
              {(article.categories?.length || 0) > 2 && (
                  <div className="relative" ref={tagPopoverRef}>
                      <button onClick={(e) => { e.stopPropagation(); setShowTagPopover(!showTagPopover); }} className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                          +{(article.categories?.length || 0) - 2}
                      </button>
                      {showTagPopover && (
                          <div className="absolute top-full left-0 mt-1 w-40 z-30 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl p-2 animate-in fade-in zoom-in-95 duration-200">
                              <div className="flex flex-col gap-1">
                                  {article.categories.slice(2).map(cat => (
                                      <button key={cat} onClick={(e) => { e.stopPropagation(); onCategoryClick(cat); setShowTagPopover(false); }} className="text-left text-xs px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">
                                          {cat}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              )}
            </div>

            {shouldShowTitle && (
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug mb-1 group-hover:text-primary-600 transition-colors">
                    {article.title}
                </h3>
            )}

            <div className="relative mb-1">
                <p className={`text-xs text-slate-600 dark:text-slate-400 leading-relaxed ${isTextNugget ? 'line-clamp-4 text-[13px]' : 'line-clamp-3'}`}>
                    {article.excerpt || article.content}
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none" />
            </div>

            <button onClick={(e) => { e.stopPropagation(); setShowFullModal(true); }} className="text-[11px] font-medium text-slate-400 hover:text-primary-600 transition-colors self-start mb-2">
                Read more →
            </button>
        </div>

        <div className="mt-auto pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500" onClick={(e) => {e.stopPropagation(); navigate(`/profile/${article.author.id}`)}}>
                <span className="text-slate-700 dark:text-slate-300 hover:underline cursor-pointer">{article.author.name}</span>
                <span>·</span>
                <span>{formatDate(article.publishedAt, false)}</span>
            </div>

            <div className="flex items-center gap-1">
                <ShareMenu 
                    data={{
                        type: 'nugget',
                        id: article.id,
                        title: article.title,
                        shareUrl: `${window.location.origin}/#/article/${article.id}`
                    }}
                    meta={{
                        author: article.author.name,
                        text: article.excerpt
                    }}
                />
                
                {/* Collection Button */}
                <button 
                    onClick={withAuth((e: React.MouseEvent) => { // Auth check here
                        e.stopPropagation(); 
                        setCollectionAnchor(e.currentTarget.getBoundingClientRect()); 
                        setCollectionMode('public'); 
                        setShowCollection(true); 
                    })} 
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors" 
                    title="Add to Collection"
                >
                    <FolderPlus size={14} />
                </button>
                
                {/* Bookmark Button */}
                <button 
                    ref={bookmarkButtonRef}
                    onClick={withAuth(handleBookmarkClick, 'guestBookmarks')} // CHECK 'guestBookmarks' FLAG
                    className={`w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isBookmarked ? 'text-primary-600' : 'text-slate-400'}`} 
                    title="Bookmark"
                >
                    <Bookmark size={14} fill={isBookmarked ? "currentColor" : "none"} />
                </button>
                
                <div className="relative" ref={menuRef}>
                    <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                        <MoreVertical size={14} />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 bottom-full mb-1 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-20 overflow-hidden">
                            {(isOwner || isAdmin) && (
                                <button onClick={(e) => {e.stopPropagation(); toast.info("Edit coming soon"); setShowMenu(false);}} className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-2"><Edit2 size={12} /> Edit</button>
                            )}
                            
                            {/* Report Button */}
                            <button 
                                onClick={withAuth((e: React.MouseEvent) => { // CHECK 'guestReports' FLAG
                                    e.stopPropagation(); 
                                    setShowReport(true); 
                                    setShowMenu(false); 
                                }, 'guestReports')} 
                                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <Flag size={12} /> Report
                            </button>
                            
                            {(isOwner || isAdmin) && (
                                <button onClick={handleDelete} className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={12} /> Delete</button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Soft Footer Extension for Contributors */}
        {showContributor && (
            <div className="-mx-4 -mb-4 -mt-3 px-4 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 rounded-b-2xl flex items-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate flex-1 min-w-0" title={`Added by ${article.addedBy!.name}`}>
                    Added by <span className="text-slate-600 dark:text-slate-300">{article.addedBy!.name}</span>
                </span>
            </div>
        )}
      </div>

      {/* -- Modals -- */}
      <CollectionPopover isOpen={showCollection} onClose={() => setShowCollection(false)} articleId={article.id} mode={collectionMode} anchorRect={collectionAnchor} />
      <ReportModal isOpen={showReport} onClose={() => setShowReport(false)} onSubmit={async () => { await new Promise(r => setTimeout(r, 1000)); toast.success("Reported"); }} articleId={article.id} />
      {showFullModal && <ArticleModal isOpen={showFullModal} onClose={() => setShowFullModal(false)} article={article} />}
      <ImageLightbox isOpen={showLightbox} onClose={() => setShowLightbox(false)} images={article.images || []} />
    </>
  );
});
NewsCard.displayName = 'NewsCard';
