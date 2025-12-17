import React from 'react';
import { Check } from 'lucide-react';
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
  isOwner: boolean;
  isAdmin: boolean;
  isPreview?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const GridVariant: React.FC<GridVariantProps> = ({
  logic,
  showTagPopover,
  showMenu,
  menuRef,
  tagPopoverRef,
  isOwner,
  isAdmin,
  isPreview = false,
  selectionMode = false,
  isSelected = false,
  onSelect,
}) => {
  const { data, handlers } = logic;

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectionMode && onSelect) {
      e.stopPropagation();
      onSelect();
    } else if (handlers.onClick) {
      handlers.onClick();
    }
  };

  return (
    <div
      className={`group relative flex flex-col bg-white dark:bg-slate-900 border rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 h-full p-4 gap-3 ${
        selectionMode 
          ? isSelected 
            ? 'border-primary-500 ring-1 ring-primary-500' 
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Selection Checkbox Overlay */}
      {selectionMode && (
        <div 
          className="absolute top-4 right-4 z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className={`
              w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 shadow-sm cursor-pointer
              ${isSelected 
                ? 'bg-primary-500 border-primary-500 text-white' 
                : 'bg-white/80 dark:bg-slate-900/80 border-slate-300 dark:border-slate-600 hover:border-primary-400'
              }
            `}
            onClick={onSelect}
          >
            {isSelected && <Check size={14} strokeWidth={3} />}
          </div>
        </div>
      )}

      {/* Card Body - Clickable area for opening drawer */}
      <div 
        className={`flex flex-col flex-1 min-w-0 ${selectionMode ? 'cursor-pointer' : 'cursor-pointer'}`}
        onClick={handleCardClick}
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
            allowExpansion={true}
          />
        </div>
      </div>

      {/* Footer - Actions only, must NOT open drawer */}
      <div 
        className={`mt-auto pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 ${selectionMode ? 'opacity-50' : ''}`}
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

