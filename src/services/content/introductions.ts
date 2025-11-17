/**
 * Introductions Service
 * Database operations for game introductions (detailed descriptions with SEO content)
 */

import { eq, and, isNull, SQL } from 'drizzle-orm';
import { createDrizzleClient } from '@/db/client';
import { introductions, introductionTranslations } from '@/db/schema';
import { nanoid } from 'nanoid';
import { DEFAULT_LOCALE } from '@/i18n/language';
import {
  getTranslation,
  mergeWithTranslation,
  upsertTranslation,
  getAllTranslations,
} from '@/services/i18n/translation';
import type { SeoTranslationFields, WithTranslation, TranslationInput } from '@/services/i18n/types';

export interface CreateIntroductionInput {
  gameUuid: string;
  metadataTitle: string;
  metadataDescription: string;
  content: string;
  translations?: TranslationInput; // Optional translations for other locales
}

export interface UpdateIntroductionInput {
  metadataTitle?: string;
  metadataDescription?: string;
  content?: string;
  translations?: TranslationInput; // Optional translations for other locales
}

/**
 * Create a new introduction
 */
export async function createIntroduction(input: CreateIntroductionInput, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);
  const uuid = nanoid();

  const newIntroduction = {
    uuid,
    gameUuid: input.gameUuid,
    metadataTitle: input.metadataTitle,
    metadataDescription: input.metadataDescription,
    content: input.content,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await client.insert(introductions).values(newIntroduction);

  // Handle translations if provided
  if (input.translations) {
    for (const [locale, translation] of Object.entries(input.translations)) {
      if (locale === DEFAULT_LOCALE) continue; // Skip default locale (stored in main table)

      if (translation.metadataTitle || translation.metadataDescription || translation.content) {
        await upsertTranslation(
          introductionTranslations,
          introductionTranslations.gameUuid,
          introductionTranslations.locale,
          input.gameUuid,
          locale,
          {
            metadataTitle: translation.metadataTitle || '',
            metadataDescription: translation.metadataDescription || '',
            content: translation.content,
          },
          db,
        );
      }
    }
  }

  return newIntroduction;
}

/**
 * Get introduction by UUID
 */
export async function getIntroductionByUuid(uuid: string, db: D1Database, includeDeleted: boolean = false) {
  const client = createDrizzleClient(db);

  const conditions: SQL[] = [eq(introductions.uuid, uuid)];
  if (!includeDeleted) {
    conditions.push(isNull(introductions.deletedAt));
  }

  const result = await client
    .select()
    .from(introductions)
    .where(and(...conditions))
    .limit(1);

  return result[0] || null;
}

/**
 * Get introduction by game UUID (without translation - base data only)
 */
export async function getIntroductionByGameUuid(gameUuid: string, db: D1Database, includeDeleted: boolean = false) {
  const client = createDrizzleClient(db);

  const conditions: SQL[] = [eq(introductions.gameUuid, gameUuid)];
  if (!includeDeleted) {
    conditions.push(isNull(introductions.deletedAt));
  }

  const result = await client
    .select()
    .from(introductions)
    .where(and(...conditions))
    .limit(1);

  return result[0] || null;
}

/**
 * Get introduction by game UUID with translation support
 */
export async function getIntroductionByGameUuidWithLocale(
  gameUuid: string,
  locale: string,
  db: D1Database,
  includeDeleted: boolean = false,
): Promise<WithTranslation<typeof introductions.$inferSelect> | null> {
  const introduction = await getIntroductionByGameUuid(gameUuid, db, includeDeleted);

  if (!introduction) return null;

  // If default locale, return base data directly
  if (locale === DEFAULT_LOCALE) {
    return mergeWithTranslation(introduction, null, locale, ['metadataTitle', 'metadataDescription', 'content']);
  }

  // Query translation
  const translation = await getTranslation<SeoTranslationFields>(
    introductionTranslations,
    introductionTranslations.gameUuid,
    introductionTranslations.locale,
    gameUuid,
    locale,
    db,
  );

  return mergeWithTranslation(introduction, translation, locale, ['metadataTitle', 'metadataDescription', 'content']);
}

/**
 * Get introduction with all translations (for admin panel)
 */
export async function getIntroductionWithAllTranslations(gameUuid: string, db: D1Database) {
  const introduction = await getIntroductionByGameUuid(gameUuid, db);

  if (!introduction) return null;

  const translations = await getAllTranslations(
    introductionTranslations,
    introductionTranslations.gameUuid,
    gameUuid,
    db,
  );

  // Add default locale (from base table)
  translations[DEFAULT_LOCALE] = {
    metadataTitle: introduction.metadataTitle,
    metadataDescription: introduction.metadataDescription,
    content: introduction.content,
  };

  return {
    ...introduction,
    translations,
  };
}

/**
 * Update introduction by UUID
 */
export async function updateIntroduction(uuid: string, input: UpdateIntroductionInput, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  // First get the introduction to find the gameUuid
  const existing = await getIntroductionByUuid(uuid, db);
  if (!existing) {
    throw new Error('Introduction not found');
  }

  // Extract translation-related fields
  const { translations, ...baseUpdate } = input;

  // Update base table (English content)
  if (Object.keys(baseUpdate).length > 0) {
    const updateData: any = {
      ...baseUpdate,
      updatedAt: now,
    };

    await client
      .update(introductions)
      .set(updateData)
      .where(and(eq(introductions.uuid, uuid), isNull(introductions.deletedAt)));
  }

  // Handle translations if provided
  if (translations) {
    for (const [locale, translation] of Object.entries(translations)) {
      if (locale === DEFAULT_LOCALE) {
        // Update default locale in main table
        const defaultUpdate: any = {};
        if (translation.metadataTitle) defaultUpdate.metadataTitle = translation.metadataTitle;
        if (translation.metadataDescription) defaultUpdate.metadataDescription = translation.metadataDescription;
        if (translation.content !== undefined) defaultUpdate.content = translation.content;

        if (Object.keys(defaultUpdate).length > 0) {
          defaultUpdate.updatedAt = now;
          await client
            .update(introductions)
            .set(defaultUpdate)
            .where(and(eq(introductions.uuid, uuid), isNull(introductions.deletedAt)));
        }
      } else {
        // Update translation table (using gameUuid as the key)
        await upsertTranslation(
          introductionTranslations,
          introductionTranslations.gameUuid,
          introductionTranslations.locale,
          existing.gameUuid,
          locale,
          {
            metadataTitle: translation.metadataTitle || '',
            metadataDescription: translation.metadataDescription || '',
            content: translation.content,
          },
          db,
        );
      }
    }
  }

  return getIntroductionByUuid(uuid, db);
}

/**
 * Update introduction by game UUID
 */
export async function updateIntroductionByGameUuid(gameUuid: string, input: UpdateIntroductionInput, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  // Extract translation-related fields
  const { translations, ...baseUpdate } = input;

  // Update base table (English content)
  if (Object.keys(baseUpdate).length > 0) {
    const updateData: any = {
      ...baseUpdate,
      updatedAt: now,
    };

    await client
      .update(introductions)
      .set(updateData)
      .where(and(eq(introductions.gameUuid, gameUuid), isNull(introductions.deletedAt)));
  }

  // Handle translations if provided
  if (translations) {
    for (const [locale, translation] of Object.entries(translations)) {
      if (locale === DEFAULT_LOCALE) {
        // Update default locale in main table
        const defaultUpdate: any = {};
        if (translation.metadataTitle) defaultUpdate.metadataTitle = translation.metadataTitle;
        if (translation.metadataDescription) defaultUpdate.metadataDescription = translation.metadataDescription;
        if (translation.content !== undefined) defaultUpdate.content = translation.content;

        if (Object.keys(defaultUpdate).length > 0) {
          defaultUpdate.updatedAt = now;
          await client
            .update(introductions)
            .set(defaultUpdate)
            .where(and(eq(introductions.gameUuid, gameUuid), isNull(introductions.deletedAt)));
        }
      } else {
        // Update translation table (using gameUuid as the key)
        await upsertTranslation(
          introductionTranslations,
          introductionTranslations.gameUuid,
          introductionTranslations.locale,
          gameUuid,
          locale,
          {
            metadataTitle: translation.metadataTitle || '',
            metadataDescription: translation.metadataDescription || '',
            content: translation.content,
          },
          db,
        );
      }
    }
  }

  return getIntroductionByGameUuid(gameUuid, db);
}

/**
 * Upsert introduction (create if not exists, update if exists)
 */
export async function upsertIntroduction(input: CreateIntroductionInput, db: D1Database) {
  const existing = await getIntroductionByGameUuid(input.gameUuid, db);

  if (existing) {
    return updateIntroduction(existing.uuid, input, db);
  } else {
    return createIntroduction(input, db);
  }
}

/**
 * Soft delete introduction by UUID
 */
export async function deleteIntroduction(uuid: string, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  await client
    .update(introductions)
    .set({ deletedAt: now })
    .where(and(eq(introductions.uuid, uuid), isNull(introductions.deletedAt)));

  return true;
}

/**
 * Soft delete introduction by game UUID
 */
export async function deleteIntroductionByGameUuid(gameUuid: string, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  await client
    .update(introductions)
    .set({ deletedAt: now })
    .where(and(eq(introductions.gameUuid, gameUuid), isNull(introductions.deletedAt)));

  return true;
}

/**
 * Check if game has introduction
 */
export async function gameHasIntroduction(gameUuid: string, db: D1Database) {
  const intro = await getIntroductionByGameUuid(gameUuid, db);
  return !!intro;
}
