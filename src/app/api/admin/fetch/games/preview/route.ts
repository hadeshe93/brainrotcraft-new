/**
 * 游戏数据预览与改写接口
 * POST /api/admin/fetch/games/preview - 拉取游戏数据并检查依赖，返回对比数据或缺失依赖列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
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
import { ContentRewriter } from '@/services/content/rewriter';
import type { SEOContent } from '@/services/content/rewrite-prompts';

interface PreviewRequestBody {
  uuid: string; // 必需：单个游戏 UUID
  enableRewrite?: boolean;
}

interface MissingDependency {
  type: 'category' | 'tag' | 'featured';
  uuid: string;
  name: string;
  status: 'missing';
}

interface DependencyErrorResponse {
  success: false;
  error: 'Missing dependencies';
  missingDependencies: MissingDependency[];
  message: string;
}

interface PreviewResponse {
  success: true;
  game: {
    uuid: string;
    name: string;
    slug: string;
    thumbnail?: string;
    status: 'new' | 'existing';
    original: SEOContent;
    rewritten: SEOContent | null;
    categories: Array<{ uuid: string; name: string }>;
    tags: Array<{ uuid: string; name: string }>;
    featured: Array<{ uuid: string; name: string }>;
  };
}

type Response = PreviewResponse | DependencyErrorResponse | { success: false; error: string };

export async function POST(request: NextRequest): Promise<NextResponse<Response>> {
  try {
    await requireAdmin(request);

    const body: PreviewRequestBody = await request.json();
    const { uuid, enableRewrite = true } = body;

    if (!uuid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Game UUID is required',
        },
        { status: 400 },
      );
    }

    // 1. 从母站点拉取单个游戏
    const { data: gameData, error: fetchError } = await fetchGameByUuid(uuid);

    if (fetchError) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch game: ${fetchError.message}`,
        },
        { status: 500 },
      );
    }

    if (!gameData) {
      return NextResponse.json(
        {
          success: false,
          error: `Game with UUID ${uuid} not found`,
        },
        { status: 404 },
      );
    }

    const env = await getCloudflareEnv();
    const db = createDrizzleClient(env.DB);

    // 2. 检查依赖关系（不自动导入）
    const missingDependencies: MissingDependency[] = [];

    // 检查分类
    if (gameData.categories && gameData.categories.length > 0) {
      const existingUuidSet = new Set((await db.select({ uuid: categories.uuid }).from(categories)).map((c) => c.uuid));

      for (const categoryUuid of gameData.categories) {
        if (!existingUuidSet.has(categoryUuid)) {
          // 从母站点获取分类名称
          const { data: remoteCats } = await fetchCategoriesByUuids([categoryUuid]);
          const remoteCat = remoteCats.find((c) => c.uuid === categoryUuid);

          missingDependencies.push({
            type: 'category',
            uuid: categoryUuid,
            name: remoteCat?.name || 'Unknown',
            status: 'missing',
          });
        }
      }
    }

    // 检查标签
    if (gameData.tags && gameData.tags.length > 0) {
      const existingUuidSet = new Set((await db.select({ uuid: tags.uuid }).from(tags)).map((t) => t.uuid));

      for (const tagUuid of gameData.tags) {
        if (!existingUuidSet.has(tagUuid)) {
          const { data: remoteTags } = await fetchTagsByUuids([tagUuid]);
          const remoteTag = remoteTags.find((t) => t.uuid === tagUuid);

          missingDependencies.push({
            type: 'tag',
            uuid: tagUuid,
            name: remoteTag?.name || 'Unknown',
            status: 'missing',
          });
        }
      }
    }

    // 检查特性合集
    if (gameData.featured && gameData.featured.length > 0) {
      const existingUuidSet = new Set((await db.select({ uuid: featured.uuid }).from(featured)).map((f) => f.uuid));

      for (const featuredUuid of gameData.featured) {
        if (!existingUuidSet.has(featuredUuid)) {
          const { data: remoteFeatured } = await fetchFeaturedByUuids([featuredUuid]);
          const remoteFeat = remoteFeatured.find((f) => f.uuid === featuredUuid);

          missingDependencies.push({
            type: 'featured',
            uuid: featuredUuid,
            name: remoteFeat?.name || 'Unknown',
            status: 'missing',
          });
        }
      }
    }

    // 3. 如果有缺失依赖，立即返回错误
    if (missingDependencies.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing dependencies',
          missingDependencies,
          message: '发现缺失的依赖项，请先导入这些内容后再导入游戏',
        },
        { status: 400 },
      );
    }

    // 4. 检查游戏是否已存在
    const existingGame = await db.select({ uuid: games.uuid }).from(games).where(eq(games.uuid, uuid)).limit(1);

    const isNew = existingGame.length === 0;

    // 5. 准备原始内容
    const original: SEOContent = {
      metadataTitle: gameData.introduction?.metadataTitle || gameData.name,
      metadataDescription: gameData.introduction?.metadataDescription || '',
      content: gameData.introduction?.content || '',
    };

    // 6. 对新游戏执行改写
    let rewritten: SEOContent | null = null;
    if (isNew && enableRewrite && gameData.introduction) {
      try {
        const rewriter = new ContentRewriter();

        // 使用依赖上下文增强改写
        const { data: catData } = await fetchCategoriesByUuids(gameData.categories || []);
        const { data: tagData } = await fetchTagsByUuids(gameData.tags || []);

        const contextualKeywords = [...catData.map((c) => c.name), ...tagData.map((t) => t.name)];

        rewritten = await rewriter.rewriteSEOContent(original, {
          entity: 'game',
          originalName: gameData.name,
          seoOptimize: true,
          targetKeywords: contextualKeywords,
        });
      } catch (error) {
        console.error(`[Preview] Failed to rewrite game ${gameData.name}:`, error);
        rewritten = null;
      }
    }

    // 7. 获取依赖详情（用于前端展示）
    const { data: catData } = await fetchCategoriesByUuids(gameData.categories || []);
    const { data: tagData } = await fetchTagsByUuids(gameData.tags || []);
    const { data: featuredData } = await fetchFeaturedByUuids(gameData.featured || []);

    // 8. 返回对比数据（只有依赖都存在时才返回）
    return NextResponse.json({
      success: true,
      game: {
        uuid: gameData.uuid,
        name: gameData.name,
        slug: gameData.slug,
        thumbnail: gameData.thumbnail,
        status: isNew ? ('new' as const) : ('existing' as const),
        original,
        rewritten,
        categories: catData.map((c) => ({ uuid: c.uuid, name: c.name })),
        tags: tagData.map((t) => ({ uuid: t.uuid, name: t.name })),
        featured: featuredData.map((f) => ({ uuid: f.uuid, name: f.name })),
      },
    });
  } catch (error: any) {
    console.error('[Preview Game] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to preview game',
      },
      { status: 500 },
    );
  }
}
