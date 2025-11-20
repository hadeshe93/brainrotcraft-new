/**
 * List Pages Data Service
 * Fetches data for list pages (All Games, Category, Tag, Aggregation pages) with i18n support
 */

import { eq, desc, and, isNull, sql, count } from 'drizzle-orm';
import { createDrizzleClient } from '@/db/client';
import { games, categories, tags, gamesToCategories, gamesToTags, featured } from '@/db/schema';
import { getPaginatedFeaturedGames } from './featured-games';
import { DEFAULT_LOCALE } from '@/i18n/language';
import type { LanguageCode } from '@/types/lang';
import {
  getTranslatedCategory,
  getTranslatedTag,
  getTranslatedFeatured,
  getTranslatedGameName,
  batchGetTranslatedCategories,
  batchGetTranslatedTags,
  type TranslatedCategory,
  type TranslatedTag,
} from './translation-fetcher';

/**
 * Get All Games with Pagination
 * Fetches all online games with pagination support and i18n
 */
export async function getAllGames(
  page: number = 1,
  limit: number = 20,
  db: D1Database,
  locale: LanguageCode = DEFAULT_LOCALE,
) {
  const client = createDrizzleClient(db);
  const offset = (page - 1) * limit;

  // Get total count for pagination
  const [{ total }] = await client
    .select({ total: count() })
    .from(games)
    .where(and(eq(games.status, 'online'), isNull(games.deletedAt)));

  // Get paginated games with nameI18n for translation
  const results = await client
    .select({
      uuid: games.uuid,
      name: games.name,
      nameI18n: games.nameI18n,
      slug: games.slug,
      thumbnail: games.thumbnail,
      rating: games.rating,
      interact: games.interact,
      upvoteCount: games.upvoteCount,
      createdAt: games.createdAt,
    })
    .from(games)
    .where(and(eq(games.status, 'online'), isNull(games.deletedAt)))
    .orderBy(desc(games.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    games: results.map((game) => ({
      uuid: game.uuid,
      name: getTranslatedGameName(game.name, game.nameI18n, locale),
      slug: game.slug,
      thumbnail: game.thumbnail,
      rating: game.rating || 0,
      interact: game.interact || 0,
      upvoteCount: game.upvoteCount || 0,
      createdAt: game.createdAt,
    })),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
    },
  };
}

/**
 * Get Category by Slug
 * Fetches category details by slug
 */
export async function getCategoryBySlug(slug: string, db: D1Database) {
  const client = createDrizzleClient(db);

  const results = await client
    .select({
      uuid: categories.uuid,
      name: categories.name,
      slug: categories.slug,
      metadataTitle: categories.metadataTitle,
      metadataDescription: categories.metadataDescription,
      content: categories.content,
    })
    .from(categories)
    .where(and(eq(categories.slug, slug), isNull(categories.deletedAt)))
    .limit(1);

  return results[0] || null;
}

/**
 * Get Games by Category with Pagination
 * Fetches games in a specific category with pagination and i18n support
 */
export async function getGamesByCategory(
  categorySlug: string,
  page: number = 1,
  limit: number = 20,
  db: D1Database,
  locale: LanguageCode = DEFAULT_LOCALE,
) {
  const client = createDrizzleClient(db);
  const offset = (page - 1) * limit;

  // First get category
  const category = await getCategoryBySlug(categorySlug, db);
  if (!category) {
    return null;
  }

  // Translate category
  const translatedCategory = await getTranslatedCategory(category.uuid, locale, category as TranslatedCategory, db);

  // Get total count for pagination
  const [{ total }] = await client
    .select({ total: count() })
    .from(games)
    .innerJoin(gamesToCategories, eq(games.uuid, gamesToCategories.gameUuid))
    .where(and(eq(gamesToCategories.categoryUuid, category.uuid), eq(games.status, 'online'), isNull(games.deletedAt)));

  // Get paginated games with nameI18n
  const results = await client
    .select({
      uuid: games.uuid,
      name: games.name,
      nameI18n: games.nameI18n,
      slug: games.slug,
      thumbnail: games.thumbnail,
      rating: games.rating,
      interact: games.interact,
      upvoteCount: games.upvoteCount,
      createdAt: games.createdAt,
    })
    .from(games)
    .innerJoin(gamesToCategories, eq(games.uuid, gamesToCategories.gameUuid))
    .where(and(eq(gamesToCategories.categoryUuid, category.uuid), eq(games.status, 'online'), isNull(games.deletedAt)))
    .orderBy(desc(games.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    category: translatedCategory,
    games: results.map((game) => ({
      uuid: game.uuid,
      name: getTranslatedGameName(game.name, game.nameI18n, locale),
      slug: game.slug,
      thumbnail: game.thumbnail,
      rating: game.rating || 0,
      interact: game.interact || 0,
      upvoteCount: game.upvoteCount || 0,
      createdAt: game.createdAt,
    })),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
    },
  };
}

/**
 * Get Tag by Slug
 * Fetches tag details by slug
 */
export async function getTagBySlug(slug: string, db: D1Database) {
  const client = createDrizzleClient(db);

  const results = await client
    .select({
      uuid: tags.uuid,
      name: tags.name,
      slug: tags.slug,
      metadataTitle: tags.metadataTitle,
      metadataDescription: tags.metadataDescription,
      content: tags.content,
    })
    .from(tags)
    .where(and(eq(tags.slug, slug), isNull(tags.deletedAt)))
    .limit(1);

  return results[0] || null;
}

/**
 * Get Games by Tag with Pagination
 * Fetches games with a specific tag with pagination and i18n support
 */
export async function getGamesByTag(
  tagSlug: string,
  page: number = 1,
  limit: number = 20,
  db: D1Database,
  locale: LanguageCode = DEFAULT_LOCALE,
) {
  const client = createDrizzleClient(db);
  const offset = (page - 1) * limit;

  // First get tag
  const tag = await getTagBySlug(tagSlug, db);
  if (!tag) {
    return null;
  }

  // Translate tag
  const translatedTag = await getTranslatedTag(tag.uuid, locale, tag as TranslatedTag, db);

  // Get total count for pagination
  const [{ total }] = await client
    .select({ total: count() })
    .from(games)
    .innerJoin(gamesToTags, eq(games.uuid, gamesToTags.gameUuid))
    .where(and(eq(gamesToTags.tagUuid, tag.uuid), eq(games.status, 'online'), isNull(games.deletedAt)));

  // Get paginated games with nameI18n
  const results = await client
    .select({
      uuid: games.uuid,
      name: games.name,
      nameI18n: games.nameI18n,
      slug: games.slug,
      thumbnail: games.thumbnail,
      rating: games.rating,
      interact: games.interact,
      upvoteCount: games.upvoteCount,
      createdAt: games.createdAt,
    })
    .from(games)
    .innerJoin(gamesToTags, eq(games.uuid, gamesToTags.gameUuid))
    .where(and(eq(gamesToTags.tagUuid, tag.uuid), eq(games.status, 'online'), isNull(games.deletedAt)))
    .orderBy(desc(games.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    tag: translatedTag,
    games: results.map((game) => ({
      uuid: game.uuid,
      name: getTranslatedGameName(game.name, game.nameI18n, locale),
      slug: game.slug,
      thumbnail: game.thumbnail,
      rating: game.rating || 0,
      interact: game.interact || 0,
      upvoteCount: game.upvoteCount || 0,
      createdAt: game.createdAt,
    })),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
    },
  };
}

/**
 * Get All Categories with Game Count
 * Fetches all categories for aggregation page with i18n support
 * Filters based on SHOW_COLLECTION_STRATEGY environment variable:
 * - ALL: Show all categories
 * - EFFECTIVE: Show only categories with at least one game
 */
export async function getAllCategories(db: D1Database, locale: LanguageCode = DEFAULT_LOCALE) {
  const client = createDrizzleClient(db);
  const strategy = process.env.SHOW_COLLECTION_STRATEGY || 'ALL';

  let results;

  if (strategy === 'EFFECTIVE') {
    // Only fetch categories with at least one online game
    results = await client
      .select({
        uuid: categories.uuid,
        name: categories.name,
        slug: categories.slug,
        iconUrl: categories.iconUrl,
        metadataTitle: categories.metadataTitle,
        metadataDescription: categories.metadataDescription,
        gameCount: sql<number>`COUNT(DISTINCT ${gamesToCategories.gameUuid})`,
      })
      .from(categories)
      .innerJoin(gamesToCategories, eq(categories.uuid, gamesToCategories.categoryUuid))
      .innerJoin(
        games,
        and(eq(gamesToCategories.gameUuid, games.uuid), eq(games.status, 'online'), isNull(games.deletedAt)),
      )
      .where(isNull(categories.deletedAt))
      .groupBy(categories.uuid)
      .having(sql`COUNT(DISTINCT ${gamesToCategories.gameUuid}) > 0`)
      .orderBy(categories.name);
  } else {
    // Fetch all categories with game count
    results = await client
      .select({
        uuid: categories.uuid,
        name: categories.name,
        slug: categories.slug,
        iconUrl: categories.iconUrl,
        metadataTitle: categories.metadataTitle,
        metadataDescription: categories.metadataDescription,
        gameCount: sql<number>`COUNT(DISTINCT ${gamesToCategories.gameUuid})`,
      })
      .from(categories)
      .leftJoin(gamesToCategories, eq(categories.uuid, gamesToCategories.categoryUuid))
      .leftJoin(
        games,
        and(eq(gamesToCategories.gameUuid, games.uuid), eq(games.status, 'online'), isNull(games.deletedAt)),
      )
      .where(isNull(categories.deletedAt))
      .groupBy(categories.uuid)
      .orderBy(categories.name);
  }

  // Batch translate categories
  const categoriesToTranslate = results.map((c) => ({
    uuid: c.uuid,
    name: c.name,
    slug: c.slug,
    iconUrl: c.iconUrl,
    metadataTitle: c.metadataTitle,
    metadataDescription: c.metadataDescription,
    content: null,
  }));

  const translatedCategories = await batchGetTranslatedCategories(categoriesToTranslate, locale, db);

  return translatedCategories.map((category, index) => ({
    uuid: category.uuid,
    name: category.name,
    slug: category.slug,
    iconUrl: category.iconUrl,
    count: Number(results[index].gameCount) || 0,
  }));
}

/**
 * Get All Tags with Game Count
 * Fetches all tags for aggregation page with i18n support
 * Filters based on SHOW_COLLECTION_STRATEGY environment variable:
 * - ALL: Show all tags
 * - EFFECTIVE: Show only tags with at least one game
 */
export async function getAllTags(db: D1Database, locale: LanguageCode = DEFAULT_LOCALE) {
  const client = createDrizzleClient(db);
  const strategy = process.env.SHOW_COLLECTION_STRATEGY || 'ALL';

  let results;

  if (strategy === 'EFFECTIVE') {
    // Only fetch tags with at least one online game
    results = await client
      .select({
        uuid: tags.uuid,
        name: tags.name,
        slug: tags.slug,
        metadataTitle: tags.metadataTitle,
        metadataDescription: tags.metadataDescription,
        gameCount: sql<number>`COUNT(DISTINCT ${gamesToTags.gameUuid})`,
      })
      .from(tags)
      .innerJoin(gamesToTags, eq(tags.uuid, gamesToTags.tagUuid))
      .innerJoin(games, and(eq(gamesToTags.gameUuid, games.uuid), eq(games.status, 'online'), isNull(games.deletedAt)))
      .where(isNull(tags.deletedAt))
      .groupBy(tags.uuid)
      .having(sql`COUNT(DISTINCT ${gamesToTags.gameUuid}) > 0`)
      .orderBy(tags.name);
  } else {
    // Fetch all tags with game count
    results = await client
      .select({
        uuid: tags.uuid,
        name: tags.name,
        slug: tags.slug,
        metadataTitle: tags.metadataTitle,
        metadataDescription: tags.metadataDescription,
        gameCount: sql<number>`COUNT(DISTINCT ${gamesToTags.gameUuid})`,
      })
      .from(tags)
      .leftJoin(gamesToTags, eq(tags.uuid, gamesToTags.tagUuid))
      .leftJoin(games, and(eq(gamesToTags.gameUuid, games.uuid), eq(games.status, 'online'), isNull(games.deletedAt)))
      .where(isNull(tags.deletedAt))
      .groupBy(tags.uuid)
      .orderBy(tags.name);
  }

  // Batch translate tags
  const tagsToTranslate = results.map((t) => ({
    uuid: t.uuid,
    name: t.name,
    slug: t.slug,
    metadataTitle: t.metadataTitle,
    metadataDescription: t.metadataDescription,
    content: null,
  }));

  const translatedTags = await batchGetTranslatedTags(tagsToTranslate, locale, db);

  return translatedTags.map((tag, index) => ({
    uuid: tag.uuid,
    name: tag.name,
    slug: tag.slug,
    count: Number(results[index].gameCount) || 0,
  }));
}

/**
 * Get SEO Content for Categories Page with i18n support
 */
export async function getCategoriesSEOContent(db: D1Database, locale: LanguageCode = DEFAULT_LOCALE) {
  const client = createDrizzleClient(db);

  const results = await client
    .select({
      uuid: featured.uuid,
      name: featured.name,
      slug: featured.slug,
      metadataTitle: featured.metadataTitle,
      metadataDescription: featured.metadataDescription,
      content: featured.content,
    })
    .from(featured)
    .where(and(eq(featured.slug, 'categories'), isNull(featured.deletedAt)))
    .limit(1);

  const record = results[0];

  if (!record) {
    return {
      metadataTitle: 'All Game Categories',
      metadataDescription: 'Browse all game categories and discover new games to play.',
      content: null,
    };
  }

  // Translate featured content
  const translated = await getTranslatedFeatured(
    record.uuid,
    locale,
    {
      uuid: record.uuid,
      name: record.name,
      slug: record.slug,
      metadataTitle: record.metadataTitle,
      metadataDescription: record.metadataDescription,
      content: record.content,
    },
    db,
  );

  return {
    metadataTitle: translated.metadataTitle || 'All Game Categories',
    metadataDescription: translated.metadataDescription || 'Browse all game categories and discover new games to play.',
    content: translated.content || null,
  };
}

/**
 * Get SEO Content for Tags Page with i18n support
 */
export async function getTagsSEOContent(db: D1Database, locale: LanguageCode = DEFAULT_LOCALE) {
  const client = createDrizzleClient(db);

  const results = await client
    .select({
      uuid: featured.uuid,
      name: featured.name,
      slug: featured.slug,
      metadataTitle: featured.metadataTitle,
      metadataDescription: featured.metadataDescription,
      content: featured.content,
    })
    .from(featured)
    .where(and(eq(featured.slug, 'tags'), isNull(featured.deletedAt)))
    .limit(1);

  const record = results[0];

  if (!record) {
    return {
      metadataTitle: 'All Game Tags',
      metadataDescription: 'Explore all game tags and find games by topic.',
      content: null,
    };
  }

  // Translate featured content
  const translated = await getTranslatedFeatured(
    record.uuid,
    locale,
    {
      uuid: record.uuid,
      name: record.name,
      slug: record.slug,
      metadataTitle: record.metadataTitle,
      metadataDescription: record.metadataDescription,
      content: record.content,
    },
    db,
  );

  return {
    metadataTitle: translated.metadataTitle || 'All Game Tags',
    metadataDescription: translated.metadataDescription || 'Explore all game tags and find games by topic.',
    content: translated.content || null,
  };
}

/**
 * Get SEO Content for All Games Page with i18n support
 */
export async function getAllGamesSEOContent(db: D1Database, locale: LanguageCode = DEFAULT_LOCALE) {
  const client = createDrizzleClient(db);

  const results = await client
    .select({
      uuid: featured.uuid,
      name: featured.name,
      slug: featured.slug,
      metadataTitle: featured.metadataTitle,
      metadataDescription: featured.metadataDescription,
      content: featured.content,
    })
    .from(featured)
    .where(and(eq(featured.slug, 'games'), isNull(featured.deletedAt)))
    .limit(1);

  const record = results[0];

  if (!record) {
    return {
      metadataTitle: 'All Games',
      metadataDescription: 'Browse all available online games and find your next favorite.',
      content: null,
    };
  }

  // Translate featured content
  const translated = await getTranslatedFeatured(
    record.uuid,
    locale,
    {
      uuid: record.uuid,
      name: record.name,
      slug: record.slug,
      metadataTitle: record.metadataTitle,
      metadataDescription: record.metadataDescription,
      content: record.content,
    },
    db,
  );

  return {
    metadataTitle: translated.metadataTitle || 'All Games',
    metadataDescription:
      translated.metadataDescription || 'Browse all available online games and find your next favorite.',
    content: translated.content || null,
  };
}

/**
 * Get Hot Games with Pagination
 * Uses unified featured games service (运营优先 + 自动补充) with i18n support
 */
export async function getHotGames(
  page: number = 1,
  limit: number = 20,
  db: D1Database,
  locale: LanguageCode = DEFAULT_LOCALE,
) {
  return getPaginatedFeaturedGames('hot', page, limit, db, locale);
}

/**
 * Get New Games with Pagination
 * Uses unified featured games service (运营优先 + 自动补充) with i18n support
 */
export async function getNewGames(
  page: number = 1,
  limit: number = 20,
  db: D1Database,
  locale: LanguageCode = DEFAULT_LOCALE,
) {
  return getPaginatedFeaturedGames('new', page, limit, db, locale);
}

/**
 * Get SEO Content for Hot Games Page with i18n support
 */
export async function getHotGamesSEOContent(db: D1Database, locale: LanguageCode = DEFAULT_LOCALE) {
  const client = createDrizzleClient(db);

  const results = await client
    .select({
      uuid: featured.uuid,
      name: featured.name,
      slug: featured.slug,
      metadataTitle: featured.metadataTitle,
      metadataDescription: featured.metadataDescription,
      content: featured.content,
    })
    .from(featured)
    .where(and(eq(featured.slug, 'hot'), isNull(featured.deletedAt)))
    .limit(1);

  const record = results[0];

  if (!record) {
    return {
      metadataTitle: 'Hot Games',
      metadataDescription: 'Discover the most popular and trending games right now.',
      content: null,
    };
  }

  // Translate featured content
  const translated = await getTranslatedFeatured(
    record.uuid,
    locale,
    {
      uuid: record.uuid,
      name: record.name,
      slug: record.slug,
      metadataTitle: record.metadataTitle,
      metadataDescription: record.metadataDescription,
      content: record.content,
    },
    db,
  );

  return {
    metadataTitle: translated.metadataTitle || 'Hot Games',
    metadataDescription: translated.metadataDescription || 'Discover the most popular and trending games right now.',
    content: translated.content || null,
  };
}

/**
 * Get SEO Content for New Games Page with i18n support
 */
export async function getNewGamesSEOContent(db: D1Database, locale: LanguageCode = DEFAULT_LOCALE) {
  const client = createDrizzleClient(db);

  const results = await client
    .select({
      uuid: featured.uuid,
      name: featured.name,
      slug: featured.slug,
      metadataTitle: featured.metadataTitle,
      metadataDescription: featured.metadataDescription,
      content: featured.content,
    })
    .from(featured)
    .where(and(eq(featured.slug, 'new'), isNull(featured.deletedAt)))
    .limit(1);

  const record = results[0];

  if (!record) {
    return {
      metadataTitle: 'New Games',
      metadataDescription: 'Check out the latest games added to our collection.',
      content: null,
    };
  }

  // Translate featured content
  const translated = await getTranslatedFeatured(
    record.uuid,
    locale,
    {
      uuid: record.uuid,
      name: record.name,
      slug: record.slug,
      metadataTitle: record.metadataTitle,
      metadataDescription: record.metadataDescription,
      content: record.content,
    },
    db,
  );

  return {
    metadataTitle: translated.metadataTitle || 'New Games',
    metadataDescription: translated.metadataDescription || 'Check out the latest games added to our collection.',
    content: translated.content || null,
  };
}
