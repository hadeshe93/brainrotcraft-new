/**
 * 母站点 - 按 UUID 批量获取游戏数据接口
 * POST /api/fetch/games/by-uuids - 根据提供的 UUID 列表返回对应的游戏数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, isNull, inArray } from 'drizzle-orm';
import { getCloudflareEnv } from '@/services/base';
import { createDrizzleClient } from '@/db/client';
import { games, gamesToCategories, gamesToTags, gamesToFeatured, introductions } from '@/db/schema';
import { validateApiKey, createFetchResponse, createFetchError } from '@/lib/fetch-auth';
import { addCorsHeaders } from '@/lib/fetch-cors';

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  const origin = request.headers.get('origin');
  return addCorsHeaders(response, origin);
}

export async function POST(request: NextRequest) {
  try {
    // 验证 API Key
    const authError = await validateApiKey(request);
    if (authError) return authError;

    // 解析请求体
    const body: { uuids?: unknown } = await request.json();
    const { uuids } = body;

    if (!Array.isArray(uuids) || uuids.length === 0) {
      return createFetchError('uuids array is required and must not be empty', 400, request);
    }

    // 获取数据库
    const env = await getCloudflareEnv();
    const db = createDrizzleClient(env.DB);

    // 获取指定 UUID 的游戏（未删除的）
    const allGames = await db.select().from(games).where(inArray(games.uuid, uuids)).orderBy(games.createdAt);

    if (allGames.length === 0) {
      return createFetchResponse([], undefined, request);
    }

    const gameUuids = allGames.map((g: { uuid: string }) => g.uuid);

    // 批量获取关联数据
    const categoryRelations = await db
      .select({
        gameUuid: gamesToCategories.gameUuid,
        categoryUuid: gamesToCategories.categoryUuid,
      })
      .from(gamesToCategories)
      .where(inArray(gamesToCategories.gameUuid, gameUuids))
      .orderBy(gamesToCategories.sortOrder);

    const tagRelations = await db
      .select({
        gameUuid: gamesToTags.gameUuid,
        tagUuid: gamesToTags.tagUuid,
      })
      .from(gamesToTags)
      .where(inArray(gamesToTags.gameUuid, gameUuids))
      .orderBy(gamesToTags.sortOrder);

    const featuredRelations = await db
      .select({
        gameUuid: gamesToFeatured.gameUuid,
        featuredUuid: gamesToFeatured.featuredUuid,
      })
      .from(gamesToFeatured)
      .where(inArray(gamesToFeatured.gameUuid, gameUuids))
      .orderBy(gamesToFeatured.sortOrder);

    const allIntroductions = await db.select().from(introductions).where(inArray(introductions.gameUuid, gameUuids));

    // 构建关联映射
    const categoryMap = new Map<string, string[]>();
    categoryRelations.forEach((rel: { gameUuid: string; categoryUuid: string }) => {
      const list = categoryMap.get(rel.gameUuid) || [];
      list.push(rel.categoryUuid);
      categoryMap.set(rel.gameUuid, list);
    });

    const tagMap = new Map<string, string[]>();
    tagRelations.forEach((rel: { gameUuid: string; tagUuid: string }) => {
      const list = tagMap.get(rel.gameUuid) || [];
      list.push(rel.tagUuid);
      tagMap.set(rel.gameUuid, list);
    });

    const featuredMap = new Map<string, string[]>();
    featuredRelations.forEach((rel: { gameUuid: string; featuredUuid: string }) => {
      const list = featuredMap.get(rel.gameUuid) || [];
      list.push(rel.featuredUuid);
      featuredMap.set(rel.gameUuid, list);
    });

    const introductionMap = new Map<string, (typeof allIntroductions)[0]>();
    allIntroductions.forEach((intro: (typeof allIntroductions)[0]) => {
      introductionMap.set(intro.gameUuid, intro);
    });

    // 转换数据格式
    const fetchData = allGames.map((game: (typeof allGames)[0]) => {
      const intro = introductionMap.get(game.uuid);

      return {
        // 游戏基本信息（排除 id）
        uuid: game.uuid,
        name: game.name,
        slug: game.slug,
        thumbnail: game.thumbnail,
        source: game.source,
        status: game.status,
        nameI18n: game.nameI18n,
        interact: game.interact,
        rating: game.rating,
        ratingCount: game.ratingCount,
        upvoteCount: game.upvoteCount,
        downvoteCount: game.downvoteCount,
        saveCount: game.saveCount,
        shareCount: game.shareCount,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,

        // 新增：上线状态
        isPublished: game.status === 'online',
        publishedAt: game.status === 'online' ? new Date(game.createdAt * 1000).toISOString() : null,

        // 关联数据（UUID数组）
        categories: categoryMap.get(game.uuid) || [],
        tags: tagMap.get(game.uuid) || [],
        featured: featuredMap.get(game.uuid) || [],

        // 游戏介绍（排除 id 和 gameUuid）
        introduction: intro
          ? {
              uuid: intro.uuid,
              metadataTitle: intro.metadataTitle,
              metadataDescription: intro.metadataDescription,
              content: intro.content,
            }
          : undefined,
      };
    });

    return createFetchResponse(fetchData, undefined, request);
  } catch (error: any) {
    console.error('[Fetch API] Error fetching games by UUIDs:', error);
    return createFetchError('Failed to fetch games by UUIDs: ' + error.message, 500, request);
  }
}
