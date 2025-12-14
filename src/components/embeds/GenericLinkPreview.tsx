import React from 'react';
import { ExternalLink } from 'lucide-react';
import { PreviewMetadata, MediaType } from '@/types';

interface GenericLinkPreviewProps {
  url: string;
  metadata?: PreviewMetadata;
  type?: MediaType;
}

export const GenericLinkPreview: React.FC<GenericLinkPreviewProps> = ({ 
  url, 
  metadata,
  type = 'link'
}) => {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary-500 transition-colors"
    >
      {metadata?.imageUrl && (
        <img 
          src={metadata.imageUrl} 
          alt={metadata.title || ''} 
          className="w-full h-32 object-cover rounded-lg mb-3"
        />
      )}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate mb-1">
            {metadata?.title || url}
          </h4>
          {metadata?.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
              {metadata.description}
            </p>
          )}
          <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
            {metadata?.siteName && <span>{metadata.siteName}</span>}
            <ExternalLink size={12} />
          </div>
        </div>
      </div>
    </a>
  );
};

