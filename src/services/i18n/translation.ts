/**
 * I18n Translation Service
 * Common utilities for handling translations
 */

import { eq, and, SQL } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { createDrizzleClient } from '@/db/client';
import { DEFAULT_LOCALE } from '@/i18n/language';
import type { SeoTranslationFields, TranslationMetadata } from './types';

/**
 * Calculate fallback fields and translation metadata
 */
export function calculateTranslationMetadata(
  translation: Partial<SeoTranslationFields> | null,
  requiredFields: (keyof SeoTranslationFields)[],
): { fallbackFields: string[]; metadata: TranslationMetadata } {
  if (!translation) {
    return {
      fallbackFields: requiredFields as string[],
      metadata: {
        available: false,
        partial: false,
        completeness: 0,
      },
    };
  }

  const fallbackFields = requiredFields.filter((field) => !translation[field]);

  return {
    fallbackFields: fallbackFields as string[],
    metadata: {
      available: true,
      partial: fallbackFields.length > 0,
      completeness: 1 - fallbackFields.length / requiredFields.length,
    },
  };
}

/**
 * Generic translation query helper
 * Queries translation from a translation table
 */
export async function getTranslation<T extends Record<string, any>>(
  translationTable: SQLiteTable,
  entityUuidField: any,
  localeField: any,
  entityUuid: string,
  locale: string,
  db: D1Database,
): Promise<T | null> {
  const client = createDrizzleClient(db);

  const result = await client
    .select()
    .from(translationTable)
    .where(and(eq(entityUuidField, entityUuid), eq(localeField, locale)))
    .limit(1);

  return (result[0] as T) || null;
}

/**
 * Merge base entity with translation
 * Implements field-level fallback
 */
export function mergeWithTranslation<T extends Record<string, any>>(
  baseEntity: T,
  translation: Partial<SeoTranslationFields> | null,
  locale: string,
  translationFields: (keyof SeoTranslationFields)[],
): T & { _locale: string; _fallback: boolean; _fallbackFields: string[]; _translation: TranslationMetadata } {
  if (locale === DEFAULT_LOCALE) {
    return {
      ...baseEntity,
      _locale: locale,
      _fallback: false,
      _fallbackFields: [],
      _translation: {
        available: true,
        partial: false,
        completeness: 1,
      },
    };
  }

  const { fallbackFields, metadata } = calculateTranslationMetadata(translation, translationFields);

  const merged: any = { ...baseEntity };

  // Apply translations or fallback to base fields
  for (const field of translationFields) {
    if (translation && translation[field]) {
      merged[field] = translation[field];
    }
    // else: keep the base field value (fallback)
  }

  return {
    ...merged,
    _locale: locale,
    _fallback: !translation,
    _fallbackFields: fallbackFields,
    _translation: metadata,
  };
}

/**
 * Upsert translation record
 */
export async function upsertTranslation(
  translationTable: SQLiteTable,
  entityUuidField: any,
  localeField: any,
  entityUuid: string,
  locale: string,
  translationData: SeoTranslationFields,
  db: D1Database,
): Promise<void> {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  // Check if all fields are empty
  const isEmpty =
    !translationData.name &&
    !translationData.metadataTitle &&
    !translationData.metadataDescription &&
    !translationData.content;

  if (isEmpty) {
    // Delete translation if all fields are empty (fallback to default)
    await client.delete(translationTable).where(and(eq(entityUuidField, entityUuid), eq(localeField, locale)));
    return;
  }

  // Check if translation exists
  const existing = await getTranslation(translationTable, entityUuidField, localeField, entityUuid, locale, db);

  if (existing) {
    // Update existing translation
    await client
      .update(translationTable)
      .set({
        ...translationData,
        updatedAt: now,
      })
      .where(and(eq(entityUuidField, entityUuid), eq(localeField, locale)));
  } else {
    // Insert new translation
    await client.insert(translationTable).values({
      [entityUuidField.name]: entityUuid,
      [localeField.name]: locale,
      ...translationData,
      createdAt: now,
      updatedAt: now,
    });
  }
}

/**
 * Delete all translations for an entity
 */
export async function deleteTranslations(
  translationTable: SQLiteTable,
  entityUuidField: any,
  entityUuid: string,
  db: D1Database,
): Promise<void> {
  const client = createDrizzleClient(db);
  await client.delete(translationTable).where(eq(entityUuidField, entityUuid));
}

/**
 * Get all translations for an entity (admin view)
 */
export async function getAllTranslations<T extends Record<string, any>>(
  translationTable: SQLiteTable,
  entityUuidField: any,
  entityUuid: string,
  db: D1Database,
): Promise<Record<string, SeoTranslationFields>> {
  const client = createDrizzleClient(db);

  const translations = await client.select().from(translationTable).where(eq(entityUuidField, entityUuid));

  const result: Record<string, SeoTranslationFields> = {};

  for (const translation of translations) {
    result[(translation as any).locale] = {
      name: (translation as any).name,
      metadataTitle: (translation as any).metadataTitle,
      metadataDescription: (translation as any).metadataDescription,
      content: (translation as any).content,
    };
  }

  return result;
}
