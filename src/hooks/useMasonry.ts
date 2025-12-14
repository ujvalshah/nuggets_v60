import { useState, useLayoutEffect, useMemo, useCallback } from 'react';

/**
 * Breakpoint configuration for responsive column calculation
 */
export interface BreakpointConfig {
  minWidth: number;
  columnCount: number;
}

/**
 * Configuration for useMasonry hook
 */
export interface MasonryConfig {
  /**
   * Breakpoints sorted by minWidth (ascending)
   * Example: [{ minWidth: 0, columnCount: 1 }, { minWidth: 768, columnCount: 2 }, ...]
   */
  breakpoints: BreakpointConfig[];
  /**
   * Default column count for SSR (must match expected initial render)
   */
  defaultColumns: number;
  /**
   * Debounce delay for resize handling (ms)
   * @default 100
   */
  debounceMs?: number;
}

/**
 * Return type from useMasonry hook
 */
export interface MasonryResult<T> {
  /**
   * Items distributed into columns (columns[columnIndex][itemIndex])
   */
  columns: T[][];
  /**
   * Current column count (may differ from config.defaultColumns after client mount)
   */
  columnCount: number;
}

/**
 * Deterministic Round-Robin Masonry Hook
 * 
 * Architecture Rules:
 * - Uses index % columnCount for distribution (deterministic)
 * - Computes columnCount ONLY on client (SSR-safe)
 * - Uses useLayoutEffect for client measurement (prevents flash)
 * - Debounces resize handling (performance)
 * - NO height measurement
 * - NO shortest-column logic
 * - NO CSS columns
 * 
 * @template T - Type of items in the array
 * @param items - Array of items to distribute
 * @param config - Configuration for breakpoints and defaults
 * @returns { columns, columnCount }
 */
export function useMasonry<T>(
  items: T[],
  config: MasonryConfig
): MasonryResult<T> {
  const { breakpoints, defaultColumns, debounceMs = 100 } = config;

  // SSR-safe initial state (matches server render)
  const [columnCount, setColumnCount] = useState<number>(defaultColumns);
  const [isClient, setIsClient] = useState<boolean>(false);

  // Calculate column count from viewport width
  const calculateColumnCount = useCallback((): number => {
    // Guard against SSR
    if (typeof window === 'undefined') {
      return defaultColumns;
    }

    const width = window.innerWidth;
    
    // Find the highest breakpoint that matches
    // Breakpoints should be sorted by minWidth ascending
    let matchedColumns = defaultColumns;
    for (let i = breakpoints.length - 1; i >= 0; i--) {
      if (width >= breakpoints[i].minWidth) {
        matchedColumns = breakpoints[i].columnCount;
        break;
      }
    }

    return matchedColumns;
  }, [breakpoints, defaultColumns]);

  // Client-side column calculation (runs after mount)
  useLayoutEffect(() => {
    // Mark as client-side
    setIsClient(true);

    // Calculate initial column count
    const initialColumns = calculateColumnCount();
    setColumnCount(initialColumns);

    // Debounced resize handler
    let timeoutId: NodeJS.Timeout | null = null;
    const handleResize = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        const newColumnCount = calculateColumnCount();
        setColumnCount(newColumnCount);
      }, debounceMs);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateColumnCount, debounceMs]);

  // Distribute items deterministically using round-robin
  const columns = useMemo(() => {
    // Use defaultColumns during SSR, actual columnCount after client mount
    const activeColumnCount = isClient ? columnCount : defaultColumns;
    
    const cols: T[][] = Array.from({ length: activeColumnCount }, () => []);
    
    items.forEach((item, index) => {
      const columnIndex = index % activeColumnCount;
      cols[columnIndex].push(item);
    });
    
    return cols;
  }, [items, columnCount, defaultColumns, isClient]);

  return {
    columns,
    columnCount: isClient ? columnCount : defaultColumns,
  };
}
