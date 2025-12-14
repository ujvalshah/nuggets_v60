import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Article } from '@/types';
import { useToast } from './useToast';
import { useAuth } from './useAuth';
import { useRequireAuth } from './useRequireAuth';
import { useBookmarks } from './useBookmarks';
import { storageService } from '@/services/storageService';
import { queryClient } from '@/queryClient';
import { formatDate } from '@/utils/formatters';

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
  isSaved: boolean;
  isRead: boolean;
}

export interface NewsCardHandlers {
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onClick: () => void;
  onMediaClick: (e: React.MouseEvent) => void;
  onCategoryClick: (category: string) => void;
  onTagClick?: (tag: string) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onReport?: () => void;
  onAddToCollection?: () => void;
  onAuthorClick: (authorId: string) => void;
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
  onToggleBookmark?: (id: string) => void;
  onCategoryClick?: (category: string) => void;
  onTagClick?: (tag: string) => void;
  onClick?: (article: Article) => void;
}

export const useNewsCard = ({
  article,
  currentUserId,
  onToggleBookmark,
  onCategoryClick,
  onTagClick,
  onClick,
}: UseNewsCardProps) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAdmin } = useAuth();
  const { withAuth } = useRequireAuth();
  const { isBookmarked, toggleBookmark } = useBookmarks();

  // ────────────────────────────────────────
  // STATE
  // ────────────────────────────────────────
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
  const isOwner = currentUserId === article.author.id;
  const hasMedia = !!article.media || (article.images && article.images.length > 0) || !!article.video;
  const isLink = article.source_type === 'link';
  const isNoteOrIdea = article.source_type === 'note' || article.source_type === 'idea';
  const isTextNugget = !hasMedia && !isLink;
  const showContributor = article.addedBy && article.addedBy.userId !== article.author.id;
  const shouldShowTitle = article.title && !isNoteOrIdea;

  // ────────────────────────────────────────
  // DATA (formatted/derived)
  // ────────────────────────────────────────
  const data: NewsCardData = {
    id: article.id,
    title: article.title || '',
    excerpt: article.excerpt || article.content || '',
    content: article.content || '',
    formattedDate: formatDate(article.publishedAt, false),
    authorName: article.author.name,
    authorId: article.author.id,
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
    isSaved: isBookmarked(article.id),
    isRead: false, // TODO: Implement read tracking if needed
  };

  // ────────────────────────────────────────
  // HANDLERS
  // ────────────────────────────────────────
  const handleSave = () => {
    const bookmarkHandler = onToggleBookmark || toggleBookmark;
    const wasBookmarked = flags.isSaved;

    if (onToggleBookmark) {
      onToggleBookmark(article.id);
    } else {
      toggleBookmark(article.id);
    }

    if (!wasBookmarked) {
      toast.success('Saved to General Bookmarks', {
        actionLabel: 'Change',
        onAction: () => {
          setCollectionMode('private');
          if (bookmarkButtonRef.current) {
            setCollectionAnchor(bookmarkButtonRef.current.getBoundingClientRect());
          }
          setShowCollection(true);
        },
        duration: 4000,
      });
    } else {
      toast.info('Removed from Bookmarks', {
        actionLabel: 'Undo',
        onAction: () => {
          if (onToggleBookmark) {
            onToggleBookmark(article.id);
          } else {
            toggleBookmark(article.id);
          }
        },
        duration: 3000,
      });
      setShowCollection(false);
    }
  };

  const handleShare = () => {
    // Share logic can be added here if needed
    // For now, ShareMenu component handles this
  };

  const handleClick = () => {
    if (onClick) {
      onClick(article);
    }
  };

  const handleMediaClick = (e: React.MouseEvent) => {
    e?.stopPropagation();
    const linkUrl = article.media?.previewMetadata?.url || article.media?.url;
    if (article.source_type === 'link' && linkUrl) {
      window.open(linkUrl, '_blank', 'noopener,noreferrer');
    } else {
      if (article.media?.type === 'image' || (article.images && article.images.length > 0)) {
        setShowLightbox(true);
      } else {
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

  const handleEdit = () => {
    toast.info('Edit coming soon');
    setShowMenu(false);
  };

  const handleReport = () => {
    setShowReport(true);
    setShowMenu(false);
  };

  const handleAddToCollection = () => {
    setCollectionAnchor(bookmarkButtonRef.current?.getBoundingClientRect() || null);
    setCollectionMode('public');
    setShowCollection(true);
  };

  const handleAuthorClick = (authorId: string) => {
    navigate(`/profile/${authorId}`);
  };

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleToggleTagPopover = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTagPopover(!showTagPopover);
  };

  const handlers: NewsCardHandlers = {
    onLike: () => {
      // TODO: Implement like functionality
    },
    onSave: withAuth(handleSave, 'guestBookmarks'),
    onShare: handleShare,
    onClick: handleClick,
    onMediaClick: handleMediaClick,
    onCategoryClick: handleCategoryClick,
    onTagClick: onTagClick ? handleTagClick : undefined,
    onDelete: (isOwner || isAdmin) ? handleDelete : undefined,
    onEdit: (isOwner || isAdmin) ? handleEdit : undefined,
    onReport: withAuth(handleReport, 'guestReports'),
    onAddToCollection: withAuth(handleAddToCollection),
    onAuthorClick: handleAuthorClick,
    onToggleMenu: handleToggleMenu,
    onToggleTagPopover: handleToggleTagPopover,
    onReadMore: () => setShowFullModal(true),
  };

  return {
    logic: {
      data,
      flags,
      handlers,
    },
    // Modal state and refs (used by Controller for rendering modals)
    modals: {
      showCollection,
      showReport,
      showFullModal,
      showLightbox,
      showMenu,
      showTagPopover,
      setShowCollection,
      setShowReport,
      setShowFullModal,
      setShowLightbox,
      collectionMode,
      setCollectionMode,
      collectionAnchor,
      setCollectionAnchor,
    },
    refs: {
      menuRef,
      tagPopoverRef,
      bookmarkButtonRef,
    },
    article, // Original article for modals
    isOwner,
    isAdmin,
  };
};

// Helper type for hook return (extends strict interface)
export type UseNewsCardReturn = ReturnType<typeof useNewsCard>;
