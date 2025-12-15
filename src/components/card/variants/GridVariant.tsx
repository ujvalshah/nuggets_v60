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

interface GridVariantProps {
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

export const GridVariant: React.FC<GridVariantProps> = ({
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
      className="group relative flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 h-full p-4 gap-3"
      onClick={handlers.onClick}
    >
      {data.hasMedia && (
        <div className="relative">
          <CardMedia
            media={data.media}
            images={data.images}
            visibility={data.visibility}
            onMediaClick={handlers.onMediaClick}
            className="aspect-[4/3]"
            articleTitle={data.title}
          />
          {/* Source Badge Overlay - Top-Left Corner */}
          {!data.isTextNugget && data.sourceType === 'link' && (
            <CardBadge
              isTextNugget={data.isTextNugget}
              sourceType={data.sourceType}
              media={data.media}
              variant="overlay"
              size="sm"
              className="absolute top-3 left-3 z-20"
            />
          )}
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0">
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
          variant="grid"
        />

        <div className="mt-auto pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
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
            onSave={handlers.onSave}
            onAddToCollection={handlers.onAddToCollection}
            onReport={handlers.onReport}
            onEdit={handlers.onEdit}
            onDelete={handlers.onDelete}
            showMenu={showMenu}
            onToggleMenu={handlers.onToggleMenu}
            menuRef={menuRef}
            bookmarkButtonRef={bookmarkButtonRef}
            isPreview={isPreview}
          />
        </div>
      </div>

      {data.showContributor && data.contributorName && (
        <CardContributor contributorName={data.contributorName} />
      )}
    </div>
  );
};

