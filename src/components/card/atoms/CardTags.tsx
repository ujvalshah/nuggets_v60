import React from 'react';
import { Tooltip } from '@/components/UI/Tooltip';
import { twMerge } from 'tailwind-merge';

interface TagPillProps {
  label: string;
  onClick?: (e: React.MouseEvent) => void;
  variant?: 'default' | 'grid' | 'feed';
}

// Format category label: lowercase and add hashtag prefix
const formatCategoryLabel = (category: string): string => {
  return `#${category.toLowerCase()}`;
};

const TagPill: React.FC<TagPillProps> = ({ label, onClick, variant = 'default' }) => {
  const displayLabel = formatCategoryLabel(label);
  
  const pill = (
    <span
      onClick={onClick}
      className={twMerge(
        'inline-flex items-center rounded-full px-2 py-0.5 font-medium transition-colors',
        variant === 'grid'
          ? // Grid variant: slate styling
            'text-[11px] bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          : variant === 'feed'
          ? // Feed variant: Muted, demoted, fully rounded (border-radius: 9999px)
            'text-[11px] bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
          : // Default variant: amber styling
            'text-[10px] border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
        onClick && (
          variant === 'grid'
            ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700'
            : variant === 'feed'
            ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600'
            : 'cursor-pointer hover:border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:shadow-sm'
        )
      )}
    >
      {displayLabel}
    </span>
  );
  return onClick ? <Tooltip content="Click to filter">{pill}</Tooltip> : pill;
};

interface CardTagsProps {
  categories: string[];
  onCategoryClick: (category: string) => void;
  showTagPopover?: boolean;
  onToggleTagPopover?: (e: React.MouseEvent) => void;
  tagPopoverRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  variant?: 'default' | 'grid' | 'feed';
}

export const CardTags: React.FC<CardTagsProps> = ({
  categories,
  onCategoryClick,
  showTagPopover,
  onToggleTagPopover,
  tagPopoverRef,
  className,
  variant = 'default',
}) => {
  if (!categories || categories.length === 0) return null;

  const visibleCategories = categories.slice(0, 2);
  const remainingCount = categories.length - 2;

  // Grid variant: no background container, just flex layout
  // Feed variant: no background container, minimal spacing
  // Default variant: amber background container
  const containerClasses = variant === 'grid' || variant === 'feed'
    ? 'flex flex-wrap items-center gap-1.5 relative'
    : 'flex flex-wrap items-center gap-1.5 mb-2 relative bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2 py-1.5';

  return (
    <div
      className={twMerge(containerClasses, className)}
    >
      {visibleCategories.map((cat) => (
        <TagPill
          key={cat}
          label={cat}
          variant={variant}
          onClick={(e) => {
            e.stopPropagation();
            onCategoryClick(cat);
          }}
        />
      ))}
      {remainingCount > 0 && (
        <div className="relative" ref={tagPopoverRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleTagPopover) {
                onToggleTagPopover(e);
              }
            }}
            className={twMerge(
              'inline-flex items-center rounded-full px-2 py-0.5 font-bold transition-colors',
              variant === 'grid'
                ? 'text-[11px] bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                : variant === 'feed'
                ? 'text-[11px] bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600'
                : 'text-[10px] border bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/30'
            )}
          >
            +{remainingCount}
          </button>
          {showTagPopover && categories.length > 2 && (
            <div className="absolute top-full left-0 mt-1 w-40 z-30 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl p-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col gap-1">
                {categories.slice(2).map((cat) => (
                  <button
                    key={cat}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCategoryClick(cat);
                      if (onToggleTagPopover) {
                        onToggleTagPopover(e);
                      }
                    }}
                    className="text-left text-xs px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {formatCategoryLabel(cat)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

