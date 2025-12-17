import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Article } from '@/types';
import { useToast } from './useToast';
import { useAuth } from './useAuth';
import { useRequireAuth } from './useRequireAuth';
import { storageService } from '@/services/storageService';
import { queryClient } from '@/queryClient';
import { sanitizeArticle, hasValidAuthor, logError } from '@/utils/errorHandler';
// formatDate removed - using relative time formatting in CardMeta instead

// ────────────────────────────────────────
// STRICT TYPE CONTRACT (MANDATORY)
// ────────────────────────────────────────

export interface NewsCardData {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  formattedDate: string;
  authorName: string;
  authorId: string;
  authorAvatarUrl?: string; // Phase 3: Avatar support
  categories: string[];
  tags: string[];
  hasMedia: boolean;
  isLink: boolean;
  isNoteOrIdea: boolean;
  isTextNugget: boolean;
  sourceType: string | undefined;
  visibility: 'public' | 'private' | undefined;
  showContributor: boolean;
  contributorName?: string;
  shouldShowTitle: boolean;
  media: Article['media'];
  images: string[] | undefined;
  video: string | undefined;
}

export interface NewsCardFlags {
  isLiked: boolean;
  isRead: boolean;
}

export interface NewsCardHandlers {
  onLike: (() => void) | undefined;
  onShare: (() => void) | undefined;
  onClick: (() => void) | undefined;
  onMediaClick: (e: React.MouseEvent, imageIndex?: number) => void;
  onCategoryClick: (category: string) => void;
  onTagClick?: (tag: string) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onReport?: () => void;
  onAddToCollection?: () => void;
  onToggleVisibility?: () => void;
  onAuthorClick: ((authorId: string) => void) | undefined;
  onToggleMenu: (e: React.MouseEvent) => void;
  onToggleTagPopover: (e: React.MouseEvent) => void;
  onReadMore: () => void;
}

export interface NewsCardLogic {
  data: NewsCardData;
  flags: NewsCardFlags;
  handlers: NewsCardHandlers;
}

interface UseNewsCardProps {
  article: Article;
  currentUserId?: string;
  onCategoryClick?: (category: string) => void;
  onTagClick?: (tag: string) => void;
  onClick?: (article: Article) => void;
  isPreview?: boolean;
}

export const useNewsCard = ({
  article,
  currentUserId,
  onCategoryClick,
  onTagClick,
  onClick,
  isPreview = false,
}: UseNewsCardProps) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAdmin = false } = useAuth(); // Phase 3: Default to false to ensure boolean type
  const { withAuth } = useRequireAuth();

  // ────────────────────────────────────────
  // STATE
  // ────────────────────────────────────────
  const [showCollection, setShowCollection] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showTagPopover, setShowTagPopover] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);
  const [collectionMode, setCollectionMode] = useState<'public' | 'private'>('public');
  const [collectionAnchor, setCollectionAnchor] = useState<DOMRect | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const tagPopoverRef = useRef<HTMLDivElement>(null);

  // ────────────────────────────────────────
  // CLICK OUTSIDE HANDLER
  // ────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (tagPopoverRef.current && !tagPopoverRef.current.contains(event.target as Node)) {
        setShowTagPopover(false);
      }
    };
    if (showMenu || showTagPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu, showTagPopover]);

  // ────────────────────────────────────────
  // COMPUTED VALUES / DERIVED DATA
  // ────────────────────────────────────────
  // Sanitize article data to ensure all required fields exist
  const sanitizedArticle = sanitizeArticle(article);
  if (!sanitizedArticle) {
    logError('useNewsCard', new Error('Invalid article data'), { article });
    throw new Error('Invalid article: article is null or undefined');
  }
  
  // Ensure author exists
  if (!hasValidAuthor(sanitizedArticle)) {
    logError('useNewsCard', new Error('Article missing author data'), { article: sanitizedArticle });
    // Create fallback author
    sanitizedArticle.author = {
      id: sanitizedArticle.author?.id || '',
      name: sanitizedArticle.author?.name || 'Unknown',
      avatar_url: sanitizedArticle.author?.avatar_url,
    };
  }
  
  // Use sanitized article for all operations
  article = sanitizedArticle;

  const isOwner = currentUserId === article.author.id;
  const hasMedia = !!article.media || (article.images && article.images.length > 0) || !!article.video;
  const isLink = article.source_type === 'link';
  const isNoteOrIdea = article.source_type === 'note' || article.source_type === 'idea';
  const isTextNugget = !hasMedia && !isLink;
  const showContributor = !!(article.addedBy && article.addedBy.userId !== article.author.id); // Phase 3: Ensure boolean type

  // ────────────────────────────────────────
  // TITLE RESOLUTION (Priority: User title > Metadata title > None)
  // ────────────────────────────────────────
  /**
   * Resolves card title using priority order:
   * 1. User-provided title (article.title) - always wins if present and non-empty
   * 2. Metadata title (OG/video/document title from previewMetadata)
   * 3. Empty string (no title)
   * 
   * This enables automatic title display for rich-link media (YouTube, articles, Google Drive)
   * when metadata is available, without overwriting user-entered titles.
   * 
   * Note: Empty strings are treated as "no user title" to allow metadata fallback.
   */
  const resolveCardTitle = (): string => {
    // Priority 1: User-provided title (always wins if present and non-empty)
    const userTitle = article.title?.trim();
    if (userTitle) {
      return userTitle;
    }
    
    // Priority 2: Metadata title (from OG tags, video metadata, document metadata)
    const metadataTitle = article.media?.previewMetadata?.title?.trim();
    if (metadataTitle) {
      return metadataTitle;
    }
    
    // Priority 3: No title
    return '';
  };

  const resolvedTitle = resolveCardTitle();
  const shouldShowTitle = !!resolvedTitle && !isNoteOrIdea;

  // ────────────────────────────────────────
  // DATA (formatted/derived)
  // ────────────────────────────────────────
  const data: NewsCardData = {
    id: article.id,
    title: resolvedTitle,
    excerpt: article.excerpt || article.content || '',
    content: article.content || '',
    formattedDate: article.publishedAt, // Phase 3: Pass raw ISO string for relative time formatting
    authorName: article.author.name,
    authorId: article.author.id,
    authorAvatarUrl: article.author.avatar_url, // Phase 3: Include avatar URL
    categories: article.categories || [],
    tags: article.tags || [],
    hasMedia,
    isLink,
    isNoteOrIdea,
    isTextNugget,
    sourceType: article.source_type,
    visibility: article.visibility,
    showContributor,
    contributorName: article.addedBy?.name,
    shouldShowTitle,
    media: article.media,
    images: article.images,
    video: article.video,
  };

  // ────────────────────────────────────────
  // FLAGS
  // ────────────────────────────────────────
  const flags: NewsCardFlags = {
    isLiked: false, // TODO: Implement like functionality if needed
    isRead: false, // TODO: Implement read tracking if needed
  };

  // ────────────────────────────────────────
  // HANDLERS
  // ────────────────────────────────────────

  const handleShare = () => {
    // Share logic can be added here if needed
    // For now, ShareMenu component handles this
  };

  const handleClick = () => {
    // If parent provides onClick handler, let it handle opening the modal
    // Otherwise, open the internal modal
    if (onClick) {
      onClick(article);
    } else {
      // Only open internal modal if no parent handler is provided
      setShowFullModal(true);
    }
  };

  const handleMediaClick = (e: React.MouseEvent, imageIndex?: number) => {
    e?.stopPropagation();
    
    // If clicking on media element, go to embedded URL or open lightbox
    const linkUrl = article.media?.previewMetadata?.url || article.media?.url;
    if (article.source_type === 'link' && linkUrl) {
      // Open URL in new tab
      window.open(linkUrl, '_blank', 'noopener,noreferrer');
    } else {
      // Open images in lightbox with article detail on the right
      if (article.media?.type === 'image' || (article.images && article.images.length > 0)) {
        // Store image index for initial display if provided
        if (imageIndex !== undefined) {
          setLightboxInitialIndex(imageIndex);
        }
        setShowLightbox(true);
      } else {
        // For other media types, open full modal
        setShowFullModal(true);
      }
    }
  };

  const handleCategoryClick = (category: string) => {
    if (onCategoryClick) {
      onCategoryClick(category);
    }
  };

  const handleTagClick = (tag: string) => {
    if (onTagClick) {
      onTagClick(tag);
    }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    if (window.confirm('Delete this nugget permanently?')) {
      await storageService.deleteArticle(article.id);
      await queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('Nugget deleted');
    }
  };

  const [showEditModal, setShowEditModal] = useState(false);

  const handleEdit = () => {
    setShowEditModal(true);
    setShowMenu(false);
  };

  const handleOpenDetails = () => {
    // Open Article Details drawer (same as clicking the card)
    if (onClick) {
      onClick(article);
    } else {
      setShowFullModal(true);
    }
  };

  const handleReport = () => {
    setShowReport(true);
    setShowMenu(false);
  };

  const handleAddToCollection = () => {
    setCollectionAnchor(null);
    setCollectionMode('public');
    setShowCollection(true);
  };

  const handleAuthorClick = (authorId: string) => {
    navigate(`/profile/${authorId}`);
  };

  const handleToggleVisibility = async () => {
    if (isPreview) return;
    
    const newVisibility: 'public' | 'private' = article.visibility === 'private' ? 'public' : 'private';
    
    // Snapshot previous state for rollback
    const previousArticle = { ...article };
    
    // Optimistic update: update local article immediately
    const optimisticArticle = { ...article, visibility: newVisibility };
    
    // Update query cache optimistically
    queryClient.setQueryData(['articles'], (oldData: any) => {
      if (!oldData) return oldData;
      
      // Handle paginated response
      if (oldData.data && Array.isArray(oldData.data)) {
        return {
          ...oldData,
          data: oldData.data.map((a: Article) => 
            a.id === article.id ? optimisticArticle : a
          )
        };
      }
      
      // Handle array response
      if (Array.isArray(oldData)) {
        return oldData.map((a: Article) => 
          a.id === article.id ? optimisticArticle : a
        );
      }
      
      return oldData;
    });
    
    try {
      const updatedArticle = await storageService.updateArticle(article.id, { visibility: newVisibility });
      
      if (!updatedArticle) {
        throw new Error('Failed to update visibility');
      }
      
      // Update cache with server response
      queryClient.setQueryData(['articles'], (oldData: any) => {
        if (!oldData) return oldData;
        
        if (oldData.data && Array.isArray(oldData.data)) {
          return {
            ...oldData,
            data: oldData.data.map((a: Article) => 
              a.id === article.id ? updatedArticle : a
            )
          };
        }
        
        if (Array.isArray(oldData)) {
          return oldData.map((a: Article) => 
            a.id === article.id ? updatedArticle : a
          );
        }
        
        return oldData;
      });
      
      // Invalidate to ensure consistency across all queries
      await queryClient.invalidateQueries({ queryKey: ['articles'] });
      
      toast.success(`Nugget is now ${newVisibility}`);
      setShowMenu(false);
    } catch (error: any) {
      // Rollback on error
      queryClient.setQueryData(['articles'], (oldData: any) => {
        if (!oldData) return oldData;
        
        if (oldData.data && Array.isArray(oldData.data)) {
          return {
            ...oldData,
            data: oldData.data.map((a: Article) => 
              a.id === article.id ? previousArticle : a
            )
          };
        }
        
        if (Array.isArray(oldData)) {
          return oldData.map((a: Article) => 
            a.id === article.id ? previousArticle : a
          );
        }
        
        return oldData;
      });
      
      const errorMessage = error?.response?.status === 403
        ? 'You can only edit your own nuggets'
        : error?.response?.status === 404
        ? 'Nugget not found'
        : 'Failed to update visibility';
      
      toast.error(errorMessage);
    }
  };

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleToggleTagPopover = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTagPopover(!showTagPopover);
  };

  // When in preview mode, disable all mutation handlers to prevent API calls
  const handlers: NewsCardHandlers = isPreview
    ? {
        onLike: undefined,
        onShare: undefined,
        onClick: undefined,
        onMediaClick: (e: React.MouseEvent) => handleMediaClick(e), // Allow media click for preview (opens URL)
        onCategoryClick: handleCategoryClick, // Allow category click (no-op in preview)
        onTagClick: onTagClick ? handleTagClick : undefined,
        onDelete: undefined,
        onEdit: undefined,
        onReport: undefined,
        onAddToCollection: undefined,
        onToggleVisibility: undefined,
        onAuthorClick: undefined,
        onToggleMenu: handleToggleMenu, // Allow menu toggle (UI only)
        onToggleTagPopover: handleToggleTagPopover, // Allow tag popover (UI only)
        onReadMore: () => setShowFullModal(true), // Allow read more (modal only)
      }
    : {
        onLike: () => {
          // TODO: Implement like functionality
        },
        onShare: handleShare,
        onClick: handleClick,
        onMediaClick: handleMediaClick,
        onCategoryClick: handleCategoryClick,
        onTagClick: onTagClick ? handleTagClick : undefined,
        onDelete: (isOwner || isAdmin) ? handleDelete : undefined,
        onEdit: (isOwner || isAdmin) ? handleEdit : undefined,
        onReport: withAuth(handleReport, 'guestReports'),
        onAddToCollection: withAuth(handleAddToCollection),
        onToggleVisibility: isOwner ? handleToggleVisibility : undefined,
        onAuthorClick: handleAuthorClick,
        onToggleMenu: handleToggleMenu,
        onToggleTagPopover: handleToggleTagPopover,
        onReadMore: () => setShowFullModal(true),
      };

  // Add onOpenDetails to handlers
  const handlersWithDetails: NewsCardHandlers & { onOpenDetails?: () => void } = {
    ...handlers,
    onOpenDetails: handleOpenDetails,
  };

  return {
    logic: {
      data,
      flags,
      handlers: handlersWithDetails,
    },
    // Modal state and refs (used by Controller for rendering modals)
    modals: {
      showCollection,
      showReport,
      showFullModal,
      showLightbox,
      lightboxInitialIndex,
      showMenu,
      showTagPopover,
      showEditModal,
      setShowCollection,
      setShowReport,
      setShowFullModal,
      setShowLightbox,
      setLightboxInitialIndex,
      setShowEditModal,
      collectionMode,
      setCollectionMode,
      collectionAnchor,
      setCollectionAnchor,
    },
    refs: {
      menuRef,
      tagPopoverRef,
    },
    article, // Original article for modals
    isOwner,
    isAdmin,
  };
};

// Helper type for hook return (extends strict interface)
export type UseNewsCardReturn = ReturnType<typeof useNewsCard>;

