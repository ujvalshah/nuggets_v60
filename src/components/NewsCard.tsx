import React, { forwardRef } from 'react';
import { Article } from '@/types';
import { useNewsCard } from '@/hooks/useNewsCard';
import { GridVariant } from './card/variants/GridVariant';
import { FeedVariant } from './card/variants/FeedVariant';
import { MasonryVariant } from './card/variants/MasonryVariant';
import { UtilityVariant } from './card/variants/UtilityVariant';
import { CollectionPopover } from './CollectionPopover';
import { ReportModal, ReportPayload } from './ReportModal';
import { ArticleModal } from './ArticleModal';
import { ImageLightbox } from './ImageLightbox';
import { useToast } from '@/hooks/useToast';
import { adminModerationService } from '@/admin/services/adminModerationService';
import { useAuth } from '@/hooks/useAuth';

interface NewsCardProps {
  article: Article;
  viewMode: 'grid' | 'feed' | 'masonry' | 'utility';
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onTagClick?: (tag: string) => void;
  onCategoryClick: (category: string) => void;
  onClick: (article: Article) => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
  currentUserId?: string;
}

export const NewsCard = forwardRef<HTMLDivElement, NewsCardProps>(
  (
    {
      article,
      viewMode,
      isBookmarked,
      onToggleBookmark,
      onCategoryClick,
      onClick,
      currentUserId,
      onTagClick,
    },
    ref
  ) => {
    const toast = useToast();
    const { currentUser } = useAuth();

    // Call the logic hook
    const hookResult = useNewsCard({
      article,
      currentUserId,
      onToggleBookmark,
      onCategoryClick,
      onTagClick,
      onClick,
    });

    const { logic, modals, refs, article: originalArticle, isOwner, isAdmin } = hookResult;

    // Switch on viewMode to render the appropriate variant
    let variant;
    switch (viewMode) {
      case 'grid':
        variant = (
          <GridVariant
            logic={logic}
            showTagPopover={modals.showTagPopover}
            showMenu={modals.showMenu}
            menuRef={refs.menuRef}
            tagPopoverRef={refs.tagPopoverRef}
            bookmarkButtonRef={refs.bookmarkButtonRef}
            isOwner={isOwner}
            isAdmin={isAdmin}
          />
        );
        break;
      case 'feed':
        variant = (
          <FeedVariant
            logic={logic}
            showTagPopover={modals.showTagPopover}
            showMenu={modals.showMenu}
            menuRef={refs.menuRef}
            tagPopoverRef={refs.tagPopoverRef}
            bookmarkButtonRef={refs.bookmarkButtonRef}
            isOwner={isOwner}
            isAdmin={isAdmin}
          />
        );
        break;
      case 'masonry':
        variant = (
          <MasonryVariant
            logic={logic}
            showTagPopover={modals.showTagPopover}
            showMenu={modals.showMenu}
            menuRef={refs.menuRef}
            tagPopoverRef={refs.tagPopoverRef}
            bookmarkButtonRef={refs.bookmarkButtonRef}
            isOwner={isOwner}
            isAdmin={isAdmin}
          />
        );
        break;
      case 'utility':
        variant = (
          <UtilityVariant
            logic={logic}
            showTagPopover={modals.showTagPopover}
            showMenu={modals.showMenu}
            menuRef={refs.menuRef}
            tagPopoverRef={refs.tagPopoverRef}
            bookmarkButtonRef={refs.bookmarkButtonRef}
            isOwner={isOwner}
            isAdmin={isAdmin}
          />
        );
        break;
      default:
        variant = (
          <GridVariant
            logic={logic}
            showTagPopover={modals.showTagPopover}
            showMenu={modals.showMenu}
            menuRef={refs.menuRef}
            tagPopoverRef={refs.tagPopoverRef}
            bookmarkButtonRef={refs.bookmarkButtonRef}
            isOwner={isOwner}
            isAdmin={isAdmin}
          />
        );
    }

    return (
      <>
        <div ref={ref}>{variant}</div>

        {/* Modals rendered by Controller */}
        <CollectionPopover
          isOpen={modals.showCollection}
          onClose={() => modals.setShowCollection(false)}
          articleId={originalArticle.id}
          mode={modals.collectionMode}
          anchorRect={modals.collectionAnchor}
        />
        <ReportModal
          isOpen={modals.showReport}
          onClose={() => modals.setShowReport(false)}
          onSubmit={async (payload: ReportPayload) => {
            try {
              await adminModerationService.submitReport(
                payload.articleId,
                'nugget',
                payload.reason,
                payload.comment,
                currentUser ? {
                  id: currentUser.id,
                  name: currentUser.name
                } : undefined,
                originalArticle.author ? {
                  id: originalArticle.author.id,
                  name: originalArticle.author.name
                } : undefined
              );
              toast.success('Report submitted successfully');
            } catch (error) {
              console.error('Failed to submit report:', error);
              toast.error('Failed to submit report. Please try again.');
              throw error; // Re-throw so ReportModal can handle it
            }
          }}
          articleId={originalArticle.id}
        />
        {modals.showFullModal && (
          <ArticleModal
            isOpen={modals.showFullModal}
            onClose={() => modals.setShowFullModal(false)}
            article={originalArticle}
          />
        )}
        <ImageLightbox
          isOpen={modals.showLightbox}
          onClose={() => modals.setShowLightbox(false)}
          images={originalArticle.images || []}
        />
      </>
    );
  }
);

NewsCard.displayName = 'NewsCard';
