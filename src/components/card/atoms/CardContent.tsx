import React from 'react';
import { twMerge } from 'tailwind-merge';

interface CardContentProps {
  excerpt: string;
  content: string;
  isTextNugget: boolean;
  onReadMore?: () => void;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({
  excerpt,
  content,
  isTextNugget,
  onReadMore,
  className,
}) => {
  const text = excerpt || content;

  return (
    <>
      <div className={twMerge('relative mb-1', className)}>
        <p
          className={twMerge(
            'text-xs text-slate-600 dark:text-slate-400 leading-relaxed',
            isTextNugget ? 'line-clamp-4 text-[13px]' : 'line-clamp-3'
          )}
        >
          {text}
        </p>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none" />
      </div>

      {onReadMore && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReadMore();
          }}
          className="text-[11px] font-medium text-slate-400 hover:text-primary-600 transition-colors self-start mb-2"
        >
          Read more →
        </button>
      )}
    </>
  );
};
