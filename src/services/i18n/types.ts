/**
 * I18n Service Types
 * Common types for internationalization services
 */

/**
 * Translation metadata for a single field
 */
export interface TranslationMetadata {
  available: boolean; // Whether translation exists for this locale
  partial: boolean; // Whether translation is partial (some fields missing)
  completeness: number; // 0-1 ratio of translated fields
}

/**
 * Base translation fields for SEO content
 */
export interface SeoTranslationFields {
  name?: string;
  metadataTitle: string;
  metadataDescription: string;
  content?: string;
}

/**
 * Translation record with locale
 */
export interface TranslationRecord extends SeoTranslationFields {
  locale: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Result with translation metadata
 */
export interface WithTranslation<T> extends T {
  _locale: string;
  _fallback: boolean;
  _fallbackFields?: string[];
  _translation?: TranslationMetadata;
}

/**
 * Translation input for create/update operations
 */
export interface TranslationInput {
  [locale: string]: Partial<SeoTranslationFields>;
}

/**
 * Admin view of entity with all translations
 */
export interface WithAllTranslations<T> {
  base: T;
  translations: {
    [locale: string]: SeoTranslationFields;
  };
}
