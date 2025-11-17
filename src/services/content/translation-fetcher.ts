/**
 * Translation Content Fetcher Service
 * Fetches localized content from translation tables
 */

import { eq, and, isNull } from 'drizzle-orm';
import { createDrizzleClient } from '@/db/client';
import {
  categoryTranslations,
  tagTranslations,
  featuredTranslations,
  introductions,
  introductionTranslations,
} from '@/db/schema';
import { DEFAULT_LOCALE } from '@/i18n/language';
import type { LanguageCode } from '@/types/lang';

/**
 * Category with optional translation fields
 */
export interface TranslatedCategory {
  uuid: string;
  name: string;
  slug: string;
  metadataTitle: string | null;
  metadataDescription: string | null;
  content: string | null;
}

/**
 * Tag with optional translation fields
 */
export interface TranslatedTag {
  uuid: string;
  name: string;
  slug: string;
  metadataTitle: string | null;
  metadataDescription: string | null;
  content: string | null;
}

/**
 * Featured collection with optional translation fields
 */
export interface TranslatedFeatured {
  uuid: string;
  name: string;
  slug: string;
  metadataTitle: string | null;
  metadataDescription: string | null;
  content: string | null;
}

/**
 * Game introduction with translation
 */
export interface TranslatedIntroduction {
  content: string | null;
  metadataTitle: string | null;
  metadataDescription: string | null;
}

/**
 * Fetch translated category fields
 * Falls back to original content if translation not found
 */
export async function getTranslatedCategory(
  categoryUuid: string,
  locale: LanguageCode,
  originalCategory: TranslatedCategory,
  db: D1Database,
): Promise<TranslatedCategory> {
  // If default locale, return original
  if (locale === DEFAULT_LOCALE) {
    return originalCategory;
  }

  const client = createDrizzleClient(db);

  // Fetch translation
  const translations = await client
    .select({
      name: categoryTranslations.name,
      metadataTitle: categoryTranslations.metadataTitle,
      metadataDescription: categoryTranslations.metadataDescription,
      content: categoryTranslations.content,
    })
    .from(categoryTranslations)
    .where(and(eq(categoryTranslations.categoryUuid, categoryUuid), eq(categoryTranslations.locale, locale)))
    .limit(1);

  const translation = translations[0];

  // Merge translation with original (translation takes precedence if exists)
  return {
    ...originalCategory,
    name: translation?.name || originalCategory.name,
    metadataTitle: translation?.metadataTitle || originalCategory.metadataTitle,
    metadataDescription: translation?.metadataDescription || originalCategory.metadataDescription,
    content: translation?.content || originalCategory.content,
  };
}

/**
 * Fetch translated tag fields
 * Falls back to original content if translation not found
 */
export async function getTranslatedTag(
  tagUuid: string,
  locale: LanguageCode,
  originalTag: TranslatedTag,
  db: D1Database,
): Promise<TranslatedTag> {
  // If default locale, return original
  if (locale === DEFAULT_LOCALE) {
    return originalTag;
  }

  const client = createDrizzleClient(db);

  // Fetch translation
  const translations = await client
    .select({
      name: tagTranslations.name,
      metadataTitle: tagTranslations.metadataTitle,
      metadataDescription: tagTranslations.metadataDescription,
      content: tagTranslations.content,
    })
    .from(tagTranslations)
    .where(and(eq(tagTranslations.tagUuid, tagUuid), eq(tagTranslations.locale, locale)))
    .limit(1);

  const translation = translations[0];

  // Merge translation with original
  return {
    ...originalTag,
    name: translation?.name || originalTag.name,
    metadataTitle: translation?.metadataTitle || originalTag.metadataTitle,
    metadataDescription: translation?.metadataDescription || originalTag.metadataDescription,
    content: translation?.content || originalTag.content,
  };
}

/**
 * Fetch translated featured collection fields
 * Falls back to original content if translation not found
 */
export async function getTranslatedFeatured(
  featuredUuid: string,
  locale: LanguageCode,
  originalFeatured: TranslatedFeatured,
  db: D1Database,
): Promise<TranslatedFeatured> {
  // If default locale, return original
  if (locale === DEFAULT_LOCALE) {
    return originalFeatured;
  }

  const client = createDrizzleClient(db);

  // Fetch translation
  const translations = await client
    .select({
      name: featuredTranslations.name,
      metadataTitle: featuredTranslations.metadataTitle,
      metadataDescription: featuredTranslations.metadataDescription,
      content: featuredTranslations.content,
    })
    .from(featuredTranslations)
    .where(and(eq(featuredTranslations.featuredUuid, featuredUuid), eq(featuredTranslations.locale, locale)))
    .limit(1);

  const translation = translations[0];

  // Merge translation with original
  return {
    ...originalFeatured,
    name: translation?.name || originalFeatured.name,
    metadataTitle: translation?.metadataTitle || originalFeatured.metadataTitle,
    metadataDescription: translation?.metadataDescription || originalFeatured.metadataDescription,
    content: translation?.content || originalFeatured.content,
  };
}

/**
 * Fetch translated game introduction
 * Falls back to default locale introduction if translation not found
 *
 * Note: Default locale stored in introductions table, translations in introductionTranslations table
 */
export async function getTranslatedIntroduction(
  gameUuid: string,
  locale: LanguageCode,
  db: D1Database,
): Promise<TranslatedIntroduction | null> {
  const client = createDrizzleClient(db);

  // If default locale, fetch from introductions table
  if (locale === DEFAULT_LOCALE) {
    const results = await client
      .select({
        content: introductions.content,
        metadataTitle: introductions.metadataTitle,
        metadataDescription: introductions.metadataDescription,
      })
      .from(introductions)
      .where(and(eq(introductions.gameUuid, gameUuid), isNull(introductions.deletedAt)))
      .limit(1);

    return results[0] || null;
  }

  // For non-default locales, fetch from introductionTranslations table
  const translations = await client
    .select({
      content: introductionTranslations.content,
      metadataTitle: introductionTranslations.metadataTitle,
      metadataDescription: introductionTranslations.metadataDescription,
    })
    .from(introductionTranslations)
    .where(and(eq(introductionTranslations.gameUuid, gameUuid), eq(introductionTranslations.locale, locale)))
    .limit(1);

  if (translations.length > 0) {
    return translations[0];
  }

  // Fallback to default locale from introductions table
  const defaultResults = await client
    .select({
      content: introductions.content,
      metadataTitle: introductions.metadataTitle,
      metadataDescription: introductions.metadataDescription,
    })
    .from(introductions)
    .where(and(eq(introductions.gameUuid, gameUuid), isNull(introductions.deletedAt)))
    .limit(1);

  return defaultResults[0] || null;
}

/**
 * Get translated game name from nameI18n JSON field
 * Falls back to original name if translation not found
 */
export function getTranslatedGameName(
  originalName: string,
  nameI18n: string | Record<string, string> | null,
  locale: LanguageCode,
): string {
  // If default locale or no translations, return original
  if (locale === DEFAULT_LOCALE || !nameI18n) {
    return originalName;
  }

  try {
    // Handle both string (JSON) and object (already parsed) formats
    const translations = typeof nameI18n === 'string' ? (JSON.parse(nameI18n) as Record<string, string>) : nameI18n;
    return translations[locale] || originalName;
  } catch (error) {
    console.error('Failed to parse nameI18n JSON:', error);
    return originalName;
  }
}

/**
 * Batch fetch translations for multiple categories
 * Optimized for list pages with many items
 */
export async function batchGetTranslatedCategories(
  categories: TranslatedCategory[],
  locale: LanguageCode,
  db: D1Database,
): Promise<TranslatedCategory[]> {
  // If default locale, return original
  if (locale === DEFAULT_LOCALE) {
    return categories;
  }

  if (categories.length === 0) {
    return [];
  }

  const client = createDrizzleClient(db);
  const categoryUuids = categories.map((c) => c.uuid);

  // Fetch all translations in one query
  const translations = await client
    .select({
      categoryUuid: categoryTranslations.categoryUuid,
      name: categoryTranslations.name,
      metadataTitle: categoryTranslations.metadataTitle,
      metadataDescription: categoryTranslations.metadataDescription,
      content: categoryTranslations.content,
    })
    .from(categoryTranslations)
    .where(eq(categoryTranslations.locale, locale));

  // Create a map for quick lookup
  const translationMap = new Map(translations.map((t) => [t.categoryUuid, t]));

  // Merge translations with originals
  return categories.map((category) => {
    const translation = translationMap.get(category.uuid);
    if (!translation) {
      return category;
    }

    return {
      ...category,
      name: translation.name || category.name,
      metadataTitle: translation.metadataTitle || category.metadataTitle,
      metadataDescription: translation.metadataDescription || category.metadataDescription,
      content: translation.content || category.content,
    };
  });
}

/**
 * Batch fetch translations for multiple tags
 */
export async function batchGetTranslatedTags(
  tags: TranslatedTag[],
  locale: LanguageCode,
  db: D1Database,
): Promise<TranslatedTag[]> {
  // If default locale, return original
  if (locale === DEFAULT_LOCALE) {
    return tags;
  }

  if (tags.length === 0) {
    return [];
  }

  const client = createDrizzleClient(db);

  // Fetch all translations in one query
  const translations = await client
    .select({
      tagUuid: tagTranslations.tagUuid,
      name: tagTranslations.name,
      metadataTitle: tagTranslations.metadataTitle,
      metadataDescription: tagTranslations.metadataDescription,
      content: tagTranslations.content,
    })
    .from(tagTranslations)
    .where(eq(tagTranslations.locale, locale));

  // Create a map for quick lookup
  const translationMap = new Map(translations.map((t) => [t.tagUuid, t]));

  // Merge translations with originals
  return tags.map((tag) => {
    const translation = translationMap.get(tag.uuid);
    if (!translation) {
      return tag;
    }

    return {
      ...tag,
      name: translation.name || tag.name,
      metadataTitle: translation.metadataTitle || tag.metadataTitle,
      metadataDescription: translation.metadataDescription || tag.metadataDescription,
      content: translation.content || tag.content,
    };
  });
}
