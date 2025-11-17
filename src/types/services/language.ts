import type { LanguageCode } from '../lang';

/**
 * Language Configuration Types
 * Types for language configuration from database (used in admin components)
 */

/**
 * Language configuration record from database
 * Used by admin components to display and manage languages
 */
export interface LanguageRecord {
  id: number;
  code: LanguageCode;
  nativeName: string;
  chineseName: string;
  englishName: string;
  isDefault: boolean;
  enabled: boolean;
  sortOrder: number | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Simplified language item for UI components
 * Contains only the fields needed for rendering
 */
export interface LanguageItem {
  code: string;
  nativeName: string;
  chineseName: string;
  isDefault: boolean;
}
