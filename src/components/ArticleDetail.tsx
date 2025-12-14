import React, { useState } from 'react';
import { Article } from '@/types';
import { X, Clock, ExternalLink, Sparkles, Loader2, Bookmark, FolderPlus, Heart, Eye } from 'lucide-react';
import { formatDate } from '@/utils/formatters';
import { Avatar } from './shared/Avatar';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useToast } from '@/hooks/useToast';
import { AddToCollectionModal } from './AddToCollectionModal';
import { ShareMenu } from './shared/ShareMenu';
import { aiService } from '@/services/aiService';
import { RichTextRenderer } from './RichTextRenderer';
import { EmbeddedMedia } from './embeds/EmbeddedMedia';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface ArticleDetailProps {
  article: Article;
  onClose?: () => void;
  isModal?: boolean;
}

export const ArticleDetail: React.FC<ArticleDetailProps> = ({ article, onClose, isModal = false }) => {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [collectionMode, setCollectionMode] = useState<'public' | 'private'>('public');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const { withAuth } = useRequireAuth();
  const toast = useToast();

  const handleGenerateSummary = async () => {
    setIsAiLoading(true);
    try {
        const summary = await aiService.generateTakeaways(article.content || article.excerpt);
        setAiSummary(summary);
    } catch (e) {
        toast.error("Failed to generate summary");
    } finally {
        setIsAiLoading(false);
    }
  };

  const handleBookmark = () => {
      toggleBookmark(article.id);
      if (!isBookmarked(article.id)) {
          toast.success("Saved to bookmarks");
      } else {
          toast.info("Removed from bookmarks");
      }
  };

  const handleAddToCollection = (mode: 'public' | 'private') => {
      setCollectionMode(mode);
      setIsCollectionModalOpen(true);
  };

  return (
    <div className={`bg-white dark:bg-slate-950 min-h-full flex flex-col ${isModal ? '' : 'pt-20'}`}>
       {/* Header / Nav */}
       {isModal && (
           <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
               <div className="flex items-center gap-3">
                   <Avatar name={article.author.name} size="sm" />
                   <div className="text-sm font-bold text-slate-900 dark:text-white">{article.author.name}</div>
               </div>
               <div className="flex items-center gap-2">
                   <ShareMenu 
                       data={{ type: 'nugget', id: article.id, title: article.title, shareUrl: window.location.href }} 
                       className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                   />
                   <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                       <X size={20} className="text-slate-500" />
                   </button>
               </div>
           </div>
       )}

       <div className="flex-1 overflow-y-auto custom-scrollbar">
           {/* Hero Media */}
           {article.media && (
               <div className="w-full aspect-video bg-slate-100 dark:bg-slate-900">
                   <EmbeddedMedia media={article.media} />
               </div>
           )}
           
           <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
               {/* Title & Meta */}
               <div>
                   <div className="flex flex-wrap gap-2 mb-4">
                       {article.categories.map(cat => (
                           <span key={cat} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg uppercase tracking-wide">
                               {cat}
                           </span>
                       ))}
                   </div>
                   <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight mb-4">
                       {article.title}
                   </h1>
                   <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                       <div className="flex items-center gap-1.5">
                           <Clock size={14} />
                           <span>{article.readTime} min read</span>
                       </div>
                       <div>{formatDate(article.publishedAt)}</div>
                   </div>
               </div>

               {/* AI Summary Widget */}
               <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-900/30">
                   <div className="flex items-center justify-between mb-3">
                       <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-sm">
                           <Sparkles size={16} />
                           AI Key Takeaways
                       </div>
                       {!aiSummary && (
                           <button 
                               onClick={handleGenerateSummary}
                               disabled={isAiLoading}
                               className="px-3 py-1.5 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold shadow-sm hover:scale-105 transition-transform disabled:opacity-50"
                           >
                               {isAiLoading ? <Loader2 size={12} className="animate-spin" /> : 'Generate'}
                           </button>
                       )}
                   </div>
                   {isAiLoading ? (
                       <div className="space-y-2 animate-pulse">
                           <div className="h-2 bg-indigo-200 dark:bg-indigo-800 rounded w-3/4"></div>
                           <div className="h-2 bg-indigo-200 dark:bg-indigo-800 rounded w-1/2"></div>
                       </div>
                   ) : aiSummary ? (
                       <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                           <RichTextRenderer content={aiSummary} />
                       </div>
                   ) : (
                       <p className="text-xs text-slate-500 italic">Get a quick summary of this nugget with AI.</p>
                   )}
               </div>

               {/* Content */}
               <div className="prose prose-slate dark:prose-invert max-w-none">
                   <RichTextRenderer content={article.content} />
               </div>

               {/* Link Source */}
               {article.source_type === 'link' && (article.media?.url || (article as any).url) && (
                   <a 
                       href={article.media?.url || (article as any).url} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="flex items-center gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                   >
                       <ExternalLink size={18} className="group-hover:text-primary-500 transition-colors" />
                       <span className="text-sm font-bold truncate flex-1">Read original source</span>
                   </a>
               )}
               
               {/* Engagement Footer */}
               <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
                   <div className="flex gap-4">
                       <button onClick={withAuth(handleBookmark, 'guestBookmarks')} className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${isBookmarked(article.id) ? 'text-primary-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                           <Bookmark size={18} fill={isBookmarked(article.id) ? "currentColor" : "none"} />
                           {isBookmarked(article.id) ? 'Saved' : 'Save'}
                       </button>
                       <button onClick={withAuth(() => handleAddToCollection('public'))} className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                           <FolderPlus size={18} />
                           Add to Collection
                       </button>
                   </div>
                   
                   <div className="flex gap-4 text-slate-400 text-xs font-medium">
                       <span className="flex items-center gap-1"><Heart size={14} /> {article.engagement?.likes || 0}</span>
                       <span className="flex items-center gap-1"><Eye size={14} /> {article.engagement?.views || 0}</span>
                   </div>
               </div>
           </div>
       </div>

       <AddToCollectionModal 
           isOpen={isCollectionModalOpen} 
           onClose={() => setIsCollectionModalOpen(false)} 
           articleIds={[article.id]} 
           mode={collectionMode} 
       />
    </div>
  );
};


