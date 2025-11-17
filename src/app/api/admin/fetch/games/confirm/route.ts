/**
 * 游戏数据确认导入接口
 * POST /api/admin/fetch/games/confirm - 处理审核决策并导入游戏数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { requireAdmin } from '@/lib/auth-helpers';
import { fetchGameByUuid } from '@/services/fetch/client';
import { importGamesWithUuids, type GameImportDataWithUuids } from '@/services/content/games';
import { ContentRewriter } from '@/services/content/rewriter';
import type { SEOContent } from '@/services/content/rewrite-prompts';

type ItemAction = 'use_original' | 'use_rewritten' | 'skip' | 'rewrite';

interface ConfirmRequestBody {
  uuid: string;
  action: ItemAction;
  rewriteOptions?: {
    temperature?: number;
  };
  contentDecision?: {
    original: SEOContent;
    rewritten: SEOContent;
  };
}

interface RewriteResponse {
  success: boolean;
  rewritten: SEOContent;
  needsConfirmation: true;
}

interface ImportResponse {
  success: boolean;
  imported: number;
  skipped: number;
  details: {
    created: string[];
    updated: string[];
    skipped: string[];
  };
}

type ConfirmResponse = RewriteResponse | ImportResponse | { success: false; error: string };

export async function POST(request: NextRequest): Promise<NextResponse<ConfirmResponse>> {
  try {
    await requireAdmin(request);

    const body: ConfirmRequestBody = await request.json();
    const { uuid, action, rewriteOptions, contentDecision } = body;

    if (!uuid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Game UUID is required',
        },
        { status: 400 },
      );
    }

    // 1. 处理重新改写请求
    if (action === 'rewrite') {
      const { data: gameData, error: fetchError } = await fetchGameByUuid(uuid);

      if (fetchError || !gameData) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to fetch game: ${fetchError?.message || 'Not found'}`,
          },
          { status: 500 },
        );
      }

      const rewriter = new ContentRewriter();

      const original: SEOContent = {
        metadataTitle: gameData.introduction?.metadataTitle || '',
        metadataDescription: gameData.introduction?.metadataDescription || '',
        content: gameData.introduction?.content || '',
      };

      const rewritten = await rewriter.rewriteSEOContent(original, {
        entity: 'game',
        originalName: gameData.name,
        seoOptimize: true,
        temperature: rewriteOptions?.temperature || 0.5,
      });

      return NextResponse.json({
        success: true,
        rewritten,
        needsConfirmation: true,
      });
    }

    // 2. 处理跳过请求
    if (action === 'skip') {
      return NextResponse.json({
        success: true,
        imported: 0,
        skipped: 1,
        details: {
          created: [],
          updated: [],
          skipped: [uuid],
        },
      });
    }

    // 3. 处理最终导入
    const env = await getCloudflareEnv();
    const { data: gameData, error: fetchError } = await fetchGameByUuid(uuid);

    if (fetchError || !gameData) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch game: ${fetchError?.message || 'Not found'}`,
        },
        { status: 500 },
      );
    }

    // 4. 准备导入数据
    let contentToUse: SEOContent;

    if (contentDecision) {
      // 使用前端传递的决策内容
      contentToUse = action === 'use_rewritten' ? contentDecision.rewritten : contentDecision.original;
    } else {
      // 降级：使用原始内容
      contentToUse = {
        metadataTitle: gameData.introduction?.metadataTitle || gameData.name,
        metadataDescription: gameData.introduction?.metadataDescription || '',
        content: gameData.introduction?.content || '',
      };
    }

    // 5. 构建游戏导入数据（使用 UUID）
    const gameImportData: GameImportDataWithUuids = {
      uuid: gameData.uuid, // 保留原始 UUID
      name: gameData.name,
      slug: gameData.slug,
      thumbnail: gameData.thumbnail || '',
      source: gameData.source || '',
      status: gameData.status,
      nameI18n: gameData.nameI18n,
      // 使用 UUID 数组
      categoryUuids: gameData.categories || [],
      tagUuids: gameData.tags || [],
      featuredUuids: gameData.featured || [],
      introduction: {
        metaTitle: contentToUse.metadataTitle,
        metaDescription: contentToUse.metadataDescription,
        content: contentToUse.content,
      },
    };

    // 6. 执行导入（使用 UUID-based import）
    const result = await importGamesWithUuids([gameImportData], 'skip_existing', env.DB);

    const created = result.items.filter((r) => r.status === 'created').map((r) => r.uuid!);
    const updated = result.items.filter((r) => r.status === 'updated').map((r) => r.uuid!);

    return NextResponse.json({
      success: true,
      imported: result.created + result.updated,
      skipped: result.skipped,
      details: {
        created,
        updated,
        skipped: [],
      },
    });
  } catch (error: any) {
    console.error('[Confirm Game] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to confirm game',
      },
      { status: 500 },
    );
  }
}
