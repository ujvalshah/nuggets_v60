/**
 * Request Timeout Middleware
 * 
 * Ensures all requests have a timeout to prevent hanging requests.
 * Long-running operations should be aborted when timeout is exceeded.
 */

import { Request, Response, NextFunction } from 'express';

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds default
const LONG_OPERATION_TIMEOUT_MS = 60000; // 60 seconds for long operations

/**
 * Create timeout middleware
 */
export function requestTimeout(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set timeout for the request
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          error: true,
          message: 'Request timeout',
          code: 'REQUEST_TIMEOUT',
          timestamp: new Date().toISOString()
        });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      clearTimeout(timeout);
      originalEnd.apply(this, args);
    };

    next();
  };
}

/**
 * Timeout middleware for long-running operations (e.g., AI processing, metadata fetching)
 */
export const longOperationTimeout = requestTimeout(LONG_OPERATION_TIMEOUT_MS);

/**
 * Standard timeout middleware for regular API requests
 */
export const standardTimeout = requestTimeout(DEFAULT_TIMEOUT_MS);


