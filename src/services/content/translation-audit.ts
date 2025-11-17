/**
 * Translation Audit Service
 * Audit translation completeness for all content types
 */

import { DEFAULT_LOCALE } from '@/i18n/language';
import { getAllLanguages } from '@/services/i18n/languages';
import { getAllTranslations } from '@/services/i18n/translation';
import { categoryTranslations, tagTranslations, featuredTranslations, introductionTranslations } from '@/db/schema';
import { createDrizzleClient } from '@/db/client';
import { isNull } from 'drizzle-orm';
import {
  TRANSLATABLE_FIELDS,
  getRequiredFields,
  getMissingFields,
  calculateCompleteness,
} from '@/lib/translation-completeness';
import type {
  ContentType,
  TranslationStatus,
  LocaleTranslationStatus,
  ContentTranslationStatus,
  TranslationStats,
  TranslationAuditResponse,
  TranslationAuditOptions,
} from '@/types/services/translation-audit';

/**
 * Internal type for language list
 */
interface LanguageItem {
  code: string;
  nativeName: string;
}

/**
 * Calculate translation status for a locale by comparing with source content
 * @param sourceContent - Source content in default locale (with actual values)
 * @param translation - Translation content for target locale
 * @param translatableFields - List of fields that can be translated
 */
function calculateLocaleStatus(
  sourceContent: Record<string, any>,
  translation: Record<string, any> | null,
  translatableFields: string[],
): LocaleTranslationStatus {
  const missingFields = getMissingFields(sourceContent, translation, translatableFields);
  const completeness = calculateCompleteness(sourceContent, translation, translatableFields);

  // Determine status based on completeness
  let status: TranslationStatus;
  if (completeness === 1) {
    status = 'complete';
  } else if (completeness === 0) {
    status = 'missing';
  } else {
    status = 'partial';
  }

  return {
    status,
    completeness,
    ...(missingFields.length > 0 && { missingFields }),
  };
}

/**
 * Get categories with translation status
 */
async function getCategoriesWithTranslationStatus(
  db: D1Database,
  languages: LanguageItem[],
): Promise<ContentTranslationStatus[]> {
  // Get all non-deleted categories with full content fields using raw SQL
  const categoriesResult = await db
    .prepare(
      'SELECT uuid, name, slug, metadata_title, metadata_description, content FROM categories WHERE deleted_at IS NULL ORDER BY name ASC',
    )
    .all();

  const categories = categoriesResult.results || [];

  const results: ContentTranslationStatus[] = [];

  for (const category of categories) {
    const translations: { [locale: string]: LocaleTranslationStatus } = {};

    // Build source content object from default locale
    const sourceContent = {
      metadataTitle: category.metadata_title,
      metadataDescription: category.metadata_description,
      content: category.content,
    };

    // Check translations for each locale
    for (const lang of languages) {
      if (lang.code === DEFAULT_LOCALE) {
        // Default locale is always complete (stored in main table)
        translations[lang.code] = {
          status: 'complete',
          completeness: 1,
        };
      } else {
        // Get translation from translation table
        const translationsMap = await getAllTranslations(
          categoryTranslations,
          categoryTranslations.categoryUuid,
          category.uuid as string,
          db,
        );

        const translation = translationsMap[lang.code] || null;
        translations[lang.code] = calculateLocaleStatus(sourceContent, translation, TRANSLATABLE_FIELDS.category);
      }
    }

    results.push({
      uuid: category.uuid as string,
      name: category.name as string,
      slug: category.slug as string,
      type: 'category',
      translations,
    });
  }

  return results;
}

/**
 * Get tags with translation status
 */
async function getTagsWithTranslationStatus(
  db: D1Database,
  languages: LanguageItem[],
): Promise<ContentTranslationStatus[]> {
  const tagsResult = await db
    .prepare(
      'SELECT uuid, name, slug, metadata_title, metadata_description, content FROM tags WHERE deleted_at IS NULL ORDER BY name ASC',
    )
    .all();

  const tags = tagsResult.results || [];

  const results: ContentTranslationStatus[] = [];

  for (const tag of tags) {
    const translations: { [locale: string]: LocaleTranslationStatus } = {};

    // Build source content object from default locale
    const sourceContent = {
      metadataTitle: tag.metadata_title,
      metadataDescription: tag.metadata_description,
      content: tag.content,
    };

    for (const lang of languages) {
      if (lang.code === DEFAULT_LOCALE) {
        translations[lang.code] = {
          status: 'complete',
          completeness: 1,
        };
      } else {
        const translationsMap = await getAllTranslations(
          tagTranslations,
          tagTranslations.tagUuid,
          tag.uuid as string,
          db,
        );

        const translation = translationsMap[lang.code] || null;
        translations[lang.code] = calculateLocaleStatus(sourceContent, translation, TRANSLATABLE_FIELDS.tag);
      }
    }

    results.push({
      uuid: tag.uuid as string,
      name: tag.name as string,
      slug: tag.slug as string,
      type: 'tag',
      translations,
    });
  }

  return results;
}

/**
 * Get featured collections with translation status
 */
async function getFeaturedWithTranslationStatus(
  db: D1Database,
  languages: LanguageItem[],
): Promise<ContentTranslationStatus[]> {
  const featuredResult = await db
    .prepare(
      'SELECT uuid, name, slug, metadata_title, metadata_description, content FROM featured WHERE deleted_at IS NULL ORDER BY name ASC',
    )
    .all();

  const featured = featuredResult.results || [];

  const results: ContentTranslationStatus[] = [];

  for (const item of featured) {
    const translations: { [locale: string]: LocaleTranslationStatus } = {};

    // Build source content object from default locale
    const sourceContent = {
      metadataTitle: item.metadata_title,
      metadataDescription: item.metadata_description,
      content: item.content,
    };

    for (const lang of languages) {
      if (lang.code === DEFAULT_LOCALE) {
        translations[lang.code] = {
          status: 'complete',
          completeness: 1,
        };
      } else {
        const translationsMap = await getAllTranslations(
          featuredTranslations,
          featuredTranslations.featuredUuid,
          item.uuid as string,
          db,
        );

        const translation = translationsMap[lang.code] || null;
        translations[lang.code] = calculateLocaleStatus(sourceContent, translation, TRANSLATABLE_FIELDS.featured);
      }
    }

    results.push({
      uuid: item.uuid as string,
      name: item.name as string,
      slug: item.slug as string,
      type: 'featured',
      translations,
    });
  }

  return results;
}

/**
 * Get games with translation status
 * @param onlineOnly - If true, only fetch games with status='online'
 */
async function getGamesWithTranslationStatus(
  db: D1Database,
  languages: LanguageItem[],
  onlineOnly = false,
): Promise<ContentTranslationStatus[]> {
  const query = onlineOnly
    ? "SELECT uuid, name, slug, name_i18n FROM games WHERE deleted_at IS NULL AND status = 'online' ORDER BY name ASC"
    : 'SELECT uuid, name, slug, name_i18n FROM games WHERE deleted_at IS NULL ORDER BY name ASC';

  const gamesResult = await db.prepare(query).all();

  const games = gamesResult.results || [];

  const results: ContentTranslationStatus[] = [];

  for (const game of games) {
    const translations: { [locale: string]: LocaleTranslationStatus } = {};

    // Parse nameI18n
    const nameI18n = game.name_i18n ? JSON.parse(game.name_i18n as string) : { [DEFAULT_LOCALE]: game.name };

    // Get introduction source content from default locale
    const introResult = await db
      .prepare(
        'SELECT metadata_title, metadata_description, content FROM introductions WHERE game_uuid = ? AND deleted_at IS NULL',
      )
      .bind(game.uuid)
      .first();

    const introSourceContent = introResult
      ? {
          metadataTitle: introResult.metadata_title,
          metadataDescription: introResult.metadata_description,
          content: introResult.content,
        }
      : null;

    // Get introduction translations
    const introTranslations = await getAllTranslations(
      introductionTranslations,
      introductionTranslations.gameUuid,
      game.uuid as string,
      db,
    );

    for (const lang of languages) {
      if (lang.code === DEFAULT_LOCALE) {
        translations[lang.code] = {
          status: 'complete',
          completeness: 1,
        };
      } else {
        // Check both nameI18n and introduction translations
        const hasName = !!nameI18n[lang.code];
        const introTranslation = introTranslations[lang.code] || null;

        // Calculate intro status using source content comparison
        // If no intro source content exists, the game has no introduction to translate -> complete
        const introStatus = introSourceContent
          ? calculateLocaleStatus(introSourceContent, introTranslation, TRANSLATABLE_FIELDS.introduction)
          : { status: 'complete' as const, completeness: 1 };

        // Game translation requires both name and introduction
        let status: TranslationStatus;
        let completeness: number;
        let missingFields: string[] = [];

        if (!hasName && introStatus.status === 'missing') {
          status = 'missing';
          completeness = 0;
          missingFields = ['name', ...(introStatus.missingFields || [])];
        } else if (hasName && introStatus.status === 'complete') {
          status = 'complete';
          completeness = 1;
        } else {
          status = 'partial';
          if (!hasName) {
            missingFields.push('name');
          }
          if (introStatus.missingFields) {
            missingFields.push(...introStatus.missingFields);
          }
          // Calculate completeness: name (33%) + intro fields (67%)
          const nameCompleteness = hasName ? 0.33 : 0;
          const introCompleteness = introStatus.completeness * 0.67;
          completeness = nameCompleteness + introCompleteness;
        }

        translations[lang.code] = {
          status,
          completeness,
          ...(missingFields.length > 0 && { missingFields }),
        };
      }
    }

    results.push({
      uuid: game.uuid as string,
      name: game.name as string,
      slug: game.slug as string,
      type: 'game',
      translations,
    });
  }

  return results;
}

/**
 * Calculate statistics from content items
 */
function calculateStats(items: ContentTranslationStatus[]): TranslationStats {
  // Extract locales from actual items (to respect filtering done by auditTranslations)
  const localesSet = new Set<string>();
  for (const item of items) {
    if (!item) {
      console.error('[calculateStats] Found undefined item in items array');
      continue;
    }
    if (!item.translations) {
      console.error(`[calculateStats] Item ${item.uuid || 'unknown'} has undefined translations`);
      continue;
    }
    if (item.translations) {
      Object.keys(item.translations).forEach((locale) => localesSet.add(locale));
    }
  }
  const locales = Array.from(localesSet);

  const stats: TranslationStats = {
    totalItems: items.length,
    completeItems: 0,
    partialItems: 0,
    missingItems: 0,
    byLocale: {},
  };

  // Initialize locale stats for all present locales
  for (const locale of locales) {
    stats.byLocale[locale] = {
      complete: 0,
      partial: 0,
      missing: 0,
    };
  }

  // Calculate stats for each item
  for (const item of items) {
    let allLocalesComplete = true;
    let anyLocaleComplete = false;

    // Skip items without translations
    if (!item.translations) {
      stats.missingItems++;
      for (const locale of locales) {
        stats.byLocale[locale].missing++;
      }
      continue;
    }

    for (const locale of locales) {
      const localeStatus = item.translations[locale];

      // Check if translation exists for this locale
      if (!localeStatus) {
        stats.byLocale[locale].missing++;
        allLocalesComplete = false;
        continue;
      }

      if (localeStatus.status === 'complete') {
        stats.byLocale[locale].complete++;
        anyLocaleComplete = true;
      } else if (localeStatus.status === 'partial') {
        stats.byLocale[locale].partial++;
        allLocalesComplete = false;
      } else {
        stats.byLocale[locale].missing++;
        allLocalesComplete = false;
      }
    }

    if (allLocalesComplete) {
      stats.completeItems++;
    } else if (anyLocaleComplete) {
      stats.partialItems++;
    } else {
      stats.missingItems++;
    }
  }

  return stats;
}

/**
 * Audit translation completeness for all content types
 */
export async function auditTranslations(
  options: TranslationAuditOptions = {},
  db: D1Database,
): Promise<TranslationAuditResponse> {
  const { contentTypes, locales, status, page = 1, pageSize = 100 } = options;

  // Get enabled languages from database (only enabled ones)
  const languageRecords = await getAllLanguages(false, db);
  const languages: LanguageItem[] = languageRecords.map((record) => ({
    code: record.code,
    nativeName: record.nativeName,
  }));

  // Get all content items with translation status
  let allItems: ContentTranslationStatus[] = [];
  let onlineGames: ContentTranslationStatus[] = []; // For online-only statistics

  const contentTypesToFetch = contentTypes || ['category', 'tag', 'featured', 'game'];

  if (contentTypesToFetch.includes('category')) {
    const categories = await getCategoriesWithTranslationStatus(db, languages);
    allItems.push(...categories);
  }

  if (contentTypesToFetch.includes('tag')) {
    const tags = await getTagsWithTranslationStatus(db, languages);
    allItems.push(...tags);
  }

  if (contentTypesToFetch.includes('featured')) {
    const featured = await getFeaturedWithTranslationStatus(db, languages);
    allItems.push(...featured);
  }

  if (contentTypesToFetch.includes('game')) {
    // Fetch all games (for items list - backward compatibility)
    const games = await getGamesWithTranslationStatus(db, languages, false);
    allItems.push(...games);

    // Fetch online games separately (for primary statistics)
    onlineGames = await getGamesWithTranslationStatus(db, languages, true);
  }

  // Filter by locales if specified
  if (locales && locales.length > 0) {
    allItems = allItems.map((item) => ({
      ...item,
      translations: Object.fromEntries(
        Object.entries(item.translations).filter(([locale]) => locales.includes(locale) || locale === DEFAULT_LOCALE),
      ),
    }));
  }

  // Filter by status if specified
  if (status) {
    allItems = allItems.filter((item) => {
      const nonDefaultLocales = Object.entries(item.translations).filter(([locale]) => locale !== DEFAULT_LOCALE);

      if (status === 'complete') {
        return nonDefaultLocales.every(([, localeStatus]) => localeStatus && localeStatus.status === 'complete');
      } else if (status === 'partial') {
        const hasComplete = nonDefaultLocales.some(
          ([, localeStatus]) => localeStatus && localeStatus.status === 'complete',
        );
        const hasPartialOrMissing = nonDefaultLocales.some(
          ([, localeStatus]) =>
            localeStatus && (localeStatus.status === 'partial' || localeStatus.status === 'missing'),
        );
        return hasComplete && hasPartialOrMissing;
      } else {
        // missing
        return nonDefaultLocales.every(([, localeStatus]) => !localeStatus || localeStatus.status === 'missing');
      }
    });
  }

  // Calculate overall stats (includes all games - online, draft, offline)
  const overallStats = calculateStats(allItems);

  // Calculate stats by type
  const statsByType: { [type in ContentType]: TranslationStats } = {
    category: calculateStats(allItems.filter((item) => item.type === 'category')),
    tag: calculateStats(allItems.filter((item) => item.type === 'tag')),
    featured: calculateStats(allItems.filter((item) => item.type === 'featured')),
    game: calculateStats(allItems.filter((item) => item.type === 'game')),
  };

  // Add online games statistics to game stats (after locale filtering)
  if (contentTypesToFetch.includes('game') && onlineGames.length > 0) {
    // Apply same locale filtering to online games
    let filteredOnlineGames = onlineGames;
    if (locales && locales.length > 0) {
      filteredOnlineGames = onlineGames.map((item) => ({
        ...item,
        translations: Object.fromEntries(
          Object.entries(item.translations).filter(([locale]) => locales.includes(locale) || locale === DEFAULT_LOCALE),
        ),
      }));
    }

    const onlineStats = calculateStats(filteredOnlineGames);
    statsByType.game.online = {
      totalItems: onlineStats.totalItems,
      completeItems: onlineStats.completeItems,
      partialItems: onlineStats.partialItems,
      missingItems: onlineStats.missingItems,
      byLocale: onlineStats.byLocale,
    };

    // Calculate overall stats with online games only (primary focus)
    // Get non-game items
    const nonGameItems = allItems.filter((item) => item.type !== 'game');
    // Combine with online games
    const onlineOnlyItems = [...nonGameItems, ...filteredOnlineGames];
    const onlineOverallStats = calculateStats(onlineOnlyItems);

    overallStats.online = {
      totalItems: onlineOverallStats.totalItems,
      completeItems: onlineOverallStats.completeItems,
      partialItems: onlineOverallStats.partialItems,
      missingItems: onlineOverallStats.missingItems,
      byLocale: onlineOverallStats.byLocale,
    };
  }

  // Apply pagination
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedItems = allItems.slice(start, end);

  return {
    stats: {
      overall: overallStats,
      byType: statsByType,
    },
    items: paginatedItems,
  };
}
