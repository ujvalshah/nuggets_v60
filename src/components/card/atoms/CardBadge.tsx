import React from 'react';
import { SourceBadge, extractDomain } from '@/components/shared/SourceBadge';
import { Article } from '@/types';

interface CardBadgeProps {
  isTextNugget: boolean;
  sourceType: string | undefined;
  /** Media object containing URL information */
  media?: Article['media'];
  /** Custom domain override (explicit prop, takes priority) */
  customDomain?: string | null;
  /** Size variant: 'sm' for icon-only, 'md' for icon+text */
  size?: 'sm' | 'md';
  /** Visual variant: 'overlay' for glassmorphic overlay on images, 'inline' for solid inline badge */
  variant?: 'overlay' | 'inline';
  className?: string;
}

/**
 * CardBadge Component
 * 
 * Wrapper around SourceBadge that extracts URL from article media.
 * Only displays for link-type sources (not text nuggets).
 * 
 * Automatically extracts customDomain from media.previewMetadata.siteName
 * if it differs from the parsed domain (indicating a custom override).
 */
export const CardBadge: React.FC<CardBadgeProps> = ({
  isTextNugget,
  sourceType,
  media,
  customDomain: explicitCustomDomain,
  size = 'sm',
  variant = 'overlay',
  className,
}) => {
  // Don't show badge for text nuggets
  if (isTextNugget) {
    return null;
  }

  // Extract URL from media object
  const url = media?.previewMetadata?.url || media?.url || null;

  // Extract customDomain: explicit prop > siteName (if different from parsed) > null
  let customDomain = explicitCustomDomain;
  if (!customDomain && media?.previewMetadata?.siteName && url) {
    const parsedDomain = extractDomain(url);
    const siteNameDomain = extractDomain(media.previewMetadata.siteName);
    // If siteName exists and doesn't match parsed domain, treat it as custom override
    if (siteNameDomain && parsedDomain && siteNameDomain !== parsedDomain) {
      customDomain = siteNameDomain;
    } else if (siteNameDomain && !parsedDomain) {
      // If we have siteName but can't parse URL domain, use siteName
      customDomain = siteNameDomain;
    }
  }

  // Only show badge if we have a URL or custom domain, or if it's a link source
  if (!url && !customDomain && sourceType !== 'link') {
    return null;
  }

  return (
    <SourceBadge
      url={url || undefined}
      customDomain={customDomain || undefined}
      size={size}
      variant={variant}
      className={className}
    />
  );
};

