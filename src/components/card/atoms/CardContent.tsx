import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';
import { replaceUrlsWithDomains, isPrimarilyUrl } from '@/utils/urlFormatter';

interface CardContentProps {
  excerpt: string;
  content: string;
  isTextNugget: boolean;
  variant?: 'grid' | 'feed' | 'masonry' | 'utility'; // Design System: Variant-specific typography
  className?: string;
  allowExpansion?: boolean; // Allow "Read more" expansion
}

export const CardContent: React.FC<CardContentProps> = React.memo(({
  excerpt,
  content,
  isTextNugget,
  variant = 'grid', // Default to grid
  className,
  allowExpansion = false,
}) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Memoize text processing to avoid recalculation on every render
  const text = useMemo(() => {
    let processedText = excerpt || content;
    
    // Remove standalone domain text (e.g., "x.com", "drive.google.com", "thumbs.dreamstime.com")
    // This filters out domain-only lines that appear as separate text elements
    const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    
    // Split by newlines and filter out domain-only lines
    const lines = processedText.split(/\r?\n/).filter(line => {
      const trimmed = line.trim();
      // Remove lines that are just domain names (with or without common prefixes)
      if (!trimmed) return false; // Remove empty lines
      if (domainPattern.test(trimmed)) return false; // Remove domain-only lines
      return true;
    });
    processedText = lines.join('\n').trim();
    
    // Replace URLs with domain names to reduce visual clutter
    if (isPrimarilyUrl(processedText) || processedText.length > 50) {
      processedText = replaceUrlsWithDomains(processedText);
    }
    
    // Final cleanup: Remove any remaining standalone domain text after URL replacement
    processedText = processedText.split(/\r?\n/).filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      return !domainPattern.test(trimmed);
    }).join('\n').trim();
    
    return processedText;
  }, [excerpt, content]);

  // Check if text is actually truncated - use ResizeObserver for accurate detection
  // Note: line-clamp truncates visually, so we need to check if content exceeds the clamped height
  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const checkTruncation = () => {
      // For line-clamp, we need to check if the content height exceeds the visible height
      // Create a temporary element without line-clamp to measure full height
      const tempElement = element.cloneNode(true) as HTMLElement;
      const style = window.getComputedStyle(element);
      tempElement.style.position = 'absolute';
      tempElement.style.visibility = 'hidden';
      tempElement.style.height = 'auto';
      tempElement.style.maxHeight = 'none';
      tempElement.style.display = 'block';
      tempElement.style.width = style.width;
      tempElement.style.padding = style.padding;
      tempElement.style.fontSize = style.fontSize;
      tempElement.style.lineHeight = style.lineHeight;
      tempElement.style.fontFamily = style.fontFamily;
      tempElement.style.fontWeight = style.fontWeight;
      tempElement.className = tempElement.className.replace(/line-clamp-\d+/g, '');
      
      element.parentElement?.appendChild(tempElement);
      const fullHeight = tempElement.scrollHeight;
      const visibleHeight = element.clientHeight;
      element.parentElement?.removeChild(tempElement);
      
      // Text is truncated if full height is greater than visible height
      const isOverflowing = fullHeight > visibleHeight + 2; // Add 2px tolerance for rounding
      setIsTruncated(isOverflowing);
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(checkTruncation, 0);

    // Use ResizeObserver to detect changes
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(checkTruncation, 0);
    });
    resizeObserver.observe(element);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [text]);

  const handleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setIsExpanded(true);
  }, []);

  const handleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setIsExpanded(false);
  }, []);

  const shouldShowExpansion = allowExpansion && isTruncated;
  const isCurrentlyTruncated = shouldShowExpansion && !isExpanded;

  return (
    <div className={twMerge('relative', className)}>
      <p
        ref={textRef}
        className={twMerge(
          // Design System: Variant-specific typography
          // Grid: text-xs (12px) - Secondary Text for Grid Card excerpts
          // Feed: text-base (16px) - Reading Body for Feed Card excerpts
          variant === 'feed' 
            ? 'text-base text-slate-900 dark:text-white leading-relaxed' 
            : 'text-xs text-slate-500 dark:text-slate-400 leading-relaxed',
          isCurrentlyTruncated 
            ? (isTextNugget ? 'line-clamp-4' : variant === 'grid' ? 'line-clamp-3' : 'line-clamp-4')
            : ''
        )}
      >
        {text}
      </p>
      {/* Compact design: Fade effect only when text is actually truncated and not expanded - enhanced visibility */}
      {isCurrentlyTruncated && (
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-slate-900 dark:via-slate-900/90 pointer-events-none z-20" />
      )}
      {/* Truncation indicator and Read more button */}
      {shouldShowExpansion && (
        <div className="mt-2 flex items-center gap-2">
          {isCurrentlyTruncated ? (
            <button
              onClick={handleExpand}
              className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-1 py-0.5 transition-colors"
              aria-label="Read more content"
            >
              Read more
            </button>
          ) : (
            <button
              onClick={handleCollapse}
              className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-1 py-0.5 transition-colors"
              aria-label="Show less content"
            >
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  );
});

