/**
 * Language Configuration Service
 * CRUD operations for language_config table
 */

import { eq, and, isNull, desc, asc } from 'drizzle-orm';
import { createDrizzleClient } from '@/db/client';
import { languageConfig } from '@/db/schema';
import type { LanguageRecord } from '@/types/services/language';

export interface LanguageConfigData {
  code: string;
  nativeName: string;
  chineseName: string;
  englishName: string;
  sortOrder?: number;
}

export interface UpdateLanguageConfigData {
  nativeName?: string;
  chineseName?: string;
  englishName?: string;
  enabled?: boolean;
  sortOrder?: number;
}

/**
 * Get all language configurations
 * Returns enabled languages only by default, or all if includeDisabled is true
 */
export async function getAllLanguages(includeDisabled: boolean = false, db: D1Database) {
  const client = createDrizzleClient(db);

  const conditions = includeDisabled ? [] : [eq(languageConfig.enabled, true)];

  const results = await client
    .select({
      id: languageConfig.id,
      code: languageConfig.code,
      nativeName: languageConfig.nativeName,
      chineseName: languageConfig.chineseName,
      englishName: languageConfig.englishName,
      isDefault: languageConfig.isDefault,
      enabled: languageConfig.enabled,
      sortOrder: languageConfig.sortOrder,
      createdAt: languageConfig.createdAt,
      updatedAt: languageConfig.updatedAt,
    })
    .from(languageConfig)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(languageConfig.sortOrder));

  return results;
}

/**
 * Get language configuration by code
 */
export async function getLanguageByCode(code: string, db: D1Database) {
  const client = createDrizzleClient(db);

  const results = await client
    .select({
      id: languageConfig.id,
      code: languageConfig.code,
      nativeName: languageConfig.nativeName,
      chineseName: languageConfig.chineseName,
      englishName: languageConfig.englishName,
      isDefault: languageConfig.isDefault,
      enabled: languageConfig.enabled,
      sortOrder: languageConfig.sortOrder,
      createdAt: languageConfig.createdAt,
      updatedAt: languageConfig.updatedAt,
    })
    .from(languageConfig)
    .where(eq(languageConfig.code, code))
    .limit(1);

  return results[0] as LanguageRecord | null;
}

/**
 * Check if language code exists
 */
export async function languageCodeExists(code: string, db: D1Database): Promise<boolean> {
  const language = await getLanguageByCode(code, db);
  return language !== null;
}

/**
 * Create new language configuration
 * If a disabled language with the same code exists, it will be restored and updated
 */
export async function createLanguage(data: LanguageConfigData, db: D1Database) {
  const client = createDrizzleClient(db);

  // Check if language already exists (including disabled ones)
  const existing = await getLanguageByCode(data.code, db);

  if (existing) {
    // If language exists and is enabled, throw error
    if (existing.enabled) {
      throw new Error('Language code already exists');
    }

    // If language exists but is disabled, restore and update it
    const now = Math.floor(Date.now() / 1000);

    // Get max sort order
    const languages = await getAllLanguages(true, db);
    const maxSortOrder = languages.reduce((max, lang) => Math.max(max, lang.sortOrder || 0), 0);

    await client
      .update(languageConfig)
      .set({
        nativeName: data.nativeName,
        chineseName: data.chineseName,
        englishName: data.englishName,
        enabled: true,
        sortOrder: data.sortOrder !== undefined ? data.sortOrder : maxSortOrder + 1,
        updatedAt: now,
      })
      .where(eq(languageConfig.code, data.code));

    return await getLanguageByCode(data.code, db);
  }

  // Language doesn't exist, create new one
  // Get max sort order
  const languages = await getAllLanguages(true, db);
  const maxSortOrder = languages.reduce((max, lang) => Math.max(max, lang.sortOrder || 0), 0);

  const now = Math.floor(Date.now() / 1000);

  await client.insert(languageConfig).values({
    code: data.code,
    nativeName: data.nativeName,
    chineseName: data.chineseName,
    englishName: data.englishName,
    isDefault: false, // New languages are never default
    enabled: true,
    sortOrder: data.sortOrder !== undefined ? data.sortOrder : maxSortOrder + 1,
    createdAt: now,
    updatedAt: now,
  });

  return await getLanguageByCode(data.code, db);
}

/**
 * Update language configuration
 */
export async function updateLanguage(code: string, data: UpdateLanguageConfigData, db: D1Database) {
  const client = createDrizzleClient(db);

  // Check if language exists
  const existing = await getLanguageByCode(code, db);
  if (!existing) {
    throw new Error('Language not found');
  }

  // Cannot modify default language's enabled status
  if (existing.isDefault && data.enabled === false) {
    throw new Error('Cannot disable default language');
  }

  const now = Math.floor(Date.now() / 1000);

  const updateData: any = {
    updatedAt: now,
  };

  if (data.nativeName !== undefined) updateData.nativeName = data.nativeName;
  if (data.chineseName !== undefined) updateData.chineseName = data.chineseName;
  if (data.englishName !== undefined) updateData.englishName = data.englishName;
  if (data.enabled !== undefined) updateData.enabled = data.enabled;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

  await client.update(languageConfig).set(updateData).where(eq(languageConfig.code, code));

  return await getLanguageByCode(code, db);
}

/**
 * Delete language configuration (soft delete by disabling)
 */
export async function deleteLanguage(code: string, db: D1Database) {
  const client = createDrizzleClient(db);

  // Check if language exists
  const existing = await getLanguageByCode(code, db);
  if (!existing) {
    throw new Error('Language not found');
  }

  // Cannot delete default language
  if (existing.isDefault) {
    throw new Error('Cannot delete default language');
  }

  const now = Math.floor(Date.now() / 1000);

  // Soft delete by setting enabled to false
  await client
    .update(languageConfig)
    .set({
      enabled: false,
      updatedAt: now,
    })
    .where(eq(languageConfig.code, code));

  return true;
}

/**
 * Get enabled non-default languages
 */
export async function getNonDefaultLanguages(db: D1Database) {
  const client = createDrizzleClient(db);

  const results = await client
    .select({
      id: languageConfig.id,
      code: languageConfig.code,
      nativeName: languageConfig.nativeName,
      chineseName: languageConfig.chineseName,
      englishName: languageConfig.englishName,
      isDefault: languageConfig.isDefault,
      enabled: languageConfig.enabled,
      sortOrder: languageConfig.sortOrder,
      createdAt: languageConfig.createdAt,
      updatedAt: languageConfig.updatedAt,
    })
    .from(languageConfig)
    .where(and(eq(languageConfig.enabled, true), eq(languageConfig.isDefault, false)))
    .orderBy(asc(languageConfig.sortOrder));

  return results;
}

/**
 * Get default language
 */
export async function getDefaultLanguage(db: D1Database) {
  const client = createDrizzleClient(db);

  const results = await client
    .select({
      id: languageConfig.id,
      code: languageConfig.code,
      nativeName: languageConfig.nativeName,
      chineseName: languageConfig.chineseName,
      englishName: languageConfig.englishName,
      isDefault: languageConfig.isDefault,
      enabled: languageConfig.enabled,
      sortOrder: languageConfig.sortOrder,
      createdAt: languageConfig.createdAt,
      updatedAt: languageConfig.updatedAt,
    })
    .from(languageConfig)
    .where(eq(languageConfig.isDefault, true))
    .limit(1);

  return results[0] || null;
}
