import React from 'react';
import { FileText, StickyNote, Lightbulb } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface CardBadgeProps {
  isTextNugget: boolean;
  sourceType: string | undefined;
  className?: string;
}

export const CardBadge: React.FC<CardBadgeProps> = ({
  isTextNugget,
  sourceType,
  className,
}) => {
  if (!isTextNugget) return null;

  return (
    <div className={twMerge('mb-3 flex items-center justify-between', className)}>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold tracking-wider">
        {sourceType === 'idea' ? (
          <Lightbulb size={10} />
        ) : sourceType === 'note' ? (
          <StickyNote size={10} />
        ) : (
          <FileText size={10} />
        )}
        {sourceType === 'idea' ? 'Thoughts' : sourceType === 'note' ? 'Note' : 'Text'}
      </span>
    </div>
  );
};
