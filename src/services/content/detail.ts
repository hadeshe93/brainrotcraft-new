/**
 * Game Detail Page Data Service
 * Fetches data for game detail pages with i18n support
 */

import { eq, desc, and, isNull, sql, count, inArray, ne } from 'drizzle-orm';
import { createDrizzleClient } from '@/db/client';
import { games, categories, tags, introductions, comments, gamesToCategories, gamesToTags } from '@/db/schema';
import { DEFAULT_LOCALE } from '@/i18n/language';
import type { LanguageCode } from '@/types/lang';
import {
  getTranslatedIntroduction,
  getTranslatedGameName,
  batchGetTranslatedCategories,
  batchGetTranslatedTags,
  type TranslatedCategory,
  type TranslatedTag,
} from './translation-fetcher';

/**
 * Get Game by Slug with Full Details
 * Fetches game with categories, tags, and introduction with i18n support
 */
export async function getGameBySlug(slug: string, db: D1Database, locale: LanguageCode = DEFAULT_LOCALE) {
  const client = createDrizzleClient(db);

  // Fetch game basic info including nameI18n for translation
  const gameResults = await client
    .select({
      uuid: games.uuid,
      name: games.name,
      nameI18n: games.nameI18n,
      slug: games.slug,
      status: games.status,
      thumbnail: games.thumbnail,
      source: games.source,
      rating: games.rating,
      ratingCount: games.ratingCount,
      interact: games.interact,
      upvoteCount: games.upvoteCount,
      downvoteCount: games.downvoteCount,
      saveCount: games.saveCount,
      shareCount: games.shareCount,
      createdAt: games.createdAt,
    })
    .from(games)
    .where(and(eq(games.slug, slug), eq(games.status, 'online'), isNull(games.deletedAt)))
    .limit(1);

  if (!gameResults || gameResults.length === 0) {
    return null;
  }

  const game = gameResults[0];

  // Get translated game name
  const translatedName = getTranslatedGameName(game.name, game.nameI18n, locale);

  // Fetch localized introduction
  const introduction = await getTranslatedIntroduction(game.uuid, locale, db);

  // Fetch categories
  const categoriesResults = await client
    .select({
      uuid: categories.uuid,
      name: categories.name,
      slug: categories.slug,
      metadataTitle: categories.metadataTitle,
      metadataDescription: categories.metadataDescription,
    })
    .from(categories)
    .innerJoin(gamesToCategories, eq(categories.uuid, gamesToCategories.categoryUuid))
    .where(and(eq(gamesToCategories.gameUuid, game.uuid), isNull(categories.deletedAt)));

  // Translate categories
  const translatedCategories = await batchGetTranslatedCategories(
    categoriesResults.map((c) => ({
      uuid: c.uuid,
      name: c.name,
      slug: c.slug,
      metadataTitle: c.metadataTitle,
      metadataDescription: c.metadataDescription,
      content: null,
    })),
    locale,
    db,
  );

  // Fetch tags
  const tagsResults = await client
    .select({
      uuid: tags.uuid,
      name: tags.name,
      slug: tags.slug,
      metadataTitle: tags.metadataTitle,
      metadataDescription: tags.metadataDescription,
    })
    .from(tags)
    .innerJoin(gamesToTags, eq(tags.uuid, gamesToTags.tagUuid))
    .where(and(eq(gamesToTags.gameUuid, game.uuid), isNull(tags.deletedAt)));

  // Translate tags
  const translatedTags = await batchGetTranslatedTags(
    tagsResults.map((t) => ({
      uuid: t.uuid,
      name: t.name,
      slug: t.slug,
      metadataTitle: t.metadataTitle,
      metadataDescription: t.metadataDescription,
      content: null,
    })),
    locale,
    db,
  );

  return {
    game: {
      ...game,
      name: translatedName,
      rating: game.rating || 0,
      ratingCount: game.ratingCount || 0,
      interact: game.interact || 0,
      upvoteCount: game.upvoteCount || 0,
      downvoteCount: game.downvoteCount || 0,
      saveCount: game.saveCount || 0,
      shareCount: game.shareCount || 0,
    },
    introduction,
    categories: translatedCategories.map((c) => ({
      uuid: c.uuid,
      name: c.name,
      slug: c.slug,
    })),
    tags: translatedTags.map((t) => ({
      uuid: t.uuid,
      name: t.name,
      slug: t.slug,
    })),
  };
}

/**
 * Get Similar Games
 * Fetches games with similar categories or tags with i18n support
 */
export async function getSimilarGames(
  gameUuid: string,
  limit: number = 4,
  db: D1Database,
  locale: LanguageCode = DEFAULT_LOCALE,
) {
  const client = createDrizzleClient(db);

  // Get the game's category and tag UUIDs
  const categoryUuids = await client
    .select({ categoryUuid: gamesToCategories.categoryUuid })
    .from(gamesToCategories)
    .where(eq(gamesToCategories.gameUuid, gameUuid));

  const tagUuids = await client
    .select({ tagUuid: gamesToTags.tagUuid })
    .from(gamesToTags)
    .where(eq(gamesToTags.gameUuid, gameUuid));

  const catUuids = categoryUuids.map((c) => c.categoryUuid);
  const tUuids = tagUuids.map((t) => t.tagUuid);

  // If no categories or tags, return empty
  if (catUuids.length === 0 && tUuids.length === 0) {
    return [];
  }

  // Find similar games by categories
  let similarGameUuids: string[] = [];

  if (catUuids.length > 0) {
    const categorySimilar = await client
      .select({ gameUuid: gamesToCategories.gameUuid })
      .from(gamesToCategories)
      .where(inArray(gamesToCategories.categoryUuid, catUuids))
      .limit(limit * 2); // Get more to filter later

    similarGameUuids = categorySimilar.map((g) => g.gameUuid);
  }

  // If not enough, add games by tags
  if (similarGameUuids.length < limit && tUuids.length > 0) {
    const tagSimilar = await client
      .select({ gameUuid: gamesToTags.gameUuid })
      .from(gamesToTags)
      .where(inArray(gamesToTags.tagUuid, tUuids))
      .limit(limit * 2);

    const tagGameUuids = tagSimilar.map((g) => g.gameUuid);
    similarGameUuids = [...new Set([...similarGameUuids, ...tagGameUuids])];
  }

  // Remove the current game from similar games
  similarGameUuids = similarGameUuids.filter((uuid) => uuid !== gameUuid);

  if (similarGameUuids.length === 0) {
    return [];
  }

  // Fetch game details including nameI18n
  const similarGames = await client
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
    .where(and(inArray(games.uuid, similarGameUuids), eq(games.status, 'online'), isNull(games.deletedAt)))
    .orderBy(desc(games.rating), desc(games.interact))
    .limit(limit);

  // Translate game names
  return similarGames.map((game) => ({
    uuid: game.uuid,
    name: getTranslatedGameName(game.name, game.nameI18n, locale),
    slug: game.slug,
    thumbnail: game.thumbnail,
    rating: game.rating || 0,
    interact: game.interact || 0,
    upvoteCount: game.upvoteCount || 0,
    createdAt: game.createdAt,
  }));
}

/**
 * Get Game Comments
 * Fetches approved comments for a game with pagination
 */
export async function getGameComments(gameUuid: string, page: number = 1, limit: number = 20, db: D1Database) {
  const client = createDrizzleClient(db);
  const offset = (page - 1) * limit;

  // Get total count
  const [{ total }] = await client
    .select({ total: count() })
    .from(comments)
    .where(and(eq(comments.gameUuid, gameUuid), eq(comments.status, 'approved'), isNull(comments.deletedAt)));

  // Get paginated comments
  const results = await client
    .select({
      uuid: comments.uuid,
      content: comments.content,
      anonymousName: comments.anonymousName,
      source: comments.source,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .where(and(eq(comments.gameUuid, gameUuid), eq(comments.status, 'approved'), isNull(comments.deletedAt)))
    .orderBy(desc(comments.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    comments: results.map((comment) => ({
      uuid: comment.uuid,
      content: comment.content,
      authorName: comment.anonymousName || 'Anonymous',
      createdAt: comment.createdAt,
    })),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
      hasMore: page < Math.ceil(total / limit),
    },
  };
}
