/**
 * Categories Service
 * Database operations for game categories
 */

import { eq, desc, asc, and, or, isNull, sql, SQL } from 'drizzle-orm';
import { createDrizzleClient } from '@/db/client';
import { categories, categoryTranslations } from '@/db/schema';
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

export interface CreateCategoryInput {
  name: string;
  slug: string;
  iconUrl?: string;
  metadataTitle: string;
  metadataDescription: string;
  content?: string;
  translations?: TranslationInput; // Optional translations for other locales
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  iconUrl?: string;
  metadataTitle?: string;
  metadataDescription?: string;
  content?: string;
  translations?: TranslationInput; // Optional translations for other locales
}

export interface ListCategoriesOptions {
  search?: string;
  orderBy?: 'created_at' | 'name';
  orderDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Create a new category
 */
export async function createCategory(input: CreateCategoryInput, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);
  const uuid = nanoid();

  const newCategory = {
    uuid,
    name: input.name,
    slug: input.slug,
    iconUrl: input.iconUrl || null,
    metadataTitle: input.metadataTitle,
    metadataDescription: input.metadataDescription,
    content: input.content || null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await client.insert(categories).values(newCategory);

  // Handle translations if provided
  if (input.translations) {
    for (const [locale, translation] of Object.entries(input.translations)) {
      if (locale === DEFAULT_LOCALE) continue; // Skip default locale (stored in main table)

      if (translation.name || translation.metadataTitle || translation.metadataDescription || translation.content) {
        await upsertTranslation(
          categoryTranslations,
          categoryTranslations.categoryUuid,
          categoryTranslations.locale,
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

  return newCategory;
}

/**
 * Get category by UUID (without translation - base data only)
 */
export async function getCategoryByUuid(uuid: string, db: D1Database, includeDeleted: boolean = false) {
  const client = createDrizzleClient(db);

  const conditions: SQL[] = [eq(categories.uuid, uuid)];
  if (!includeDeleted) {
    conditions.push(isNull(categories.deletedAt));
  }

  const result = await client
    .select()
    .from(categories)
    .where(and(...conditions))
    .limit(1);

  return result[0] || null;
}

/**
 * Get category by UUID with translation support
 */
export async function getCategoryByUuidWithLocale(
  uuid: string,
  locale: string,
  db: D1Database,
  includeDeleted: boolean = false,
): Promise<WithTranslation<typeof categories.$inferSelect> | null> {
  const category = await getCategoryByUuid(uuid, db, includeDeleted);

  if (!category) return null;

  // If default locale, return base data directly
  if (locale === DEFAULT_LOCALE) {
    return mergeWithTranslation(category, null, locale, ['name', 'metadataTitle', 'metadataDescription', 'content']);
  }

  // Query translation
  const translation = await getTranslation<SeoTranslationFields>(
    categoryTranslations,
    categoryTranslations.categoryUuid,
    categoryTranslations.locale,
    uuid,
    locale,
    db,
  );

  return mergeWithTranslation(category, translation, locale, [
    'name',
    'metadataTitle',
    'metadataDescription',
    'content',
  ]);
}

/**
 * Get category by slug (without translation - base data only)
 */
export async function getCategoryBySlug(slug: string, db: D1Database, includeDeleted: boolean = false) {
  const client = createDrizzleClient(db);

  const conditions: SQL[] = [eq(categories.slug, slug)];
  if (!includeDeleted) {
    conditions.push(isNull(categories.deletedAt));
  }

  const result = await client
    .select()
    .from(categories)
    .where(and(...conditions))
    .limit(1);

  return result[0] || null;
}

/**
 * Get category by slug with translation support
 */
export async function getCategoryBySlugWithLocale(
  slug: string,
  locale: string,
  db: D1Database,
  includeDeleted: boolean = false,
): Promise<WithTranslation<typeof categories.$inferSelect> | null> {
  const category = await getCategoryBySlug(slug, db, includeDeleted);

  if (!category) return null;

  // If default locale, return base data directly
  if (locale === DEFAULT_LOCALE) {
    return mergeWithTranslation(category, null, locale, ['name', 'metadataTitle', 'metadataDescription', 'content']);
  }

  // Query translation
  const translation = await getTranslation<SeoTranslationFields>(
    categoryTranslations,
    categoryTranslations.categoryUuid,
    categoryTranslations.locale,
    category.uuid,
    locale,
    db,
  );

  return mergeWithTranslation(category, translation, locale, [
    'name',
    'metadataTitle',
    'metadataDescription',
    'content',
  ]);
}

/**
 * List categories with pagination and filtering (includes all translations)
 */
export async function listCategories(options: ListCategoriesOptions, db: D1Database) {
  const client = createDrizzleClient(db);

  const { search, orderBy = 'name', orderDirection = 'asc', page = 1, pageSize = 50 } = options;

  // Build where conditions
  const conditions: SQL[] = [isNull(categories.deletedAt)];

  if (search) {
    conditions.push(or(sql`${categories.name} LIKE ${`%${search}%`}`, sql`${categories.slug} LIKE ${`%${search}%`}`)!);
  }

  // Build order by
  let orderByClause;
  const orderFn = orderDirection === 'asc' ? asc : desc;

  switch (orderBy) {
    case 'name':
      orderByClause = orderFn(categories.name);
      break;
    default:
      orderByClause = orderFn(categories.createdAt);
  }

  // Get total count
  const countResult = await client
    .select({ count: sql<number>`count(*)` })
    .from(categories)
    .where(and(...conditions));

  const total = countResult[0]?.count ?? 0;

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const results = await client
    .select()
    .from(categories)
    .where(and(...conditions))
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset(offset);

  // Fetch translations for each category (non-default locales only)
  const categoriesWithTranslations = await Promise.all(
    results.map(async (category) => {
      const translations = await getAllTranslations(
        categoryTranslations,
        categoryTranslations.categoryUuid,
        category.uuid,
        db,
      );

      // Don't include default locale in translations - it's already in the base fields
      // (metadataTitle, metadataDescription, content)

      return {
        ...category,
        translations,
      };
    }),
  );

  return {
    data: categoriesWithTranslations,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get all categories (no pagination, for dropdowns)
 */
export async function getAllCategories(db: D1Database) {
  const client = createDrizzleClient(db);

  const results = await client
    .select()
    .from(categories)
    .where(isNull(categories.deletedAt))
    .orderBy(asc(categories.name));

  return results;
}

/**
 * Get category with all translations (for admin panel)
 */
export async function getCategoryWithAllTranslations(uuid: string, db: D1Database) {
  const category = await getCategoryByUuid(uuid, db);

  if (!category) return null;

  const translations = await getAllTranslations(categoryTranslations, categoryTranslations.categoryUuid, uuid, db);

  // Add default locale (from base table)
  translations[DEFAULT_LOCALE] = {
    name: category.name,
    metadataTitle: category.metadataTitle,
    metadataDescription: category.metadataDescription,
    content: category.content || undefined,
  };

  return {
    ...category,
    translations,
  };
}

/**
 * Update category by UUID
 */
export async function updateCategory(uuid: string, input: UpdateCategoryInput, db: D1Database) {
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
      .update(categories)
      .set(updateData)
      .where(and(eq(categories.uuid, uuid), isNull(categories.deletedAt)));
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
            .update(categories)
            .set(defaultUpdate)
            .where(and(eq(categories.uuid, uuid), isNull(categories.deletedAt)));
        }
      } else {
        // Update translation table
        await upsertTranslation(
          categoryTranslations,
          categoryTranslations.categoryUuid,
          categoryTranslations.locale,
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

  return getCategoryByUuid(uuid, db);
}

/**
 * Soft delete category by UUID
 */
export async function deleteCategory(uuid: string, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  await client
    .update(categories)
    .set({ deletedAt: now })
    .where(and(eq(categories.uuid, uuid), isNull(categories.deletedAt)));

  // Note: We don't delete translations here, they remain for potential restoration
  // If you want to delete translations, uncomment the line below:
  // await deleteTranslations(categoryTranslations, categoryTranslations.categoryUuid, uuid, db);

  return true;
}

/**
 * Check if slug exists (for uniqueness validation)
 */
export async function categorySlugExists(slug: string, excludeUuid?: string, db?: D1Database) {
  if (!db) return false;

  const client = createDrizzleClient(db);

  const conditions: SQL[] = [eq(categories.slug, slug), isNull(categories.deletedAt)];

  if (excludeUuid) {
    conditions.push(sql`${categories.uuid} != ${excludeUuid}`);
  }

  const result = await client
    .select({ count: sql<number>`count(*)` })
    .from(categories)
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
 * Category data for import
 */
export interface CategoryImportData {
  name: string;
  slug: string;
  iconUrl?: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
}

/**
 * Category import result
 */
export interface CategoryImportResult {
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
  items: CategoryImportResult[];
}

/**
 * Batch import categories
 */
export async function importCategories(
  items: CategoryImportData[],
  strategy: ImportStrategy,
  db: D1Database,
): Promise<ImportResult> {
  const client = createDrizzleClient(db);
  const results: CategoryImportResult[] = [];
  const now = Math.floor(Date.now() / 1000);

  for (const item of items) {
    try {
      // 1. Check if category exists (by slug), including soft-deleted records
      const existing = await client.select().from(categories).where(eq(categories.slug, item.slug)).limit(1);

      if (existing[0]) {
        const isDeleted = existing[0].deletedAt !== null;

        // If it's a soft-deleted record, restore it regardless of strategy
        // If it's an active record, respect the strategy
        if (isDeleted) {
          // Restore and update the soft-deleted record
          await client
            .update(categories)
            .set({
              name: item.name,
              iconUrl: item.iconUrl || null,
              metadataTitle: item.metaTitle,
              metadataDescription: item.metaDescription,
              content: item.content,
              deletedAt: null, // Restore the record
              updatedAt: now,
            })
            .where(eq(categories.uuid, existing[0].uuid));

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
            .update(categories)
            .set({
              name: item.name,
              iconUrl: item.iconUrl || null,
              metadataTitle: item.metaTitle,
              metadataDescription: item.metaDescription,
              content: item.content,
              updatedAt: now,
            })
            .where(eq(categories.uuid, existing[0].uuid));

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
        await client.insert(categories).values({
          uuid,
          name: item.name,
          slug: item.slug,
          iconUrl: item.iconUrl || null,
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
