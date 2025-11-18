import { ORIGIN } from "./config";

/**
 * Export Configuration Constants
 * Configuration for batch export functionality
 */

export const EXPORT_CONFIG = {
  /**
   * Base URL for game page links
   * Used to construct pageUrl in game exports
   */
  gameBaseUrl: `${ORIGIN}/game`,

  /**
   * Base path for content files
   * Used to construct contentPath in game exports
   */
  contentBasePath: 'content',

  /**
   * Export metadata sources
   */
  sources: {
    database: 'database (Cloudflare D1)',
    categories: 'database (categories table - local D1)',
    tags: 'database (tags table - local D1)',
    featured: 'database (featured table - local D1)',
    games: 'database (games table - local D1)',
  },
} as const;

/**
 * Export data type definitions
 */
export type ExportDataType = 'categories' | 'tags' | 'featured' | 'games';
