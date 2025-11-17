/**
 * Featured Collections Service
 * Database operations for featured game collections (Hot, New, All Games)
 */

import { eq, desc, asc, and, or, isNull, sql, SQL } from 'drizzle-orm';
import { createDrizzleClient } from '@/db/client';
import { featured, featuredTranslations } from '@/db/schema';
import { nanoid } from 'nanoid';
import { DEFAULT_LOCALE } from '@/i18n/language';
import {
  getTranslation,
  mergeWithTranslation,
  upsertTranslation,
  getAllTranslations,
  deleteTranslations,
} from '@/services/i18n/translation';
import type { SeoTranslationFields, WithTranslation, TranslationInput } from '@/services/i18n/types';

export interface CreateFeaturedInput {
  name: string;
  slug: string;
  metadataTitle: string;
  metadataDescription: string;
  content?: string;
  translations?: TranslationInput; // Optional translations for other locales
}

export interface UpdateFeaturedInput {
  name?: string;
  slug?: string;
  metadataTitle?: string;
  metadataDescription?: string;
  content?: string;
  translations?: TranslationInput; // Optional translations for other locales
}

export interface ListFeaturedOptions {
  search?: string;
  orderBy?: 'created_at' | 'name';
  orderDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Create a new featured collection
 */
export async function createFeatured(input: CreateFeaturedInput, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);
  const uuid = nanoid();

  const newFeatured = {
    uuid,
    name: input.name,
    slug: input.slug,
    metadataTitle: input.metadataTitle,
    metadataDescription: input.metadataDescription,
    content: input.content || null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await client.insert(featured).values(newFeatured);

  // Handle translations if provided
  if (input.translations) {
    for (const [locale, translation] of Object.entries(input.translations)) {
      if (locale === DEFAULT_LOCALE) continue; // Skip default locale (stored in main table)

      if (translation.name || translation.metadataTitle || translation.metadataDescription || translation.content) {
        await upsertTranslation(
          featuredTranslations,
          featuredTranslations.featuredUuid,
          featuredTranslations.locale,
          uuid,
          locale,
          {
            name: translation.name || input.name,
            metadataTitle: translation.metadataTitle || '',
            metadataDescription: translation.metadataDescription || '',
            content: translation.content,
          },
          db,
        );
      }
    }
  }

  return newFeatured;
}

/**
 * Get featured collection by UUID
 */
export async function getFeaturedByUuid(uuid: string, db: D1Database, includeDeleted: boolean = false) {
  const client = createDrizzleClient(db);

  const conditions: SQL[] = [eq(featured.uuid, uuid)];
  if (!includeDeleted) {
    conditions.push(isNull(featured.deletedAt));
  }

  const result = await client
    .select()
    .from(featured)
    .where(and(...conditions))
    .limit(1);

  return result[0] || null;
}

/**
 * Get featured collection by UUID with translation support
 */
export async function getFeaturedByUuidWithLocale(
  uuid: string,
  locale: string,
  db: D1Database,
  includeDeleted: boolean = false,
): Promise<WithTranslation<typeof featured.$inferSelect> | null> {
  const featuredCollection = await getFeaturedByUuid(uuid, db, includeDeleted);

  if (!featuredCollection) return null;

  // If default locale, return base data directly
  if (locale === DEFAULT_LOCALE) {
    return mergeWithTranslation(featuredCollection, null, locale, [
      'name',
      'metadataTitle',
      'metadataDescription',
      'content',
    ]);
  }

  // Query translation
  const translation = await getTranslation<SeoTranslationFields>(
    featuredTranslations,
    featuredTranslations.featuredUuid,
    featuredTranslations.locale,
    uuid,
    locale,
    db,
  );

  return mergeWithTranslation(featuredCollection, translation, locale, [
    'name',
    'metadataTitle',
    'metadataDescription',
    'content',
  ]);
}

/**
 * Get featured collection by slug (without translation - base data only)
 */
export async function getFeaturedBySlug(slug: string, db: D1Database, includeDeleted: boolean = false) {
  const client = createDrizzleClient(db);

  const conditions: SQL[] = [eq(featured.slug, slug)];
  if (!includeDeleted) {
    conditions.push(isNull(featured.deletedAt));
  }

  const result = await client
    .select()
    .from(featured)
    .where(and(...conditions))
    .limit(1);

  return result[0] || null;
}

/**
 * Get featured collection by slug with translation support
 */
export async function getFeaturedBySlugWithLocale(
  slug: string,
  locale: string,
  db: D1Database,
  includeDeleted: boolean = false,
): Promise<WithTranslation<typeof featured.$inferSelect> | null> {
  const featuredCollection = await getFeaturedBySlug(slug, db, includeDeleted);

  if (!featuredCollection) return null;

  // If default locale, return base data directly
  if (locale === DEFAULT_LOCALE) {
    return mergeWithTranslation(featuredCollection, null, locale, [
      'name',
      'metadataTitle',
      'metadataDescription',
      'content',
    ]);
  }

  // Query translation
  const translation = await getTranslation<SeoTranslationFields>(
    featuredTranslations,
    featuredTranslations.featuredUuid,
    featuredTranslations.locale,
    featuredCollection.uuid,
    locale,
    db,
  );

  return mergeWithTranslation(featuredCollection, translation, locale, [
    'name',
    'metadataTitle',
    'metadataDescription',
    'content',
  ]);
}

/**
 * List featured collections with pagination and filtering (includes all translations)
 */
export async function listFeatured(options: ListFeaturedOptions, db: D1Database) {
  const client = createDrizzleClient(db);

  const { search, orderBy = 'name', orderDirection = 'asc', page = 1, pageSize = 50 } = options;

  // Build where conditions
  const conditions: SQL[] = [isNull(featured.deletedAt)];

  if (search) {
    conditions.push(or(sql`${featured.name} LIKE ${`%${search}%`}`, sql`${featured.slug} LIKE ${`%${search}%`}`)!);
  }

  // Build order by
  let orderByClause;
  const orderFn = orderDirection === 'asc' ? asc : desc;

  switch (orderBy) {
    case 'name':
      orderByClause = orderFn(featured.name);
      break;
    default:
      orderByClause = orderFn(featured.createdAt);
  }

  // Get total count
  const countResult = await client
    .select({ count: sql<number>`count(*)` })
    .from(featured)
    .where(and(...conditions));

  const total = countResult[0]?.count ?? 0;

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const results = await client
    .select()
    .from(featured)
    .where(and(...conditions))
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset(offset);

  // Fetch translations for each featured collection (non-default locales only)
  const featuredWithTranslations = await Promise.all(
    results.map(async (item) => {
      const translations = await getAllTranslations(
        featuredTranslations,
        featuredTranslations.featuredUuid,
        item.uuid,
        db,
      );

      // Don't include default locale in translations - it's already in the base fields
      // (metadataTitle, metadataDescription, content)

      return {
        ...item,
        translations,
      };
    }),
  );

  return {
    data: featuredWithTranslations,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get all featured collections (no pagination, for dropdowns)
 */
export async function getAllFeatured(db: D1Database) {
  const client = createDrizzleClient(db);

  const results = await client.select().from(featured).where(isNull(featured.deletedAt)).orderBy(asc(featured.name));

  return results;
}

/**
 * Get featured collection with all translations (for admin panel)
 */
export async function getFeaturedWithAllTranslations(uuid: string, db: D1Database) {
  const featuredCollection = await getFeaturedByUuid(uuid, db);

  if (!featuredCollection) return null;

  const translations = await getAllTranslations(featuredTranslations, featuredTranslations.featuredUuid, uuid, db);

  // Add default locale (from base table)
  translations[DEFAULT_LOCALE] = {
    name: featuredCollection.name,
    metadataTitle: featuredCollection.metadataTitle,
    metadataDescription: featuredCollection.metadataDescription,
    content: featuredCollection.content || undefined,
  };

  return {
    ...featuredCollection,
    translations,
  };
}

/**
 * Update featured collection by UUID
 */
export async function updateFeatured(uuid: string, input: UpdateFeaturedInput, db: D1Database) {
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
      .update(featured)
      .set(updateData)
      .where(and(eq(featured.uuid, uuid), isNull(featured.deletedAt)));
  }

  // Handle translations if provided
  if (translations) {
    for (const [locale, translation] of Object.entries(translations)) {
      if (locale === DEFAULT_LOCALE) {
        // Update default locale in main table
        const defaultUpdate: any = {};
        if (translation.name) defaultUpdate.name = translation.name;
        if (translation.metadataTitle) defaultUpdate.metadataTitle = translation.metadataTitle;
        if (translation.metadataDescription) defaultUpdate.metadataDescription = translation.metadataDescription;
        if (translation.content !== undefined) defaultUpdate.content = translation.content;

        if (Object.keys(defaultUpdate).length > 0) {
          defaultUpdate.updatedAt = now;
          await client
            .update(featured)
            .set(defaultUpdate)
            .where(and(eq(featured.uuid, uuid), isNull(featured.deletedAt)));
        }
      } else {
        // Update translation table
        await upsertTranslation(
          featuredTranslations,
          featuredTranslations.featuredUuid,
          featuredTranslations.locale,
          uuid,
          locale,
          {
            name: translation.name || '',
            metadataTitle: translation.metadataTitle || '',
            metadataDescription: translation.metadataDescription || '',
            content: translation.content,
          },
          db,
        );
      }
    }
  }

  return getFeaturedByUuid(uuid, db);
}

/**
 * Soft delete featured collection by UUID
 */
export async function deleteFeatured(uuid: string, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  await client
    .update(featured)
    .set({ deletedAt: now })
    .where(and(eq(featured.uuid, uuid), isNull(featured.deletedAt)));

  // Note: We don't delete translations here, they remain for potential restoration
  // If you want to delete translations, uncomment the line below:
  // await deleteTranslations(featuredTranslations, featuredTranslations.featuredUuid, uuid, db);

  return true;
}

/**
 * Check if slug exists (for uniqueness validation)
 */
export async function featuredSlugExists(slug: string, excludeUuid?: string, db?: D1Database) {
  if (!db) return false;

  const client = createDrizzleClient(db);

  const conditions: SQL[] = [eq(featured.slug, slug), isNull(featured.deletedAt)];

  if (excludeUuid) {
    conditions.push(sql`${featured.uuid} != ${excludeUuid}`);
  }

  const result = await client
    .select({ count: sql<number>`count(*)` })
    .from(featured)
    .where(and(...conditions));

  return (result[0]?.count ?? 0) > 0;
}

// ============================================
// Batch Import Functionality
// ============================================

export type ImportStrategy = 'upsert' | 'skip_existing' | 'overwrite';

export interface FeaturedImportData {
  name: string;
  slug: string;
  content?: string;
  metaTitle: string;
  metaDescription: string;
}

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  items: Array<{
    slug: string;
    name: string;
    status: 'created' | 'updated' | 'skipped' | 'failed';
    error?: string;
  }>;
}

/**
 * Import multiple featured collections
 * Supports upsert, skip_existing, and overwrite strategies
 * Automatically restores soft-deleted records
 */
export async function importFeatured(
  items: FeaturedImportData[],
  strategy: ImportStrategy = 'upsert',
  db: D1Database,
): Promise<ImportResult> {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  const result: ImportResult = {
    total: items.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    items: [],
  };

  for (const item of items) {
    try {
      // Validate required fields
      if (!item.slug || !item.name) {
        result.failed++;
        result.items.push({
          slug: item.slug || 'unknown',
          name: item.name || 'unknown',
          status: 'failed',
          error: 'Missing required fields: slug and name',
        });
        continue;
      }

      // Check if featured collection exists (including soft-deleted)
      const existing = await client.select().from(featured).where(eq(featured.slug, item.slug)).limit(1);

      if (existing.length > 0) {
        const isDeleted = existing[0].deletedAt !== null;

        if (isDeleted) {
          // Restore and update the soft-deleted record
          await client
            .update(featured)
            .set({
              name: item.name,
              metadataTitle: item.metaTitle,
              metadataDescription: item.metaDescription,
              content: item.content || null,
              deletedAt: null,
              updatedAt: now,
            })
            .where(eq(featured.uuid, existing[0].uuid));

          result.updated++;
          result.items.push({
            slug: item.slug,
            name: item.name,
            status: 'updated',
          });
        } else {
          // Handle active record based on strategy
          if (strategy === 'skip_existing') {
            result.skipped++;
            result.items.push({
              slug: item.slug,
              name: item.name,
              status: 'skipped',
            });
          } else if (strategy === 'upsert' || strategy === 'overwrite') {
            await client
              .update(featured)
              .set({
                name: item.name,
                metadataTitle: item.metaTitle,
                metadataDescription: item.metaDescription,
                content: item.content || null,
                updatedAt: now,
              })
              .where(eq(featured.uuid, existing[0].uuid));

            result.updated++;
            result.items.push({
              slug: item.slug,
              name: item.name,
              status: 'updated',
            });
          }
        }
      } else {
        // Create new featured collection
        const newFeatured = {
          uuid: nanoid(),
          name: item.name,
          slug: item.slug,
          metadataTitle: item.metaTitle,
          metadataDescription: item.metaDescription,
          content: item.content || null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };

        await client.insert(featured).values(newFeatured);

        result.created++;
        result.items.push({
          slug: item.slug,
          name: item.name,
          status: 'created',
        });
      }
    } catch (error) {
      result.failed++;
      result.items.push({
        slug: item.slug,
        name: item.name,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}
