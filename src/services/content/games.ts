/**
 * Games Service
 * Database operations for games
 */

import { eq, desc, asc, and, or, isNull, sql, SQL } from 'drizzle-orm';
import { createDrizzleClient } from '@/db/client';
import { games, introductions, gamesToCategories, gamesToTags, categories, tags } from '@/db/schema';
import { nanoid } from 'nanoid';
import { DEFAULT_LOCALE } from '@/i18n/language';
import {
  createIntroduction,
  updateIntroductionByGameUuid,
  getIntroductionWithAllTranslations,
} from '@/services/content/introductions';
import type { TranslationInput } from '@/services/i18n/types';

export interface CreateGameInput {
  name: string;
  slug: string;
  thumbnail: string;
  source: string;
  status?: 'draft' | 'online' | 'offline';
  nameI18n?: Record<string, string>; // Multi-language game names: { "en": "Super Mario", "zh": "超级马里奥" }
  introduction?: {
    metadataTitle: string;
    metadataDescription: string;
    content: string;
    translations?: TranslationInput; // Multi-language introduction translations
  };
}

export interface UpdateGameInput {
  name?: string;
  slug?: string;
  thumbnail?: string;
  source?: string;
  status?: 'draft' | 'online' | 'offline';
  interact?: number;
  rating?: number;
  ratingCount?: number;
  upvoteCount?: number;
  downvoteCount?: number;
  saveCount?: number;
  shareCount?: number;
  nameI18n?: Record<string, string>; // Multi-language game names
  introduction?: {
    metadataTitle: string;
    metadataDescription: string;
    content: string;
    translations?: TranslationInput; // Multi-language introduction translations
  };
}

/**
 * Get localized game name from nameI18n JSON field
 */
export function getLocalizedGameName(game: { name: string; nameI18n: Record<string, string> }, locale: string): string {
  // If locale is default or nameI18n doesn't exist, return base name
  if (locale === DEFAULT_LOCALE || !game.nameI18n) {
    return game.name;
  }

  // Try to get localized name
  const localizedName = game.nameI18n[locale];

  // Fallback to base name if translation doesn't exist
  return localizedName || game.name;
}

export interface ListGamesOptions {
  status?: 'draft' | 'online' | 'offline';
  search?: string;
  orderBy?: 'created_at' | 'rating' | 'interact' | 'name' | 'status';
  orderDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Create a new game
 */
export async function createGame(input: CreateGameInput, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  const gameUuid = nanoid();

  // Prepare nameI18n: ensure default locale is included
  const nameI18n = input.nameI18n || {};
  if (!nameI18n[DEFAULT_LOCALE]) {
    nameI18n[DEFAULT_LOCALE] = input.name;
  }

  const newGame = {
    uuid: gameUuid,
    name: input.name,
    nameI18n: JSON.stringify(nameI18n), // Store as JSON string
    slug: input.slug,
    thumbnail: input.thumbnail,
    source: input.source,
    status: input.status || 'draft',
    interact: 0,
    rating: 0,
    ratingCount: 0,
    upvoteCount: 0,
    downvoteCount: 0,
    saveCount: 0,
    shareCount: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await client.insert(games).values(newGame);

  // Create introduction if provided
  if (input.introduction) {
    await createIntroduction(
      {
        gameUuid,
        metadataTitle: input.introduction.metadataTitle,
        metadataDescription: input.introduction.metadataDescription,
        content: input.introduction.content,
        translations: input.introduction.translations,
      },
      db,
    );
  }

  return getGameByUuid(gameUuid, db);
}

/**
 * Get game by UUID
 */
export async function getGameByUuid(uuid: string, db: D1Database, includeDeleted: boolean = false) {
  const client = createDrizzleClient(db);

  const conditions: SQL[] = [eq(games.uuid, uuid)];
  if (!includeDeleted) {
    conditions.push(isNull(games.deletedAt));
  }

  const result = await client
    .select({
      game: games,
      introduction: introductions,
    })
    .from(games)
    .leftJoin(introductions, and(eq(games.uuid, introductions.gameUuid), isNull(introductions.deletedAt)))
    .where(and(...conditions))
    .limit(1);

  if (!result[0]) return null;

  return {
    ...result[0].game,
    introduction: result[0].introduction || undefined,
  };
}

/**
 * Get game with all translations (for admin panel)
 */
export async function getGameWithAllTranslations(uuid: string, db: D1Database) {
  const game = await getGameByUuid(uuid, db);

  if (!game) return null;

  // Parse nameI18n from JSON string (if it's a string)
  const nameI18n = game.nameI18n
    ? typeof game.nameI18n === 'string'
      ? JSON.parse(game.nameI18n)
      : game.nameI18n
    : { [DEFAULT_LOCALE]: game.name };

  // Get introduction with all translations
  const introWithTranslations = await getIntroductionWithAllTranslations(uuid, db);

  return {
    ...game,
    nameI18n,
    introduction: introWithTranslations || undefined,
  };
}

/**
 * Get game by slug
 */
export async function getGameBySlug(slug: string, db: D1Database, includeDeleted: boolean = false) {
  const client = createDrizzleClient(db);

  const conditions: SQL[] = [eq(games.slug, slug)];
  if (!includeDeleted) {
    conditions.push(isNull(games.deletedAt));
  }

  const result = await client
    .select()
    .from(games)
    .where(and(...conditions))
    .limit(1);

  return result[0] || null;
}

/**
 * List games with pagination and filtering
 */
export async function listGames(options: ListGamesOptions, db: D1Database) {
  const client = createDrizzleClient(db);

  const { status, search, orderBy = 'created_at', orderDirection = 'desc', page = 1, pageSize = 20 } = options;

  // Build where conditions
  const conditions: SQL[] = [isNull(games.deletedAt)];

  if (status) {
    conditions.push(eq(games.status, status));
  }

  if (search) {
    conditions.push(or(sql`${games.name} LIKE ${`%${search}%`}`, sql`${games.slug} LIKE ${`%${search}%`}`)!);
  }

  // Build order by
  let orderByClause;
  const orderFn = orderDirection === 'asc' ? asc : desc;

  switch (orderBy) {
    case 'rating':
      orderByClause = orderFn(games.rating);
      break;
    case 'interact':
      orderByClause = orderFn(games.interact);
      break;
    case 'name':
      orderByClause = orderFn(games.name);
      break;
    case 'status':
      orderByClause = orderFn(games.status);
      break;
    default:
      orderByClause = orderFn(games.createdAt);
  }

  // Get total count
  const countResult = await client
    .select({ count: sql<number>`count(*)` })
    .from(games)
    .where(and(...conditions));

  const total = countResult[0]?.count ?? 0;

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const results = await client
    .select()
    .from(games)
    .where(and(...conditions))
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset(offset);

  return {
    data: results,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Update game by UUID
 */
export async function updateGame(uuid: string, input: UpdateGameInput, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  // Extract introduction and nameI18n from input
  const { introduction, nameI18n, ...gameFields } = input;

  // Update game fields
  if (Object.keys(gameFields).length > 0 || nameI18n) {
    const updateData: any = {
      ...gameFields,
      updatedAt: now,
    };

    // Handle nameI18n if provided
    if (nameI18n) {
      // Ensure default locale is included if name is also being updated
      const updatedNameI18n = { ...nameI18n };
      if (gameFields.name && !updatedNameI18n[DEFAULT_LOCALE]) {
        updatedNameI18n[DEFAULT_LOCALE] = gameFields.name;
      }
      updateData.nameI18n = JSON.stringify(updatedNameI18n);
    }

    await client
      .update(games)
      .set(updateData)
      .where(and(eq(games.uuid, uuid), isNull(games.deletedAt)));
  }

  // Update or create introduction if provided
  if (introduction) {
    await updateIntroductionByGameUuid(
      uuid,
      {
        metadataTitle: introduction.metadataTitle,
        metadataDescription: introduction.metadataDescription,
        content: introduction.content,
        translations: introduction.translations,
      },
      db,
    );
  }

  return getGameByUuid(uuid, db);
}

/**
 * Soft delete game by UUID
 */
export async function deleteGame(uuid: string, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  await client
    .update(games)
    .set({ deletedAt: now })
    .where(and(eq(games.uuid, uuid), isNull(games.deletedAt)));

  return true;
}

/**
 * Increment interact count
 */
export async function incrementInteract(uuid: string, db: D1Database) {
  const client = createDrizzleClient(db);

  await client
    .update(games)
    .set({ interact: sql`${games.interact} + 1` })
    .where(and(eq(games.uuid, uuid), isNull(games.deletedAt)));

  return getGameByUuid(uuid, db);
}

/**
 * Update game rating
 */
export async function updateGameRating(uuid: string, newRating: number, db: D1Database) {
  const client = createDrizzleClient(db);

  // Get current rating stats
  const game = await getGameByUuid(uuid, db);
  if (!game) return null;

  const currentCount = game.ratingCount || 0;
  const currentRating = game.rating || 0;

  // Calculate new average rating
  const totalRating = currentRating * currentCount + newRating;
  const newCount = currentCount + 1;
  const newAvgRating = totalRating / newCount;

  await client
    .update(games)
    .set({
      rating: Math.round(newAvgRating * 10) / 10, // Round to 1 decimal
      ratingCount: newCount,
    })
    .where(and(eq(games.uuid, uuid), isNull(games.deletedAt)));

  return getGameByUuid(uuid, db);
}

/**
 * Increment upvote count
 */
export async function incrementUpvote(uuid: string, db: D1Database) {
  const client = createDrizzleClient(db);

  await client
    .update(games)
    .set({ upvoteCount: sql`${games.upvoteCount} + 1` })
    .where(and(eq(games.uuid, uuid), isNull(games.deletedAt)));

  return getGameByUuid(uuid, db);
}

/**
 * Increment downvote count
 */
export async function incrementDownvote(uuid: string, db: D1Database) {
  const client = createDrizzleClient(db);

  await client
    .update(games)
    .set({ downvoteCount: sql`${games.downvoteCount} + 1` })
    .where(and(eq(games.uuid, uuid), isNull(games.deletedAt)));

  return getGameByUuid(uuid, db);
}

/**
 * Increment save count
 */
export async function incrementSave(uuid: string, db: D1Database) {
  const client = createDrizzleClient(db);

  await client
    .update(games)
    .set({ saveCount: sql`${games.saveCount} + 1` })
    .where(and(eq(games.uuid, uuid), isNull(games.deletedAt)));

  return getGameByUuid(uuid, db);
}

/**
 * Increment share count
 */
export async function incrementShare(uuid: string, db: D1Database) {
  const client = createDrizzleClient(db);

  await client
    .update(games)
    .set({ shareCount: sql`${games.shareCount} + 1` })
    .where(and(eq(games.uuid, uuid), isNull(games.deletedAt)));

  return getGameByUuid(uuid, db);
}

/**
 * Decrement upvote count (for cancel action)
 */
export async function decrementUpvote(uuid: string, db: D1Database) {
  const client = createDrizzleClient(db);

  await client
    .update(games)
    .set({ upvoteCount: sql`MAX(${games.upvoteCount} - 1, 0)` })
    .where(and(eq(games.uuid, uuid), isNull(games.deletedAt)));

  return getGameByUuid(uuid, db);
}

/**
 * Decrement downvote count (for cancel action)
 */
export async function decrementDownvote(uuid: string, db: D1Database) {
  const client = createDrizzleClient(db);

  await client
    .update(games)
    .set({ downvoteCount: sql`MAX(${games.downvoteCount} - 1, 0)` })
    .where(and(eq(games.uuid, uuid), isNull(games.deletedAt)));

  return getGameByUuid(uuid, db);
}

/**
 * Decrement save count (for cancel action)
 */
export async function decrementSave(uuid: string, db: D1Database) {
  const client = createDrizzleClient(db);

  await client
    .update(games)
    .set({ saveCount: sql`MAX(${games.saveCount} - 1, 0)` })
    .where(and(eq(games.uuid, uuid), isNull(games.deletedAt)));

  return getGameByUuid(uuid, db);
}

/**
 * Check if slug exists (for uniqueness validation)
 */
export async function slugExists(slug: string, excludeUuid?: string, db?: D1Database) {
  if (!db) return false;

  const client = createDrizzleClient(db);

  const conditions: SQL[] = [eq(games.slug, slug), isNull(games.deletedAt)];

  if (excludeUuid) {
    conditions.push(sql`${games.uuid} != ${excludeUuid}`);
  }

  const result = await client
    .select({ count: sql<number>`count(*)` })
    .from(games)
    .where(and(...conditions));

  return (result[0]?.count ?? 0) > 0;
}

/**
 * Batch update games
 */
export async function batchUpdateGames(uuids: string[], updateData: UpdateGameInput, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  const data: any = {
    ...updateData,
    updatedAt: now,
  };

  await client
    .update(games)
    .set(data)
    .where(and(sql`${games.uuid} IN ${uuids}`, isNull(games.deletedAt)));

  return true;
}

/**
 * Batch soft delete games
 */
export async function batchDeleteGames(uuids: string[], db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  await client
    .update(games)
    .set({ deletedAt: now })
    .where(and(sql`${games.uuid} IN ${uuids}`, isNull(games.deletedAt)));

  return true;
}

// ============================================================================
// Batch Import Functions
// ============================================================================

/**
 * Import strategy type
 */
export type ImportStrategy = 'upsert' | 'skip_existing' | 'overwrite';

/**
 * Game data for import
 */
export interface GameImportData {
  name: string;
  slug: string;
  thumbnail: string;
  source: string;
  categories: string[]; // Category slugs
  tags: string[]; // Tag slugs
  introduction?: {
    metaTitle: string;
    metaDescription: string;
    content: string;
  };
  status?: 'draft' | 'online' | 'offline';
}

/**
 * Game import result
 */
export interface GameImportResult {
  name: string;
  slug: string;
  status: 'created' | 'updated' | 'skipped' | 'failed';
  uuid?: string;
  error?: string;
  warnings?: string[];
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
  items: GameImportResult[];
}

/**
 * Batch import games with related data
 */
export async function importGames(
  items: GameImportData[],
  strategy: ImportStrategy,
  db: D1Database,
): Promise<ImportResult> {
  const client = createDrizzleClient(db);
  const results: GameImportResult[] = [];
  const now = Math.floor(Date.now() / 1000);

  // Pre-fetch all categories and tags to build slug -> uuid mappings
  const allCategories = await client.select().from(categories).where(isNull(categories.deletedAt));
  const allTags = await client.select().from(tags).where(isNull(tags.deletedAt));

  const categoryMap = new Map(allCategories.map((c) => [c.slug, c.uuid]));
  const tagMap = new Map(allTags.map((t) => [t.slug, t.uuid]));

  for (const item of items) {
    const warnings: string[] = [];

    try {
      // 1. Check if game exists (by slug), including soft-deleted records
      const existing = await client.select().from(games).where(eq(games.slug, item.slug)).limit(1);

      let gameUuid: string;
      let isNew = false;

      if (existing[0]) {
        const isDeleted = existing[0].deletedAt !== null;

        // If it's a soft-deleted record, restore it regardless of strategy
        // If it's an active record, respect the strategy
        if (isDeleted) {
          // Restore and update the soft-deleted game
          gameUuid = existing[0].uuid;
          await client
            .update(games)
            .set({
              name: item.name,
              thumbnail: item.thumbnail,
              source: item.source,
              status: item.status || 'draft',
              deletedAt: null, // Restore the record
              updatedAt: now,
            })
            .where(eq(games.uuid, gameUuid));
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

          // Update existing active game
          gameUuid = existing[0].uuid;
          await client
            .update(games)
            .set({
              name: item.name,
              thumbnail: item.thumbnail,
              source: item.source,
              status: item.status || existing[0].status,
              updatedAt: now,
            })
            .where(eq(games.uuid, gameUuid));
        }
      } else {
        // Create new game
        isNew = true;
        gameUuid = nanoid();
        await client.insert(games).values({
          uuid: gameUuid,
          name: item.name,
          slug: item.slug,
          thumbnail: item.thumbnail,
          source: item.source,
          status: item.status || 'draft',
          interact: 0,
          rating: 0,
          ratingCount: 0,
          upvoteCount: 0,
          downvoteCount: 0,
          saveCount: 0,
          shareCount: 0,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });
      }

      // 2. Handle introduction if provided
      if (item.introduction) {
        const existingIntro = await client
          .select()
          .from(introductions)
          .where(and(eq(introductions.gameUuid, gameUuid), isNull(introductions.deletedAt)))
          .limit(1);

        if (existingIntro[0]) {
          // Update existing introduction
          await client
            .update(introductions)
            .set({
              metadataTitle: item.introduction.metaTitle,
              metadataDescription: item.introduction.metaDescription,
              content: item.introduction.content,
              updatedAt: now,
            })
            .where(eq(introductions.uuid, existingIntro[0].uuid));
        } else {
          // Create new introduction
          await client.insert(introductions).values({
            uuid: nanoid(),
            gameUuid,
            metadataTitle: item.introduction.metaTitle,
            metadataDescription: item.introduction.metaDescription,
            content: item.introduction.content,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          });
        }
      }

      // 3. Handle categories
      if (item.categories && item.categories.length > 0) {
        // Clear existing category associations
        await client.delete(gamesToCategories).where(eq(gamesToCategories.gameUuid, gameUuid));

        // Create new associations
        for (const categorySlug of item.categories) {
          const categoryUuid = categoryMap.get(categorySlug);
          if (categoryUuid) {
            await client.insert(gamesToCategories).values({
              gameUuid,
              categoryUuid,
            });
          } else {
            warnings.push(`Category not found: ${categorySlug}`);
          }
        }
      }

      // 4. Handle tags
      if (item.tags && item.tags.length > 0) {
        // Clear existing tag associations
        await client.delete(gamesToTags).where(eq(gamesToTags.gameUuid, gameUuid));

        // Create new associations
        for (const tagSlug of item.tags) {
          const tagUuid = tagMap.get(tagSlug);
          if (tagUuid) {
            await client.insert(gamesToTags).values({
              gameUuid,
              tagUuid,
            });
          } else {
            warnings.push(`Tag not found: ${tagSlug}`);
          }
        }
      }

      results.push({
        name: item.name,
        slug: item.slug,
        status: isNew ? 'created' : 'updated',
        uuid: gameUuid,
        warnings: warnings.length > 0 ? warnings : undefined,
      });
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

/**
 * Game data for import with UUIDs (from fetch API)
 */
export interface GameImportDataWithUuids {
  uuid: string; // Preserve original UUID
  name: string;
  slug: string;
  thumbnail: string;
  source: string;
  status?: 'draft' | 'online' | 'offline';
  nameI18n?: Record<string, string>;
  categoryUuids: string[]; // Category UUIDs
  tagUuids: string[]; // Tag UUIDs
  featuredUuids?: string[]; // Featured UUIDs
  introduction?: {
    metaTitle: string;
    metaDescription: string;
    content: string;
  };
}

/**
 * Import games with UUID-based relationships (for fetch API)
 */
export async function importGamesWithUuids(
  items: GameImportDataWithUuids[],
  strategy: ImportStrategy,
  db: D1Database,
): Promise<ImportResult> {
  const client = createDrizzleClient(db);
  const results: GameImportResult[] = [];
  const now = Math.floor(Date.now() / 1000);

  for (const item of items) {
    const warnings: string[] = [];

    try {
      // 1. Check if game exists (by UUID or slug), including soft-deleted records
      const existing = await client
        .select()
        .from(games)
        .where(or(eq(games.uuid, item.uuid), eq(games.slug, item.slug)))
        .limit(1);

      let gameUuid: string;
      let isNew = false;

      if (existing[0]) {
        const isDeleted = existing[0].deletedAt !== null;

        if (isDeleted) {
          // Restore and update the soft-deleted game
          gameUuid = existing[0].uuid;
          await client
            .update(games)
            .set({
              name: item.name,
              thumbnail: item.thumbnail,
              source: item.source,
              status: item.status || 'draft',
              nameI18n: item.nameI18n ? JSON.stringify(item.nameI18n) : null,
              deletedAt: null,
              updatedAt: now,
            })
            .where(eq(games.uuid, gameUuid));
        } else {
          if (strategy === 'skip_existing') {
            results.push({
              name: item.name,
              slug: item.slug,
              status: 'skipped',
              uuid: existing[0].uuid,
            });
            continue;
          }

          // Update existing active game
          gameUuid = existing[0].uuid;
          await client
            .update(games)
            .set({
              name: item.name,
              thumbnail: item.thumbnail,
              source: item.source,
              status: item.status || existing[0].status,
              nameI18n: item.nameI18n ? JSON.stringify(item.nameI18n) : existing[0].nameI18n,
              updatedAt: now,
            })
            .where(eq(games.uuid, gameUuid));
        }
      } else {
        // Create new game (preserve UUID from source)
        isNew = true;
        gameUuid = item.uuid;
        await client.insert(games).values({
          uuid: gameUuid,
          name: item.name,
          slug: item.slug,
          thumbnail: item.thumbnail,
          source: item.source,
          status: item.status || 'draft',
          nameI18n: item.nameI18n ? JSON.stringify(item.nameI18n) : null,
          interact: 0,
          rating: 0,
          ratingCount: 0,
          upvoteCount: 0,
          downvoteCount: 0,
          saveCount: 0,
          shareCount: 0,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });
      }

      // 2. Handle introduction if provided
      if (item.introduction) {
        const existingIntro = await client
          .select()
          .from(introductions)
          .where(and(eq(introductions.gameUuid, gameUuid), isNull(introductions.deletedAt)))
          .limit(1);

        if (existingIntro[0]) {
          await client
            .update(introductions)
            .set({
              metadataTitle: item.introduction.metaTitle,
              metadataDescription: item.introduction.metaDescription,
              content: item.introduction.content,
              updatedAt: now,
            })
            .where(eq(introductions.uuid, existingIntro[0].uuid));
        } else {
          await client.insert(introductions).values({
            uuid: nanoid(),
            gameUuid,
            metadataTitle: item.introduction.metaTitle,
            metadataDescription: item.introduction.metaDescription,
            content: item.introduction.content,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          });
        }
      }

      // 3. Handle categories (UUID-based)
      if (item.categoryUuids && item.categoryUuids.length > 0) {
        await client.delete(gamesToCategories).where(eq(gamesToCategories.gameUuid, gameUuid));

        for (const categoryUuid of item.categoryUuids) {
          // Verify category exists
          const categoryExists = await client
            .select({ uuid: categories.uuid })
            .from(categories)
            .where(eq(categories.uuid, categoryUuid))
            .limit(1);

          if (categoryExists[0]) {
            await client.insert(gamesToCategories).values({
              gameUuid,
              categoryUuid,
            });
          } else {
            warnings.push(`Category UUID not found: ${categoryUuid}`);
          }
        }
      }

      // 4. Handle tags (UUID-based)
      if (item.tagUuids && item.tagUuids.length > 0) {
        await client.delete(gamesToTags).where(eq(gamesToTags.gameUuid, gameUuid));

        for (const tagUuid of item.tagUuids) {
          // Verify tag exists
          const tagExists = await client.select({ uuid: tags.uuid }).from(tags).where(eq(tags.uuid, tagUuid)).limit(1);

          if (tagExists[0]) {
            await client.insert(gamesToTags).values({
              gameUuid,
              tagUuid,
            });
          } else {
            warnings.push(`Tag UUID not found: ${tagUuid}`);
          }
        }
      }

      // 5. Handle featured collections (UUID-based) - if needed
      // Note: We need to check if there's a gamesToFeatured table
      // For now, skip this if the table doesn't exist

      results.push({
        name: item.name,
        slug: item.slug,
        status: isNew ? 'created' : 'updated',
        uuid: gameUuid,
        warnings: warnings.length > 0 ? warnings : undefined,
      });
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
