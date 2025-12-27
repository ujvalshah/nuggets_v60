import React, { useState, useCallback, useLayoutEffect, useRef, useMemo, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { MarkdownRenderer, contentHasTable } from '@/components/MarkdownRenderer';
import { CardTitle } from './CardTitle';

interface CardContentProps {
  excerpt: string;
  content: string;
  isTextNugget: boolean;
  variant?: 'grid' | 'feed' | 'masonry' | 'utility'; // Design System: Variant-specific typography
  className?: string;
  allowExpansion?: boolean; // Allow expansion via fade overlay click (Hybrid cards only)
  cardType?: 'hybrid' | 'media-only'; // Card type - truncation ONLY for Hybrid cards
  title?: string; // Optional title to include inside truncation wrapper
}

/**
 * CardContent: Standardized content container with truncation & fade
 * 
 * RULES (Two-Card Architecture):
 * - Hybrid cards: Truncation + fade + expand/collapse apply to title + body content
 * - Media-Only cards: NO truncation, NO fade, NO expand/collapse (just render content)
 * - Truncation wrapper wraps BOTH title (if provided) and body content (never media, tags, footer)
 * - This ensures consistent fade alignment regardless of title length
 * - Fade overlay click expands the entire wrapper area (title + body together)
 * - Card body click (outside fade) opens article drawer (handled by parent)
 */
export const CardContent: React.FC<CardContentProps> = React.memo(({
  excerpt,
  content,
  isTextNugget,
  variant = 'grid', // Default to grid
  className,
  allowExpansion = false,
  cardType = 'hybrid', // Default to hybrid for backward compatibility
  title, // Optional title to include inside truncation wrapper
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Single source of truth for expansion state
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Overflow detection - measured once when collapsed, stored for use when expanded
  // hadOverflowWhenCollapsed: true if content overflowed during initial measurement
  const [hadOverflowWhenCollapsed, setHadOverflowWhenCollapsed] = useState(false);
  const [measured, setMeasured] = useState(false);
  
  // Strip leading markdown headers (h1/h2) to prevent title duplication
  // CardTitle component already renders the title separately, so headers in content are redundant
  const displayContent = useMemo(() => {
    const rawContent = content || excerpt;
    if (!rawContent) return '';
    
    const lines = rawContent.split('\n');
    const strippedLines: string[] = [];
    let skipMode = true; // Start in skip mode (skip headers and empty lines)
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (skipMode) {
        // Skip leading empty lines
        if (!trimmed) {
          continue;
        }
        
        // Skip leading h1 or h2 headers only
        // Match: # Title (h1) or ## Title (h2), but NOT ### Title (h3+)
        const isH1 = trimmed.startsWith('# ') && !trimmed.startsWith('##');
        const isH2 = trimmed.startsWith('## ') && !trimmed.startsWith('###');
        
        if (isH1 || isH2) {
          // Skip this header line and continue skipping empty lines after it
          continue;
        }
        
        // If we find any other content (including h3+ headers), exit skip mode
        skipMode = false;
      }
      
      // Keep all content after we've processed leading headers
      strippedLines.push(line);
    }
    
    const result = strippedLines.join('\n');
    // Remove leading/trailing whitespace but preserve internal formatting
    return result.trim();
  }, [content, excerpt]);
  
  // Detect if content contains tables - tables should not be line-clamped
  const hasTable = useMemo(() => contentHasTable(displayContent), [displayContent]);

  // Measurement-based overflow detection using useLayoutEffect
  // CRITICAL: Only measure when collapsed (max-height applied)
  // Once measured, store the result and don't re-measure while expanded
  useLayoutEffect(() => {
    // Only measure when NOT expanded (collapsed state with max-height)
    if (isExpanded) {
      // Don't re-measure when expanded - keep the stored overflow state
      return;
    }
    
    // Reset measurement state when content changes
    setMeasured(false);
    
    const element = contentRef.current;
    
    // Guard: No element to measure
    if (!element) {
      setHadOverflowWhenCollapsed(false);
      setMeasured(true);
      return;
    }
    
    // Guard: Empty or whitespace-only content - no overflow possible
    if (!displayContent || displayContent.trim().length === 0) {
      setHadOverflowWhenCollapsed(false);
      setMeasured(true);
      return;
    }

    // Use requestAnimationFrame to ensure CSS (max-height) is applied before measuring
    const rafId = requestAnimationFrame(() => {
      if (!contentRef.current) return;
      
      // Measurement-based overflow detection (collapsed state only)
      // scrollHeight = full content height (including clipped content)
      // clientHeight = visible height (respects max-height)
      const isOverflowing = contentRef.current.scrollHeight > contentRef.current.clientHeight;
      
      setHadOverflowWhenCollapsed(isOverflowing);
      setMeasured(true);
    });

    // Set up ResizeObserver for layout changes with debouncing (collapsed state only)
    let debounceTimeout: number | null = null;
    const resizeObserver = new ResizeObserver(() => {
      // Only re-measure if still collapsed
      if (isExpanded) return;
      
      if (debounceTimeout) {
        window.clearTimeout(debounceTimeout);
      }
      debounceTimeout = window.setTimeout(() => {
        if (!contentRef.current || isExpanded) return;
        const isOverflowing = contentRef.current.scrollHeight > contentRef.current.clientHeight;
        // Only update if value actually changed
        setHadOverflowWhenCollapsed(prev => prev !== isOverflowing ? isOverflowing : prev);
      }, 100); // 100ms debounce to prevent flicker
    });

    resizeObserver.observe(element);

    return () => {
      cancelAnimationFrame(rafId);
      if (debounceTimeout) {
        window.clearTimeout(debounceTimeout);
      }
      resizeObserver.disconnect();
    };
  }, [displayContent, isExpanded]);

  // Handle fade overlay click to expand
  const handleFadeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent drawer/card click
    e.preventDefault();
    if (allowExpansion && !isExpanded) {
      setIsExpanded(true);
    }
  }, [allowExpansion, isExpanded]);

  // Handle collapse click
  const handleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent drawer/card click
    e.preventDefault();
    setIsExpanded(false);
  }, []);

  // TRUNCATION LOGIC (Two-Card Architecture):
  // - Hybrid cards: Apply truncation + fade + expand/collapse
  // - Media-Only cards: NO truncation, NO fade, NO expand/collapse (just render content)
  // NOTE: Tables use a different max-height (200px vs 180px) but still get truncation + fade
  const isHybridCard = cardType === 'hybrid';
  // Allow truncation for hybrid cards even with tables (tables use special max-height handling)
  const shouldClamp = isHybridCard && allowExpansion && !isExpanded;
  
  // Show collapse control when: Hybrid card, expanded, AND allowExpansion
  const showCollapse = isHybridCard && allowExpansion && isExpanded;
  
  // 🔍 AUDIT LOGGING - Truncation Application
  // Calculate approximate line count for body text
  const bodyLineCount = useMemo(() => {
    if (!displayContent) return 0;
    const lines = displayContent.split('\n').filter(line => line.trim().length > 0);
    return lines.length;
  }, [displayContent]);
  
  useEffect(() => {
    const truncationData = {
      cardType,
      isHybridCard,
      allowExpansion,
      hasTable,
      isExpanded,
      shouldClamp,
      bodyLineCount,
      displayContentLength: displayContent.length,
      truncationApplied: shouldClamp,
      maxHeight: shouldClamp ? '180px' : 'none',
      willShowFade: shouldClamp,
    };
    console.log('[CARD-AUDIT] Truncation Application:', JSON.stringify(truncationData, null, 2));
    console.log('[CARD-AUDIT] Truncation Application (expanded):', truncationData);
    
    // CRITICAL: Warn if hybrid card but truncation not applied (should never happen now)
    if (isHybridCard && allowExpansion && !shouldClamp && !isExpanded) {
      console.warn('[CARD-AUDIT] ⚠️ HYBRID CARD BUT TRUNCATION NOT APPLIED!', {
        cardType,
        isHybridCard,
        allowExpansion,
        hasTable,
        isExpanded,
        shouldClamp,
      });
    }
  }, [cardType, isHybridCard, allowExpansion, hasTable, isExpanded, shouldClamp, bodyLineCount, displayContent.length]);

  return (
    <div 
      className={twMerge('relative flex-1 min-h-0 flex flex-col w-full', className)}
    >
      {/* TRUNCATION WRAPPER: Wraps BOTH title and body content for consistent fade alignment */}
      <div
        ref={contentRef}
        className={twMerge(
          // DEFAULT STATE: Fixed max-height with overflow hidden when collapsed
          // EXPANDED STATE: No height constraint, content shows fully
          shouldClamp ? 'relative overflow-hidden' : ''
        )}
        style={{
          // DEFAULT STATE: Fixed max-height constraint when collapsed (Hybrid cards only)
          // EXPANDED STATE: No max-height, content fills naturally
          // Card height MUST NOT expand unless manually expanded
          // Media-Only cards: NO max-height constraints
          ...(isHybridCard && hasTable && !isExpanded && allowExpansion ? { 
            maxHeight: '200px', 
            overflow: 'hidden',
            position: 'relative'
          } : shouldClamp ? {
            // Fixed max-height for consistent card heights - increased to show more content before truncation
            // ~180px = ~9-10 lines at 12px with line-height 1.4
            maxHeight: '180px',
            overflow: 'hidden',
            position: 'relative'
          } : undefined)
        }}
      >
        {/* Title (if provided) - included in truncation wrapper */}
        {title && (
          <div className={variant === 'grid' ? 'mb-2' : 'mb-2'}>
            <CardTitle title={title} variant={variant} />
          </div>
        )}
        
        {/* Body content */}
        <div
          className={twMerge(
            // PHASE 1: All body text uses same base size (text-xs = 12px)
            // Body uses regular weight vs bold title for hierarchy
            variant === 'feed' 
              ? 'text-xs text-slate-700 dark:text-slate-300' 
              : 'text-xs text-slate-600 dark:text-slate-400',
            // Apply relaxed line-height (1.625) for Hybrid cards only - improves readability
            isHybridCard ? 'leading-relaxed' : ''
          )}
        >
          <MarkdownRenderer content={displayContent} />
        </div>
        {/* FADE OVERLAY WITH EXPAND BUTTON: Clickable overlay to expand (ONLY way to expand) */}
        {shouldClamp && (
          <>
            {/* Light mode fade overlay */}
            <div 
              className="absolute inset-x-0 bottom-0 h-16 pointer-events-none dark:hidden"
              style={{
                background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.8) 40%, rgba(255, 255, 255, 1) 100%)',
                zIndex: 5
              }}
            />
            {/* Dark mode fade overlay */}
            <div 
              className="absolute inset-x-0 bottom-0 h-16 pointer-events-none hidden dark:block"
              style={{
                background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.8) 40%, rgba(15, 23, 42, 1) 100%)',
                zIndex: 5
              }}
            />
            {/* Clickable expand button overlay */}
            <div 
              className="absolute inset-x-0 bottom-0 h-16 pointer-events-auto cursor-pointer flex items-end justify-center pb-2"
              onClick={handleFadeClick}
              style={{ zIndex: 10 }}
            >
              <button
                className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all"
                aria-label="Expand content"
              >
                <span>Read more</span>
                <ChevronDown size={14} />
              </button>
            </div>
          </>
        )}
      </div>
      {/* EXPANDED STATE: Collapse control appears at bottom when expanded */}
      {showCollapse && (
        <div className="mt-2 flex justify-center">
          <button
            onClick={handleCollapse}
            className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            aria-label="Collapse content"
          >
            <ChevronUp size={14} />
            <span>Collapse</span>
          </button>
        </div>
      )}
    </div>
  );
});

