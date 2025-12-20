import React from 'react';
import { twMerge } from 'tailwind-merge';

interface CardTitleProps {
  title?: string;
  className?: string;
  variant?: 'grid' | 'feed' | 'masonry' | 'utility'; // Variant for feed-specific styling
}

export const CardTitle: React.FC<CardTitleProps> = ({ title, className, variant }) => {
  if (!title) return null;

  // Finance-grade hierarchy: Feed titles are dominant (1.25rem-1.375rem, font-weight 500-600)
  // Grid titles remain smaller for density
  const isFeed = variant === 'feed';
  
  return (
    <h3
      className={twMerge(
        // Feed variant: Dominant headline (1.25rem-1.375rem, font-weight 500-600)
        // Grid variant: Compact (text-sm, font-bold)
        isFeed
          ? 'text-xl font-semibold text-slate-900 dark:text-white line-clamp-3 leading-snug mb-2'
          : 'text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight mb-1',
        'group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors',
        className
      )}
    >
      {title}
    </h3>
  );
};

