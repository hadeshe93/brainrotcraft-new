/**
 * 母站点 - 游戏数据提供接口
 * GET /api/fetch/games - 提供所有游戏数据（包含关联关系和介绍，不包含翻译）
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, isNull } from 'drizzle-orm';
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

export async function GET(request: NextRequest) {
  try {
    // 验证 API Key
    const authError = await validateApiKey(request);
    if (authError) return authError;

    // 获取数据库
    const env = await getCloudflareEnv();
    const db = createDrizzleClient(env.DB);

    // 获取所有游戏（未删除的）
    const allGames = await db.select().from(games).where(isNull(games.deletedAt)).orderBy(games.createdAt);

    // 批量获取关联数据
    const gameUuids = allGames.map((g) => g.uuid);

    // 获取所有游戏的分类关联
    const categoryRelations = await db
      .select({
        gameUuid: gamesToCategories.gameUuid,
        categoryUuid: gamesToCategories.categoryUuid,
      })
      .from(gamesToCategories)
      .orderBy(gamesToCategories.sortOrder);

    // 获取所有游戏的标签关联
    const tagRelations = await db
      .select({
        gameUuid: gamesToTags.gameUuid,
        tagUuid: gamesToTags.tagUuid,
      })
      .from(gamesToTags)
      .orderBy(gamesToTags.sortOrder);

    // 获取所有游戏的特性合集关联
    const featuredRelations = await db
      .select({
        gameUuid: gamesToFeatured.gameUuid,
        featuredUuid: gamesToFeatured.featuredUuid,
      })
      .from(gamesToFeatured)
      .orderBy(gamesToFeatured.sortOrder);

    // 获取所有游戏的介绍
    const allIntroductions = await db.select().from(introductions).where(isNull(introductions.deletedAt));

    // 构建关联映射
    const categoryMap = new Map<string, string[]>();
    categoryRelations.forEach((rel) => {
      const list = categoryMap.get(rel.gameUuid) || [];
      list.push(rel.categoryUuid);
      categoryMap.set(rel.gameUuid, list);
    });

    const tagMap = new Map<string, string[]>();
    tagRelations.forEach((rel) => {
      const list = tagMap.get(rel.gameUuid) || [];
      list.push(rel.tagUuid);
      tagMap.set(rel.gameUuid, list);
    });

    const featuredMap = new Map<string, string[]>();
    featuredRelations.forEach((rel) => {
      const list = featuredMap.get(rel.gameUuid) || [];
      list.push(rel.featuredUuid);
      featuredMap.set(rel.gameUuid, list);
    });

    const introductionMap = new Map<string, (typeof allIntroductions)[0]>();
    allIntroductions.forEach((intro) => {
      introductionMap.set(intro.gameUuid, intro);
    });

    // 转换数据格式
    const fetchData = allGames.map((game) => {
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
    console.error('[Fetch API] Error fetching games:', error);
    return createFetchError('Failed to fetch games: ' + error.message, 500, request);
  }
}
