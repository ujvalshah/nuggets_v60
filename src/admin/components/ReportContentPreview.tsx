import React, { useState, useEffect } from 'react';
import { Article } from '@/types';
import { apiClient } from '@/services/apiClient';
import { Loader2, FileText, User, Layers, ExternalLink } from 'lucide-react';
import { formatDate } from '@/utils/formatters';

interface ReportContentPreviewProps {
  targetId: string;
  targetType: 'nugget' | 'user' | 'collection';
}

export const ReportContentPreview: React.FC<ReportContentPreviewProps> = ({ targetId, targetType }) => {
  const [content, setContent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (targetType === 'nugget') {
          const article = await apiClient.get<Article>(`/articles/${targetId}`);
          setContent(article);
        } else if (targetType === 'collection') {
          const collection = await apiClient.get<any>(`/collections/${targetId}`);
          setContent(collection);
        } else if (targetType === 'user') {
          const user = await apiClient.get<any>(`/users/${targetId}`);
          setContent(user);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load content');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [targetId, targetType]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 rounded-lg">
        <p className="text-sm text-amber-800 dark:text-amber-200">{error}</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
        <p className="text-sm text-slate-500">Content not found</p>
      </div>
    );
  }

  // Render based on target type
  if (targetType === 'nugget') {
    const article = content as Article;
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
        <div className="flex items-start gap-3">
          {article.media?.previewMetadata?.imageUrl && (
            <img 
              src={article.media.previewMetadata.imageUrl} 
              alt={article.title}
              className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={14} className="text-slate-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                {article.title || 'Untitled Nugget'}
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
              {article.excerpt || article.content?.substring(0, 150)}
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>By {article.author?.name || 'Unknown'}</span>
              {article.publishedAt && (
                <span>{formatDate(article.publishedAt, true)}</span>
              )}
            </div>
          </div>
        </div>
        {article.media?.url && (
          <a 
            href={article.media.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            View Source <ExternalLink size={12} />
          </a>
        )}
      </div>
    );
  }

  if (targetType === 'collection') {
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-slate-400" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            {content.name || 'Unnamed Collection'}
          </h4>
        </div>
        {content.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
            {content.description}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{(content.validEntriesCount ?? content.entries?.length) || 0} items</span>
          {content.createdAt && (
            <span>{formatDate(content.createdAt, true)}</span>
          )}
        </div>
      </div>
    );
  }

  if (targetType === 'user') {
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
        <div className="flex items-center gap-3">
          {content.profile?.avatarUrl && (
            <img 
              src={content.profile.avatarUrl} 
              alt={content.profile.displayName}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <User size={14} className="text-slate-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {content.profile?.displayName || content.auth?.email || 'Unknown User'}
              </h4>
            </div>
            {content.profile?.username && (
              <p className="text-xs text-slate-500">@{content.profile.username}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

