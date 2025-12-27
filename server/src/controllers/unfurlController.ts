import { Request, Response } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { fetchUrlMetadata } from '../services/metadata.js';

/**
 * POST /api/unfurl
 * 
 * Unfurl a URL and return normalized metadata.
 * 
 * Body: { url: string }
 * 
 * Returns: Nugget (normalized metadata)
 * 
 * NEVER throws - always returns a valid Nugget, even if it's a fallback.
 * 
 * Authentication: Optional (admin users get Microlink access)
 */
export async function unfurlUrl(req: Request, res: Response) {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'URL is required and must be a string',
      });
    }

    // Validate URL format and protocol
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({
        error: 'Invalid URL',
        message: 'URL format is invalid',
      });
    }

    // Security: Only allow http and https protocols
    const allowedProtocols = ['http:', 'https:'];
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      return res.status(400).json({
        error: 'Invalid URL protocol',
        message: 'Only http and https URLs are allowed',
      });
    }

    // Check if user is admin (for Microlink access)
    // Authentication is optional - silently check if token exists
    let isAdmin = false;
    const authHeader = req.headers['authorization'];
    
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (token) {
          const decoded = verifyToken(token);
          isAdmin = decoded.role === 'admin';
        }
      } catch {
        // Invalid token - treat as non-admin, continue silently
      }
    }

    // Fetch metadata with tiered waterfall strategy
    const nugget = await fetchUrlMetadata(url, { isAdmin });

    // Return normalized Nugget
    res.json(nugget);
  } catch (error: any) {
    // This should never happen, but if it does, return a fallback
    console.error('[Unfurl] Unexpected error:', error);

    // Create a minimal fallback
    // CRITICAL: Do not generate titles for non-Social/Video content types
    // Articles should have null title (user must provide)
    const fallback = {
      id: `nugget-${Date.now()}`,
      url: req.body?.url || 'unknown',
      domain: 'unknown',
      contentType: 'article' as const,
      title: undefined, // No auto-generated title for articles
      source: {
        name: 'Unknown',
        domain: 'unknown',
      },
      quality: 'fallback' as const,
    };

    res.json(fallback);
  }
}

