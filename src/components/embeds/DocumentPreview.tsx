/**
 * DocumentPreview Component
 * 
 * Displays document cards with icon, metadata, and click-to-open behavior.
 * Follows global UX best practices for document handling.
 * 
 * Philosophy: Documents are decision surfaces, not consumption surfaces.
 * - No iframe embedding
 * - Click opens original URL (external)
 * - Icon-based preview (fast, reliable)
 * - Optional thumbnail for PDFs (future enhancement)
 */

import React from 'react';
import { FileText, File, Download, ExternalLink } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export type DocumentType = 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'ppt' | 'pptx' | 'txt' | 'zip';

interface DocumentPreviewProps {
  url: string;
  filename: string;
  fileSize?: string;
  fileType: DocumentType;
  thumbnailUrl?: string; // Optional: first page thumbnail for PDFs
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  showDownloadButton?: boolean;
}

// Icon colors by document type (following industry standards)
const DOCUMENT_COLORS: Record<DocumentType, string> = {
  pdf: '#DC2626',      // Red (Adobe PDF)
  doc: '#2563EB',      // Blue (Microsoft Word)
  docx: '#2563EB',     // Blue (Microsoft Word)
  xls: '#16A34A',      // Green (Microsoft Excel)
  xlsx: '#16A34A',     // Green (Microsoft Excel)
  ppt: '#EA580C',      // Orange (Microsoft PowerPoint)
  pptx: '#EA580C',     // Orange (Microsoft PowerPoint)
  txt: '#6B7280',      // Gray (Plain text)
  zip: '#9333EA',      // Purple (Archive)
};

// Icon components by document type
const getDocumentIcon = (type: DocumentType, size: number = 48) => {
  const color = DOCUMENT_COLORS[type];
  
  // Use FileText for most types, File for archives
  if (type === 'zip') {
    return <File size={size} style={{ color }} />;
  }
  
  return <FileText size={size} style={{ color }} />;
};

// Format file size
function formatFileSize(bytes?: string | number): string {
  if (!bytes) return '';
  
  const numBytes = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
  if (isNaN(numBytes)) return '';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = numBytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

// Get file type label
function getFileTypeLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    pdf: 'PDF',
    doc: 'DOC',
    docx: 'DOCX',
    xls: 'XLS',
    xlsx: 'XLSX',
    ppt: 'PPT',
    pptx: 'PPTX',
    txt: 'TXT',
    zip: 'ZIP',
  };
  
  return labels[type] || type.toUpperCase();
}

// Truncate filename if too long
function truncateFilename(filename: string, maxLength: number = 30): string {
  if (filename.length <= maxLength) return filename;
  const extension = filename.split('.').pop();
  const nameWithoutExt = filename.slice(0, filename.lastIndexOf('.'));
  const truncated = nameWithoutExt.slice(0, maxLength - extension!.length - 4);
  return `${truncated}...${extension}`;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  url,
  filename,
  fileSize,
  fileType,
  thumbnailUrl,
  className,
  onClick,
  showDownloadButton = false,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(e);
    } else {
      // Default: open URL in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const displayFilename = truncateFilename(filename);
  const displaySize = formatFileSize(fileSize);
  const typeLabel = getFileTypeLabel(fileType);

  return (
    <div
      className={twMerge(
        'w-full h-full rounded-xl overflow-hidden',
        'bg-slate-50 dark:bg-slate-800/50',
        'border border-slate-200 dark:border-slate-700',
        'relative group cursor-pointer',
        'transition-all duration-200',
        'hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600',
        'hover:scale-[1.02]',
        className
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${typeLabel} document: ${filename}. Click to open.`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
    >
      {/* Optional thumbnail background (for PDFs) */}
      {thumbnailUrl && (
        <div className="absolute inset-0 opacity-10">
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
            aria-hidden="true"
          />
        </div>
      )}

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center p-6 gap-3">
        {/* Document Icon */}
        <div className="flex items-center justify-center">
          {getDocumentIcon(fileType, 56)}
        </div>

        {/* Filename */}
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 break-words">
            {displayFilename}
          </p>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {displaySize && (
            <>
              <span>{displaySize}</span>
              <span>·</span>
            </>
          )}
          <span className="font-medium">{typeLabel}</span>
        </div>

        {/* Hover indicator */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
            <ExternalLink size={12} />
            <span>Open</span>
          </div>
        </div>
      </div>

      {/* Optional download button */}
      {showDownloadButton && (
        <button
          onClick={handleDownload}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-slate-800"
          aria-label={`Download ${filename}`}
          title="Download"
        >
          <Download size={14} className="text-slate-600 dark:text-slate-400" />
        </button>
      )}
    </div>
  );
};

