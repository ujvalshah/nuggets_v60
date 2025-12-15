import React from 'react';
import { NuggetMedia } from '@/types';
import { Image } from '@/components/Image';
import { DocumentPreview, DocumentType } from './DocumentPreview';

interface EmbeddedMediaProps {
  media: NuggetMedia;
  onClick?: (e: React.MouseEvent) => void;
}

// Map MediaType to DocumentType
function mapToDocumentType(type: string): DocumentType | null {
  const mapping: Record<string, DocumentType> = {
    'pdf': 'pdf',
    'doc': 'doc',
    'docx': 'docx',
    'xls': 'xls',
    'xlsx': 'xlsx',
    'ppt': 'ppt',
    'pptx': 'pptx',
    'txt': 'txt',
    'zip': 'zip',
  };
  return mapping[type.toLowerCase()] || null;
}

// Extract filename from URL
function extractFilename(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || 'Document';
    return decodeURIComponent(filename);
  } catch {
    // If URL parsing fails, try to extract from string
    const parts = url.split('/');
    return parts[parts.length - 1] || 'Document';
  }
}

export const EmbeddedMedia: React.FC<EmbeddedMediaProps> = ({ media, onClick }) => {
  const { url, type } = media;
  
  // Check if this is a document type
  const documentType = mapToDocumentType(type);
  if (documentType) {
    // Extract filename from URL or use title
    const filename = media.previewMetadata?.title || extractFilename(url);
    const fileSize = media.previewMetadata?.description?.match(/(\d+\.?\d*\s*(KB|MB|GB))/i)?.[0];
    
    return (
      <DocumentPreview
        url={url}
        filename={filename}
        fileSize={fileSize}
        fileType={documentType}
        thumbnailUrl={media.previewMetadata?.imageUrl} // Optional PDF thumbnail
        onClick={onClick}
        showDownloadButton={true}
      />
    );
  }
  
  // Use preview image if available, otherwise fall back to URL
  const imageUrl = media.previewMetadata?.imageUrl || (type === 'image' ? url : null);

  // If we have an image URL, render it
  if (imageUrl) {
    return (
      <div className="w-full h-full relative overflow-hidden bg-slate-100 dark:bg-slate-900 rounded-xl" onClick={onClick}>
        <Image 
          src={imageUrl} 
          alt={media.previewMetadata?.title || 'Preview'} 
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105 cursor-pointer"
        />
        {/* Overlay with title/description for non-image types */}
        {type !== 'image' && media.previewMetadata?.title && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <h3 className="text-white text-sm font-bold line-clamp-1">{media.previewMetadata.title}</h3>
            {media.previewMetadata.description && (
              <p className="text-white/90 text-xs line-clamp-2 mt-1">{media.previewMetadata.description}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default: render as link preview (no image)
  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-100 dark:bg-slate-900 rounded-xl">
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block w-full h-full p-4 text-slate-600 dark:text-slate-300 hover:text-primary-500"
      >
        {media.previewMetadata?.title || url}
      </a>
    </div>
  );
};


