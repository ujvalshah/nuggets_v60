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

interface MasonryVariantProps {
  logic: NewsCardLogic;
  showTagPopover: boolean;
  showMenu: boolean;
  menuRef: React.RefObject<HTMLDivElement>;
  tagPopoverRef: React.RefObject<HTMLDivElement>;
  bookmarkButtonRef: React.RefObject<HTMLButtonElement>;
  isOwner: boolean;
  isAdmin: boolean;
  isPreview?: boolean;
}

export const MasonryVariant: React.FC<MasonryVariantProps> = ({
  logic,
  showTagPopover,
  showMenu,
  menuRef,
  tagPopoverRef,
  bookmarkButtonRef,
  isOwner,
  isAdmin,
  isPreview = false,
}) => {
  const { data, flags, handlers } = logic;

  return (
    <div
      className="group relative flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 w-full p-4 break-inside-avoid mb-6"
      style={{ height: 'auto' }}
    >
      {/* Card Body - Clickable area for opening drawer */}
      <div 
        className="flex flex-col flex-1 min-w-0 cursor-pointer"
        onClick={handlers.onClick}
      >
        {data.hasMedia && (
          <CardMedia
            media={data.media}
            images={data.images}
            visibility={data.visibility}
            onMediaClick={handlers.onMediaClick}
            className="w-full"
            articleTitle={data.title}
          />
        )}

        <div className="flex flex-col flex-1 min-w-0">
          <CardBadge 
            isTextNugget={data.isTextNugget} 
            sourceType={data.sourceType}
            media={data.media}
          />

          <CardTags
            categories={data.categories}
            onCategoryClick={handlers.onCategoryClick}
            showTagPopover={showTagPopover}
            onToggleTagPopover={handlers.onToggleTagPopover}
            tagPopoverRef={tagPopoverRef}
          />

          {data.shouldShowTitle && <CardTitle title={data.title} />}

          <CardContent
            excerpt={data.excerpt}
            content={data.content}
            isTextNugget={data.isTextNugget}
            variant="masonry"
            allowExpansion={true}
          />
        </div>
      </div>

      {/* Footer - Actions only, must NOT open drawer */}
      <div 
        className="mt-auto pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0"
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
            isSaved={flags.isSaved}
            isOwner={isOwner}
            isAdmin={isAdmin}
            visibility={data.visibility}
            onSave={handlers.onSave}
            onAddToCollection={handlers.onAddToCollection}
            onReport={handlers.onReport}
            onEdit={handlers.onEdit}
            onDelete={handlers.onDelete}
            onToggleVisibility={handlers.onToggleVisibility}
            showMenu={showMenu}
            onToggleMenu={handlers.onToggleMenu}
            menuRef={menuRef}
            bookmarkButtonRef={bookmarkButtonRef}
            isPreview={isPreview}
          />
      </div>

      {data.showContributor && data.contributorName && (
        <CardContributor contributorName={data.contributorName} />
      )}
    </div>
  );
};

