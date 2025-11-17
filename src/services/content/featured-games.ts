/**
 * Featured Games Service
 * 统一的特性游戏查询逻辑（运营优先 + 自动补充）with i18n support
 */

import { eq, desc, and, isNull, sql, notInArray, count } from 'drizzle-orm';
import { createDrizzleClient } from '@/db/client';
import { games, featured, gamesToFeatured } from '@/db/schema';
import { DEFAULT_LOCALE } from '@/i18n/language';
import type { LanguageCode } from '@/types/lang';
import { getTranslatedGameName } from './translation-fetcher';
import { GameItem } from '@/types/game';

interface FeaturedGamesOptions {
  featuredSlug: string; // 'hot' | 'new'
  limit: number;
  autoFillStrategy: 'interact' | 'created_at'; // 自动补充策略
  locale?: LanguageCode; // 语言代码
}

/**
 * 获取特性游戏（运营优先 + 自动补充）with i18n support
 *
 * 策略说明：
 * 1. 先查询运营数据（手动关联的游戏），按 sortOrder 排序
 * 2. 如果运营数据不足 limit，自动补充符合条件的游戏
 * 3. 运营数据在前，自动数据在后
 */
export async function getFeaturedGames(options: FeaturedGamesOptions, db: D1Database): Promise<GameItem[]> {
  const { featuredSlug, limit, autoFillStrategy, locale = DEFAULT_LOCALE } = options;
  const client = createDrizzleClient(db);

  // 1. 查询运营数据（手动关联的游戏）with nameI18n
  const manualGames = await client
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
      sortOrder: gamesToFeatured.sortOrder,
    })
    .from(games)
    .innerJoin(gamesToFeatured, eq(games.uuid, gamesToFeatured.gameUuid))
    .innerJoin(featured, eq(gamesToFeatured.featuredUuid, featured.uuid))
    .where(and(eq(featured.slug, featuredSlug), eq(games.status, 'online'), isNull(games.deletedAt)))
    .orderBy(gamesToFeatured.sortOrder, desc(games.interact))
    .limit(limit);

  // 2. 如果运营数据不足，自动补充
  let autoGames: any[] = [];
  const remainingCount = limit - manualGames.length;

  if (remainingCount > 0) {
    // 获取已关联的游戏 UUID，避免重复
    const manualGameUuids = manualGames.map((g) => g.uuid);

    // 根据策略自动补充
    const orderByClause =
      autoFillStrategy === 'interact' ? [desc(games.interact), desc(games.upvoteCount)] : [desc(games.createdAt)];

    const whereClause = and(
      eq(games.status, 'online'),
      isNull(games.deletedAt),
      manualGameUuids.length > 0 ? notInArray(games.uuid, manualGameUuids) : undefined,
    );

    autoGames = await client
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
        sortOrder: sql<number>`999999`, // 自动数据排在后面
      })
      .from(games)
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(remainingCount);
  }

  // 3. 合并结果并翻译游戏名称
  const allGames = [...manualGames, ...autoGames];

  return allGames.map((game) => ({
    uuid: game.uuid,
    name: getTranslatedGameName(game.name, game.nameI18n, locale),
    slug: game.slug,
    thumbnail: game.thumbnail,
    rating: game.rating || 0,
    interact: game.interact || 0,
    upvoteCount: game.upvoteCount || 0,
    createdAt: game.createdAt,
    isManual: (game.sortOrder as number) < 999999, // sortOrder < 999999 表示运营数据
  }));
}

/**
 * 获取 Hot Games（首页/列表页通用）with i18n support
 * 运营数据 + 按互动数排序的自动补充
 */
export async function getHotGames(
  limit: number = 16,
  db: D1Database,
  locale: LanguageCode = DEFAULT_LOCALE,
): Promise<GameItem[]> {
  return getFeaturedGames(
    {
      featuredSlug: 'hot',
      limit,
      autoFillStrategy: 'interact',
      locale,
    },
    db,
  );
}

/**
 * 获取 New Games（首页/列表页通用）with i18n support
 * 运营数据 + 按创建时间排序的自动补充
 */
export async function getNewGames(
  limit: number = 16,
  db: D1Database,
  locale: LanguageCode = DEFAULT_LOCALE,
): Promise<GameItem[]> {
  return getFeaturedGames(
    {
      featuredSlug: 'new',
      limit,
      autoFillStrategy: 'created_at',
      locale,
    },
    db,
  );
}

/**
 * 获取分页的特性游戏（用于列表页）with i18n support
 */
export async function getPaginatedFeaturedGames(
  featuredSlug: 'hot' | 'new',
  page: number = 1,
  limit: number = 20,
  db: D1Database,
  locale: LanguageCode = DEFAULT_LOCALE,
) {
  const autoFillStrategy = featuredSlug === 'hot' ? 'interact' : 'created_at';
  const client = createDrizzleClient(db);

  // 计算总数（只统计在线游戏）
  const [{ total }] = await client
    .select({ total: count() })
    .from(games)
    .where(and(eq(games.status, 'online'), isNull(games.deletedAt)));

  // 获取所有数据（先获取足够多的数据，然后手动分页）
  // 注意：这里为了保证运营数据优先的顺序，我们获取所有数据再分页
  const totalGames = Number(total);
  const allGames = await getFeaturedGames(
    {
      featuredSlug,
      limit: totalGames, // 获取所有数据
      autoFillStrategy,
      locale,
    },
    db,
  );

  // 手动分页
  const offset = (page - 1) * limit;
  const paginatedGames = allGames.slice(offset, offset + limit);

  return {
    games: paginatedGames,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalGames / limit),
      totalItems: totalGames,
      itemsPerPage: limit,
    },
  };
}
