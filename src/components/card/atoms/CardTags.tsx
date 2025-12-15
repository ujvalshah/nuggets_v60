import React from 'react';
import { Tooltip } from '@/components/UI/Tooltip';
import { twMerge } from 'tailwind-merge';

interface TagPillProps {
  label: string;
  onClick?: (e: React.MouseEvent) => void;
}

// Format category label: lowercase and add hashtag prefix
const formatCategoryLabel = (category: string): string => {
  return `#${category.toLowerCase()}`;
};

const TagPill: React.FC<TagPillProps> = ({ label, onClick }) => {
  const displayLabel = formatCategoryLabel(label);
  
  const pill = (
    <span
      onClick={onClick}
      className={twMerge(
        // Compact design: Small size with amber/yellow/gold contrast colors
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors border',
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
        onClick &&
          'cursor-pointer hover:border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:shadow-sm'
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
  tagPopoverRef?: React.RefObject<HTMLDivElement>;
  className?: string;
}

export const CardTags: React.FC<CardTagsProps> = ({
  categories,
  onCategoryClick,
  showTagPopover,
  onToggleTagPopover,
  tagPopoverRef,
  className,
}) => {
  if (!categories || categories.length === 0) return null;

  const visibleCategories = categories.slice(0, 2);
  const remainingCount = categories.length - 2;

  return (
    <div
      className={twMerge(
        'flex flex-wrap items-center gap-1.5 mb-2 relative',
        'bg-amber-50 dark:bg-amber-900/20', // Subtle amber tint - using solid light amber
        'rounded-lg px-2 py-1.5', // Slight padding and rounded corners for the tinted area
        className
      )}
    >
      {visibleCategories.map((cat) => (
        <TagPill
          key={cat}
          label={cat}
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
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/30 transition-colors"
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

