/**
 * Tags Service
 * Database operations for game tags
 */

import { eq, desc, asc, and, or, isNull, sql, SQL } from 'drizzle-orm';
import { createDrizzleClient } from '@/db/client';
import { tags, tagTranslations } from '@/db/schema';
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

export interface CreateTagInput {
  name: string;
  slug: string;
  metadataTitle: string;
  metadataDescription: string;
  content?: string;
  translations?: TranslationInput; // Optional translations for other locales
}

export interface UpdateTagInput {
  name?: string;
  slug?: string;
  metadataTitle?: string;
  metadataDescription?: string;
  content?: string;
  translations?: TranslationInput; // Optional translations for other locales
}

export interface ListTagsOptions {
  search?: string;
  orderBy?: 'created_at' | 'name';
  orderDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Create a new tag
 */
export async function createTag(input: CreateTagInput, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);
  const uuid = nanoid();

  const newTag = {
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

  await client.insert(tags).values(newTag);

  // Handle translations if provided
  if (input.translations) {
    for (const [locale, translation] of Object.entries(input.translations)) {
      if (locale === DEFAULT_LOCALE) continue; // Skip default locale (stored in main table)

      if (translation.name || translation.metadataTitle || translation.metadataDescription || translation.content) {
        await upsertTranslation(
          tagTranslations,
          tagTranslations.tagUuid,
          tagTranslations.locale,
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

  return newTag;
}

/**
 * Get tag by UUID (without translation - base data only)
 */
export async function getTagByUuid(uuid: string, db: D1Database, includeDeleted: boolean = false) {
  const client = createDrizzleClient(db);

  const conditions: SQL[] = [eq(tags.uuid, uuid)];
  if (!includeDeleted) {
    conditions.push(isNull(tags.deletedAt));
  }

  const result = await client
    .select()
    .from(tags)
    .where(and(...conditions))
    .limit(1);

  return result[0] || null;
}

/**
 * Get tag by UUID with translation support
 */
export async function getTagByUuidWithLocale(
  uuid: string,
  locale: string,
  db: D1Database,
  includeDeleted: boolean = false,
): Promise<WithTranslation<typeof tags.$inferSelect> | null> {
  const tag = await getTagByUuid(uuid, db, includeDeleted);

  if (!tag) return null;

  // If default locale, return base data directly
  if (locale === DEFAULT_LOCALE) {
    return mergeWithTranslation(tag, null, locale, ['name', 'metadataTitle', 'metadataDescription', 'content']);
  }

  // Query translation
  const translation = await getTranslation<SeoTranslationFields>(
    tagTranslations,
    tagTranslations.tagUuid,
    tagTranslations.locale,
    uuid,
    locale,
    db,
  );

  return mergeWithTranslation(tag, translation, locale, ['name', 'metadataTitle', 'metadataDescription', 'content']);
}

/**
 * Get tag by slug (without translation - base data only)
 */
export async function getTagBySlug(slug: string, db: D1Database, includeDeleted: boolean = false) {
  const client = createDrizzleClient(db);

  const conditions: SQL[] = [eq(tags.slug, slug)];
  if (!includeDeleted) {
    conditions.push(isNull(tags.deletedAt));
  }

  const result = await client
    .select()
    .from(tags)
    .where(and(...conditions))
    .limit(1);

  return result[0] || null;
}

/**
 * Get tag by slug with translation support
 */
export async function getTagBySlugWithLocale(
  slug: string,
  locale: string,
  db: D1Database,
  includeDeleted: boolean = false,
): Promise<WithTranslation<typeof tags.$inferSelect> | null> {
  const tag = await getTagBySlug(slug, db, includeDeleted);

  if (!tag) return null;

  // If default locale, return base data directly
  if (locale === DEFAULT_LOCALE) {
    return mergeWithTranslation(tag, null, locale, ['name', 'metadataTitle', 'metadataDescription', 'content']);
  }

  // Query translation
  const translation = await getTranslation<SeoTranslationFields>(
    tagTranslations,
    tagTranslations.tagUuid,
    tagTranslations.locale,
    tag.uuid,
    locale,
    db,
  );

  return mergeWithTranslation(tag, translation, locale, ['name', 'metadataTitle', 'metadataDescription', 'content']);
}

/**
 * List tags with pagination and filtering (includes all translations)
 */
export async function listTags(options: ListTagsOptions, db: D1Database) {
  const client = createDrizzleClient(db);

  const { search, orderBy = 'name', orderDirection = 'asc', page = 1, pageSize = 50 } = options;

  // Build where conditions
  const conditions: SQL[] = [isNull(tags.deletedAt)];

  if (search) {
    conditions.push(or(sql`${tags.name} LIKE ${`%${search}%`}`, sql`${tags.slug} LIKE ${`%${search}%`}`)!);
  }

  // Build order by
  let orderByClause;
  const orderFn = orderDirection === 'asc' ? asc : desc;

  switch (orderBy) {
    case 'name':
      orderByClause = orderFn(tags.name);
      break;
    default:
      orderByClause = orderFn(tags.createdAt);
  }

  // Get total count
  const countResult = await client
    .select({ count: sql<number>`count(*)` })
    .from(tags)
    .where(and(...conditions));

  const total = countResult[0]?.count ?? 0;

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const results = await client
    .select()
    .from(tags)
    .where(and(...conditions))
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset(offset);

  // Fetch translations for each tag (non-default locales only)
  const tagsWithTranslations = await Promise.all(
    results.map(async (tag) => {
      const translations = await getAllTranslations(tagTranslations, tagTranslations.tagUuid, tag.uuid, db);

      // Don't include default locale in translations - it's already in the base fields
      // (metadataTitle, metadataDescription, content)

      return {
        ...tag,
        translations,
      };
    }),
  );

  return {
    data: tagsWithTranslations,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get all tags (no pagination, for dropdowns)
 */
export async function getAllTags(db: D1Database) {
  const client = createDrizzleClient(db);

  const results = await client.select().from(tags).where(isNull(tags.deletedAt)).orderBy(asc(tags.name));

  return results;
}

/**
 * Get tag with all translations (for admin panel)
 */
export async function getTagWithAllTranslations(uuid: string, db: D1Database) {
  const tag = await getTagByUuid(uuid, db);

  if (!tag) return null;

  const translations = await getAllTranslations(tagTranslations, tagTranslations.tagUuid, uuid, db);

  // Add default locale (from base table)
  translations[DEFAULT_LOCALE] = {
    name: tag.name,
    metadataTitle: tag.metadataTitle,
    metadataDescription: tag.metadataDescription,
    content: tag.content || undefined,
  };

  return {
    ...tag,
    translations,
  };
}

/**
 * Update tag by UUID
 */
export async function updateTag(uuid: string, input: UpdateTagInput, db: D1Database) {
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
      .update(tags)
      .set(updateData)
      .where(and(eq(tags.uuid, uuid), isNull(tags.deletedAt)));
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
            .update(tags)
            .set(defaultUpdate)
            .where(and(eq(tags.uuid, uuid), isNull(tags.deletedAt)));
        }
      } else {
        // Update translation table
        await upsertTranslation(
          tagTranslations,
          tagTranslations.tagUuid,
          tagTranslations.locale,
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

  return getTagByUuid(uuid, db);
}

/**
 * Soft delete tag by UUID
 */
export async function deleteTag(uuid: string, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  await client
    .update(tags)
    .set({ deletedAt: now })
    .where(and(eq(tags.uuid, uuid), isNull(tags.deletedAt)));

  // Note: We don't delete translations here, they remain for potential restoration
  // If you want to delete translations, uncomment the line below:
  // await deleteTranslations(tagTranslations, tagTranslations.tagUuid, uuid, db);

  return true;
}

/**
 * Check if slug exists (for uniqueness validation)
 */
export async function tagSlugExists(slug: string, excludeUuid?: string, db?: D1Database) {
  if (!db) return false;

  const client = createDrizzleClient(db);

  const conditions: SQL[] = [eq(tags.slug, slug), isNull(tags.deletedAt)];

  if (excludeUuid) {
    conditions.push(sql`${tags.uuid} != ${excludeUuid}`);
  }

  const result = await client
    .select({ count: sql<number>`count(*)` })
    .from(tags)
    .where(and(...conditions));

  return (result[0]?.count ?? 0) > 0;
}

// ============================================================================
// Batch Import Functions
// ============================================================================

/**
 * Import strategy type
 */
export type ImportStrategy = 'upsert' | 'skip_existing' | 'overwrite';

/**
 * Tag data for import
 */
export interface TagImportData {
  name: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
}

/**
 * Tag import result
 */
export interface TagImportResult {
  name: string;
  slug: string;
  status: 'created' | 'updated' | 'skipped' | 'failed';
  uuid?: string;
  error?: string;
}

/**
 * Batch import result
 */
export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  items: TagImportResult[];
}

/**
 * Batch import tags
 */
export async function importTags(
  items: TagImportData[],
  strategy: ImportStrategy,
  db: D1Database,
): Promise<ImportResult> {
  const client = createDrizzleClient(db);
  const results: TagImportResult[] = [];
  const now = Math.floor(Date.now() / 1000);

  for (const item of items) {
    try {
      // 1. Check if tag exists (by slug), including soft-deleted records
      const existing = await client.select().from(tags).where(eq(tags.slug, item.slug)).limit(1);

      if (existing[0]) {
        const isDeleted = existing[0].deletedAt !== null;

        // If it's a soft-deleted record, restore it regardless of strategy
        // If it's an active record, respect the strategy
        if (isDeleted) {
          // Restore and update the soft-deleted record
          await client
            .update(tags)
            .set({
              name: item.name,
              metadataTitle: item.metaTitle,
              metadataDescription: item.metaDescription,
              content: item.content,
              deletedAt: null, // Restore the record
              updatedAt: now,
            })
            .where(eq(tags.uuid, existing[0].uuid));

          results.push({
            name: item.name,
            slug: item.slug,
            status: 'updated',
            uuid: existing[0].uuid,
          });
        } else {
          // Active record - respect strategy
          if (strategy === 'skip_existing') {
            results.push({
              name: item.name,
              slug: item.slug,
              status: 'skipped',
              uuid: existing[0].uuid,
            });
            continue;
          }

          // Update existing active record
          await client
            .update(tags)
            .set({
              name: item.name,
              metadataTitle: item.metaTitle,
              metadataDescription: item.metaDescription,
              content: item.content,
              updatedAt: now,
            })
            .where(eq(tags.uuid, existing[0].uuid));

          results.push({
            name: item.name,
            slug: item.slug,
            status: 'updated',
            uuid: existing[0].uuid,
          });
        }
      } else {
        // Create new record
        const uuid = nanoid();
        await client.insert(tags).values({
          uuid,
          name: item.name,
          slug: item.slug,
          metadataTitle: item.metaTitle,
          metadataDescription: item.metaDescription,
          content: item.content,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });

        results.push({
          name: item.name,
          slug: item.slug,
          status: 'created',
          uuid,
        });
      }
    } catch (error) {
      results.push({
        name: item.name,
        slug: item.slug,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    total: items.length,
    created: results.filter((r) => r.status === 'created').length,
    updated: results.filter((r) => r.status === 'updated').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    failed: results.filter((r) => r.status === 'failed').length,
    items: results,
  };
}
