import React from 'react';
import { twMerge } from 'tailwind-merge';

interface CardMetaProps {
  authorName: string;
  authorId: string;
  formattedDate: string;
  onAuthorClick?: (authorId: string) => void;
  className?: string;
}

export const CardMeta: React.FC<CardMetaProps> = ({
  authorName,
  authorId,
  formattedDate,
  onAuthorClick,
  className,
}) => {
  return (
    <div
      className={twMerge(
        'flex items-center gap-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500',
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (onAuthorClick) {
          onAuthorClick(authorId);
        }
      }}
    >
      <span className="text-slate-700 dark:text-slate-300 hover:underline cursor-pointer">
        {authorName}
      </span>
      <span>·</span>
      <span>{formattedDate}</span>
    </div>
  );
};
