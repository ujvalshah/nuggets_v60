import React from 'react';
import { twMerge } from 'tailwind-merge';

interface CardTitleProps {
  title: string;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ title, className }) => {
  if (!title) return null;

  return (
    <h3
      className={twMerge(
        'text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug mb-1 group-hover:text-primary-600 transition-colors',
        className
      )}
    >
      {title}
    </h3>
  );
};
