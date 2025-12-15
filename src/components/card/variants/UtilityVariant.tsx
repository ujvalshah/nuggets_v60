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

interface UtilityVariantProps {
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

// Utility variant: Tags → Title → Body → Media (anchored to bottom)
export const UtilityVariant: React.FC<UtilityVariantProps> = ({
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

  // Generate descriptive aria-label for the card
  const ariaLabelParts: string[] = [];
  if (data.title) {
    ariaLabelParts.push(data.title);
  }
  if (data.categories.length > 0) {
    ariaLabelParts.push(`Tagged with ${data.categories.join(', ')}`);
  }
  if (data.authorName) {
    ariaLabelParts.push(`by ${data.authorName}`);
  }
  if (data.excerpt) {
    const excerptPreview = data.excerpt.length > 100 
      ? `${data.excerpt.substring(0, 100)}...` 
      : data.excerpt;
    ariaLabelParts.push(excerptPreview);
  }
  const ariaLabel = ariaLabelParts.length > 0 
    ? ariaLabelParts.join('. ') + '. Click to view full article.'
    : 'Article card. Click to view details.';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow keyboard navigation within card (buttons, links)
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('button') || target.closest('a')) {
      return; // Let buttons and links handle their own keyboard events
    }

    // Enter or Space activates the card
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlers.onClick?.();
    }
  };

  return (
    <article
      role="article"
      aria-label={ariaLabel}
      tabIndex={0}
      className="group relative flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 w-full p-5 gap-4 h-full min-h-[400px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      onClick={handlers.onClick}
      onKeyDown={handleKeyDown}
    >
      {/* 1. Header Zone: Tags (Left) + Source Badge (Right) */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <CardTags
            categories={data.categories}
            onCategoryClick={handlers.onCategoryClick}
            showTagPopover={showTagPopover}
            onToggleTagPopover={handlers.onToggleTagPopover}
            tagPopoverRef={tagPopoverRef}
          />
        </div>
        {/* Source Badge - Right Side of Header */}
        {!data.isTextNugget && data.sourceType === 'link' && (
          <CardBadge
            isTextNugget={data.isTextNugget}
            sourceType={data.sourceType}
            media={data.media}
            variant="inline"
            size="sm"
          />
        )}
      </div>

      {/* 2. Title */}
      {data.shouldShowTitle && <CardTitle title={data.title} />}

      {/* 3. Body/Content - flex-1 to take available space, pushing media to bottom */}
      <div className="flex flex-col flex-1 min-w-0 gap-4">
        <CardContent
          excerpt={data.excerpt}
          content={data.content}
          isTextNugget={data.isTextNugget}
          variant="utility"
          allowExpansion={true}
        />
        
        {/* 4. Media anchored to bottom for uniformity across cards */}
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

      {/* Footer */}
      <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
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

      {data.showContributor && data.contributorName && (
        <CardContributor contributorName={data.contributorName} />
      )}
    </article>
  );
};

