/**
 * AI Translation Service - Compatibility Layer
 * Wrapper for backward compatibility with existing code
 *
 * @deprecated Use @/services/translation/ai instead
 */

import { translateSEOContent } from '@/services/translation/ai';
import { DEFAULT_LOCALE } from '@/i18n/language';
import { getLanguageByCode } from '@/services/i18n/languages';
import type { Language } from '@/i18n/language';

export interface TranslateRequest {
  texts: Record<string, string>;
  sourceLocale: string;
  targetLocale: string;
  context?: string;
}

export interface TranslateResponse {
  translations: Record<string, string>;
  cost: number;
  tokensUsed: number;
}

/**
 * Translate multiple text fields using AI (compatibility wrapper)
 *
 * @deprecated Use translateSEOContent or translateGameName from @/services/translation/ai instead
 *
 * This function provides backward compatibility for existing code.
 * New code should use the direct functions from @/services/translation/ai
 */
export async function translateWithAI(request: TranslateRequest, db: D1Database): Promise<TranslateResponse> {
  const { texts, sourceLocale, targetLocale, context } = request;

  // Validate inputs
  if (!texts || Object.keys(texts).length === 0) {
    throw new Error('No texts provided for translation');
  }

  if (sourceLocale !== DEFAULT_LOCALE) {
    throw new Error(`Source locale must be ${DEFAULT_LOCALE}`);
  }

  if (sourceLocale === targetLocale) {
    throw new Error('Source and target locales are the same');
  }

  // Get target language from database
  const languageRecord = await getLanguageByCode(targetLocale, db);
  if (!languageRecord || !languageRecord.enabled) {
    throw new Error(`Language ${targetLocale} not found or disabled`);
  }

  // Convert database record to Language type
  const targetLanguage: Language = {
    lang: languageRecord.code,
    language: languageRecord.chineseName,
    languageLocal: languageRecord.nativeName,
  };

  // Prepare fields for translation
  const metadataTitle = texts.metadataTitle || texts.name || '';
  const metadataDescription = texts.metadataDescription || texts.description || '';
  const content = texts.content || '';

  // Call new API
  const result = await translateSEOContent(
    {
      metadataTitle,
      metadataDescription,
      content,
    },
    targetLanguage,
    db as unknown as CloudflareEnv,
  );

  // Map back to old format
  const translations: Record<string, string> = {};

  if (texts.metadataTitle || texts.name) {
    translations.metadataTitle = result.metadataTitle;
    if (texts.name) {
      translations.name = result.metadataTitle; // Use metadataTitle for name field
    }
  }

  if (texts.metadataDescription || texts.description) {
    translations.metadataDescription = result.metadataDescription;
    if (texts.description) {
      translations.description = result.metadataDescription;
    }
  }

  if (texts.content) {
    translations.content = result.content;
  }

  return {
    translations,
    cost: 0, // Cost tracking removed in new implementation
    tokensUsed: 0, // Token tracking removed in new implementation
  };
}
