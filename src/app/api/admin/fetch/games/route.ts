/**
 * 子站点 - 游戏数据拉取接口
 * POST /api/admin/fetch/games - 从母站点拉取并导入游戏数据
 *
 * 处理流程：
 * 1. 拉取单个游戏数据
 * 2. 并发检查并导入缺失的分类/标签/特性合集依赖
 * 3. 导入游戏及其介绍
 * 4. 建立关联关系
 *
 * @deprecated 请使用新的双 API 模式代替：
 *   - POST /api/admin/fetch/games/preview - 预览并改写内容（含依赖检查）
 *   - POST /api/admin/fetch/games/confirm - 确认并导入
 * 保留此端点仅用于紧急回滚
 */

import { NextRequest, NextResponse } from 'next/server';
import { isNull, inArray } from 'drizzle-orm';
import { getCloudflareEnv } from '@/services/base';
import { createDrizzleClient } from '@/db/client';
import { games, categories, tags, featured } from '@/db/schema';
import { requireAdmin } from '@/lib/auth-helpers';
import {
  fetchGameByUuid,
  fetchCategoriesByUuids,
  fetchTagsByUuids,
  fetchFeaturedByUuids,
} from '@/services/fetch/client';
import { importGames, GameImportData, GameRelationsData, GameIntroductionData } from '@/services/content/games';
import { importCategories, CategoryImportData } from '@/services/content/categories';
import { importTags, TagImportData } from '@/services/content/tags';
import { importFeatured, FeaturedImportData } from '@/services/content/featured';

/**
 * 并发处理游戏依赖 - 检查并导入缺失的分类/标签/特性合集
 */
async function handleGameDependencies(
  gameData: {
    categories: string[];
    tags: string[];
    featured: string[];
  },
  db: any,
) {
  const dependencyConfigs = [
    { uuids: gameData.categories, type: 'categories' as const },
    { uuids: gameData.tags, type: 'tags' as const },
    { uuids: gameData.featured, type: 'featured' as const },
  ];

  // 创建并发任务数组
  const tasks = dependencyConfigs.map(async (config) => {
    try {
      if (config.uuids.length === 0) {
        return { type: config.type, imported: 0, skipped: 0 };
      }

      // 1. 检查本地缺失的 UUID
      let existingUuids: string[] = [];
      if (config.type === 'categories') {
        const existing = await createDrizzleClient(db)
          .select({ uuid: categories.uuid })
          .from(categories)
          .where(inArray(categories.uuid, config.uuids));
        existingUuids = existing.map((e) => e.uuid);
      } else if (config.type === 'tags') {
        const existing = await createDrizzleClient(db)
          .select({ uuid: tags.uuid })
          .from(tags)
          .where(inArray(tags.uuid, config.uuids));
        existingUuids = existing.map((e) => e.uuid);
      } else if (config.type === 'featured') {
        const existing = await createDrizzleClient(db)
          .select({ uuid: featured.uuid })
          .from(featured)
          .where(inArray(featured.uuid, config.uuids));
        existingUuids = existing.map((e) => e.uuid);
      }

      const existingSet = new Set(existingUuids);
      const missingUuids = config.uuids.filter((uuid) => !existingSet.has(uuid));

      if (missingUuids.length === 0) {
        return { type: config.type, imported: 0, skipped: config.uuids.length };
      }

      // 2. 从母站点拉取缺失的数据
      let fetchResult;
      if (config.type === 'categories') {
        fetchResult = await fetchCategoriesByUuids(missingUuids);
        if (fetchResult.error) throw new Error(fetchResult.error.message);

        const importData: CategoryImportData[] = fetchResult.data.map((cat) => ({
          uuid: cat.uuid,
          name: cat.name,
          slug: cat.slug,
          iconUrl: cat.iconUrl,
          content: cat.content || '',
          metaTitle: cat.metadataTitle || cat.name,
          metaDescription: cat.metadataDescription || '',
        }));
        const result = await importCategories(importData, 'skip_existing', db);
        return { type: config.type, imported: result.created, skipped: result.skipped };
      } else if (config.type === 'tags') {
        fetchResult = await fetchTagsByUuids(missingUuids);
        if (fetchResult.error) throw new Error(fetchResult.error.message);

        const importData: TagImportData[] = fetchResult.data.map((tag) => ({
          uuid: tag.uuid,
          name: tag.name,
          slug: tag.slug,
          content: tag.content || '',
          metaTitle: tag.metadataTitle || tag.name,
          metaDescription: tag.metadataDescription || '',
        }));
        const result = await importTags(importData, 'skip_existing', db);
        return { type: config.type, imported: result.created, skipped: result.skipped };
      } else if (config.type === 'featured') {
        fetchResult = await fetchFeaturedByUuids(missingUuids);
        if (fetchResult.error) throw new Error(fetchResult.error.message);

        const importData: FeaturedImportData[] = fetchResult.data.map((item) => ({
          uuid: item.uuid,
          name: item.name,
          slug: item.slug,
          content: item.content || '',
          metaTitle: item.metadataTitle || item.name,
          metaDescription: item.metadataDescription || '',
        }));
        const result = await importFeatured(importData, 'skip_existing', db);
        return { type: config.type, imported: result.created, skipped: result.skipped };
      }

      return { type: config.type, imported: 0, skipped: 0 };
    } catch (error: any) {
      console.error(`Failed to import ${config.type}:`, error);
      return {
        type: config.type,
        error: error.message,
        imported: 0,
        skipped: 0,
      };
    }
  });

  // 使用 Promise.allSettled 确保即使某个依赖失败也能继续
  const results = await Promise.allSettled(tasks);

  // 检查是否有失败的依赖
  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    console.warn('Some dependencies failed to import:', failures);
  }

  return results.map((r) => (r.status === 'fulfilled' ? r.value : { error: r.reason }));
}

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    await requireAdmin(request);

    // 解析请求体
    const body = await request.json();
    const { uuid } = body;

    if (!uuid || typeof uuid !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'UUID is required',
        },
        { status: 400 },
      );
    }

    // 1. 检查游戏是否已存在
    const env = await getCloudflareEnv();
    const db = createDrizzleClient(env.DB);

    const existingGames = await db.select({ uuid: games.uuid }).from(games).where(isNull(games.deletedAt));

    const existingUuidSet = new Set(existingGames.map((g) => g.uuid));

    if (existingUuidSet.has(uuid)) {
      return NextResponse.json({
        success: true,
        imported: 0,
        skipped: 1,
        message: 'Game already exists locally',
      });
    }

    // 2. 从母站点拉取游戏数据
    const { data: gameData, error: fetchError } = await fetchGameByUuid(uuid);

    if (fetchError) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch game from parent site: ${fetchError.message}`,
          errorType: fetchError.type,
        },
        { status: 500 },
      );
    }

    if (!gameData) {
      return NextResponse.json(
        {
          success: false,
          error: `Game with UUID ${uuid} not found on parent site`,
        },
        { status: 404 },
      );
    }

    // 3. 并发处理依赖（分类、标签、特性合集）
    const dependencyResults = await handleGameDependencies(
      {
        categories: gameData.categories,
        tags: gameData.tags,
        featured: gameData.featured,
      },
      env.DB,
    );

    // 4. 导入游戏数据
    const importData: GameImportData[] = [
      {
        uuid: gameData.uuid,
        name: gameData.name,
        slug: gameData.slug,
        thumbnail: gameData.thumbnail,
        source: gameData.source,
        status: gameData.status,
        nameI18n: gameData.nameI18n,
      },
    ];

    // 5. 构建关联数据
    const relations: GameRelationsData[] = [
      {
        gameUuid: gameData.uuid,
        categoryUuids: gameData.categories,
        tagUuids: gameData.tags,
        featuredUuids: gameData.featured,
      },
    ];

    // 6. 构建介绍数据
    const introductions: GameIntroductionData[] = gameData.introduction
      ? [
          {
            gameUuid: gameData.uuid,
            introductionUuid: gameData.introduction.uuid,
            metadataTitle: gameData.introduction.metadataTitle,
            metadataDescription: gameData.introduction.metadataDescription,
            content: gameData.introduction.content,
          },
        ]
      : [];

    // 7. 执行导入
    const result = await importGames(importData, relations, introductions, 'skip_existing', env.DB);

    return NextResponse.json({
      success: true,
      imported: result.created,
      skipped: result.skipped,
      dependencies: dependencyResults,
      details: result,
    });
  } catch (error: any) {
    console.error('[Fetch Game] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch game',
      },
      { status: 500 },
    );
  }
}
