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
  menuRef: React.RefObject<HTMLDivElement>;
  tagPopoverRef: React.RefObject<HTMLDivElement>;
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
      className="group relative flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 w-full p-5 gap-4"
    >
      {/* Card Body - Clickable area for opening drawer */}
      <div 
        className="flex flex-col flex-1 min-w-0 gap-4 cursor-pointer"
        onClick={handlers.onClick}
      >
        {/* 1. Tags on top - matching UtilityVariant hierarchy */}
        <CardTags
          categories={data.categories}
          onCategoryClick={handlers.onCategoryClick}
          showTagPopover={showTagPopover}
          onToggleTagPopover={handlers.onToggleTagPopover}
          tagPopoverRef={tagPopoverRef}
        />

        {/* 2. Title */}
        {data.shouldShowTitle && <CardTitle title={data.title} />}

        {/* 3. Badge */}
        <CardBadge 
          isTextNugget={data.isTextNugget} 
          sourceType={data.sourceType}
          media={data.media}
        />

        {/* 4. Body/Content - flex-1 to take available space, pushing media to bottom */}
        <div className="flex flex-col flex-1 min-w-0 gap-4">
          <CardContent
            excerpt={data.excerpt}
            content={data.content}
            isTextNugget={data.isTextNugget}
            variant="feed"
            allowExpansion={true}
          />

          {/* 5. Media anchored to bottom for uniformity across cards */}
          {data.hasMedia && (
            <CardMedia
              media={data.media}
              images={data.images}
              visibility={data.visibility}
              onMediaClick={handlers.onMediaClick}
              className="mt-auto rounded-lg shrink-0"
              articleTitle={data.title}
            />
          )}
        </div>
      </div>

      {/* Footer - Actions only, must NOT open drawer */}
      <div 
        className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0"
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
        />
      </div>

      {data.showContributor && data.contributorName && (
        <CardContributor contributorName={data.contributorName} />
      )}
    </div>
  );
};

