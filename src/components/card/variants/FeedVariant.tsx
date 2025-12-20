import React from 'react';
import { NewsCardLogic } from '@/hooks/useNewsCard';
import { CardMedia } from '../atoms/CardMedia';
import { CardTitle } from '../atoms/CardTitle';
import { CardMeta } from '../atoms/CardMeta';
import { CardTags } from '../atoms/CardTags';
import { CardActions } from '../atoms/CardActions';
import { CardContent } from '../atoms/CardContent';
import { CardContributor } from '../atoms/CardContributor';
import { CardBadge } from '../atoms/CardBadge';

interface FeedVariantProps {
  logic: NewsCardLogic;
  showTagPopover: boolean;
  showMenu: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  tagPopoverRef: React.RefObject<HTMLDivElement | null>;
  isOwner: boolean;
  isAdmin: boolean;
  isPreview?: boolean;
}

export const FeedVariant: React.FC<FeedVariantProps> = ({
  logic,
  showTagPopover,
  showMenu,
  menuRef,
  tagPopoverRef,
  isOwner,
  isAdmin,
  isPreview = false,
}) => {
  const { data, handlers } = logic;

  return (
    <div
      className="group relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] transition-all duration-150 w-full p-6 gap-4 hover:-translate-y-0.5"
    >
      {/* Card Body - Clickable area for opening drawer */}
      <div 
        className="flex flex-col flex-1 min-w-0 gap-4 cursor-pointer"
        onClick={handlers.onClick}
      >
        {/* 1. Media first (for video-first nuggets) */}
        {data.hasMedia && (
          <CardMedia
            media={data.media}
            images={data.images}
            visibility={data.visibility}
            onMediaClick={handlers.onMediaClick}
            className="rounded-lg shrink-0"
            articleTitle={data.title}
          />
        )}

        {/* 2. Title - Dominant visual anchor */}
        {data.shouldShowTitle && <CardTitle title={data.title} variant="feed" />}

        {/* 3. Optional excerpt/body */}
        <CardContent
          excerpt={data.excerpt}
          content={data.content}
          isTextNugget={data.isTextNugget}
          variant="feed"
          allowExpansion={true}
        />

        {/* 4. Tags - Visually demoted (1-2 max, muted pills) */}
        {data.categories && data.categories.length > 0 && (
          <CardTags
            categories={data.categories}
            onCategoryClick={handlers.onCategoryClick}
            showTagPopover={showTagPopover}
            onToggleTagPopover={handlers.onToggleTagPopover}
            tagPopoverRef={tagPopoverRef}
            variant="feed"
          />
        )}
      </div>

      {/* Footer - Actions only, must NOT open drawer */}
      {/* Finance-grade: Reduced visual weight, increased hit areas, cohesive grouping */}
      <div 
        className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <CardMeta
          authorName={data.authorName}
          authorId={data.authorId}
          formattedDate={data.formattedDate}
          authorAvatarUrl={data.authorAvatarUrl}
          onAuthorClick={handlers.onAuthorClick}
        />

        <CardActions
          articleId={data.id}
          articleTitle={data.title}
          articleExcerpt={data.excerpt}
          authorName={data.authorName}
          isOwner={isOwner}
          isAdmin={isAdmin}
          visibility={data.visibility}
          onAddToCollection={handlers.onAddToCollection}
          onReport={handlers.onReport}
          onEdit={handlers.onEdit}
          onDelete={handlers.onDelete}
          onToggleVisibility={handlers.onToggleVisibility}
          showMenu={showMenu}
          onToggleMenu={handlers.onToggleMenu}
          menuRef={menuRef}
          isPreview={isPreview}
          variant="feed"
        />
      </div>

      {data.showContributor && data.contributorName && (
        <CardContributor contributorName={data.contributorName} />
      )}
    </div>
  );
};

