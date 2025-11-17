/**
 * Translation Audit Types
 * Types for translation completeness auditing
 */

/**
 * Content type
 */
export type ContentType = 'category' | 'tag' | 'featured' | 'game';

/**
 * Translation status for a specific locale
 */
export type TranslationStatus = 'complete' | 'partial' | 'missing';

/**
 * Translation status for a single locale
 */
export interface LocaleTranslationStatus {
  status: TranslationStatus;
  completeness: number; // 0-1, percentage of required fields filled
  missingFields?: string[]; // List of missing required fields
}

/**
 * Single content item's translation status
 */
export interface ContentTranslationStatus {
  uuid: string;
  name: string;
  slug: string;
  type: ContentType;
  translations: {
    [locale: string]: LocaleTranslationStatus;
  };
}

/**
 * Translation statistics
 */
export interface TranslationStats {
  totalItems: number;
  completeItems: number; // Items with 100% translation in all locales
  partialItems: number; // Items with some but not all translations
  missingItems: number; // Items with no translations in non-default locales
  byLocale: {
    [locale: string]: {
      complete: number; // Items with complete translation in this locale
      partial: number; // Items with partial translation in this locale
      missing: number; // Items with no translation in this locale
    };
  };
  // For games only: online games statistics (primary focus)
  // Also available in overall stats: online games + all other content types
  online?: {
    totalItems: number;
    completeItems: number;
    partialItems: number;
    missingItems: number;
    byLocale: {
      [locale: string]: {
        complete: number;
        partial: number;
        missing: number;
      };
    };
  };
}

/**
 * Translation audit response
 */
export interface TranslationAuditResponse {
  stats: {
    overall: TranslationStats;
    byType: {
      [type in ContentType]: TranslationStats;
    };
  };
  items: ContentTranslationStatus[];
}

/**
 * Translation audit options
 */
export interface TranslationAuditOptions {
  contentTypes?: ContentType[]; // Filter by content types
  locales?: string[]; // Filter by locales
  status?: TranslationStatus; // Filter by translation status
  page?: number; // Pagination
  pageSize?: number; // Pagination
}
