/**
 * 分类数据预览与改写接口
 * POST /api/admin/fetch/categories/preview - 从母站点拉取数据并执行改写，返回对比数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { isNull } from 'drizzle-orm';
import { getCloudflareEnv } from '@/services/base';
import { createDrizzleClient } from '@/db/client';
import { categories } from '@/db/schema';
import { requireAdmin } from '@/lib/auth-helpers';
import { fetchCategories } from '@/services/fetch/client';
import { ContentRewriter } from '@/services/content/rewriter';
import type { SEOContent } from '@/services/content/rewrite-prompts';

interface PreviewRequestBody {
  uuids?: string[]; // 可选：指定要处理的 UUID 列表
  enableRewrite?: boolean; // 是否启用改写，默认 true
}

interface PreviewItem {
  uuid: string;
  name: string;
  slug: string;
  iconUrl?: string;
  status: 'new' | 'existing';
  original: SEOContent;
  rewritten: SEOContent | null;
  rewriteAttempts: number;
}

interface PreviewResponse {
  success: boolean;
  items: PreviewItem[];
  summary: {
    total: number;
    new: number;
    existing: number;
    rewritten: number;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<PreviewResponse>> {
  try {
    // 1. 验证管理员权限
    await requireAdmin(request);

    // 2. 解析请求体
    const body: PreviewRequestBody = await request.json();
    const { uuids, enableRewrite = true } = body;

    // 3. 从母站点拉取数据
    const { data: remoteCategories, error: fetchError } = await fetchCategories();

    if (fetchError) {
      return NextResponse.json(
        {
          success: false,
          items: [],
          summary: { total: 0, new: 0, existing: 0, rewritten: 0 },
          error: `Failed to fetch from parent site: ${fetchError.message}`,
        },
        { status: 500 },
      );
    }

    // 4. 过滤指定 UUID（如果提供）
    let categoriesToProcess = remoteCategories;
    if (uuids && Array.isArray(uuids) && uuids.length > 0) {
      const uuidSet = new Set(uuids);
      categoriesToProcess = remoteCategories.filter((cat) => uuidSet.has(cat.uuid));
    }

    if (categoriesToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
        summary: { total: 0, new: 0, existing: 0, rewritten: 0 },
      });
    }

    // 5. 检查本地已存在的记录
    const env = await getCloudflareEnv();
    const db = createDrizzleClient(env.DB);

    const existingCategories = await db
      .select({ uuid: categories.uuid })
      .from(categories)
      .where(isNull(categories.deletedAt));

    const existingUuidSet = new Set(existingCategories.map((c) => c.uuid));

    // 6. 识别新记录并执行改写
    const rewriter = new ContentRewriter();
    const items: PreviewItem[] = await Promise.all(
      categoriesToProcess.map(async (cat) => {
        const isNew = !existingUuidSet.has(cat.uuid);
        const original: SEOContent = {
          metadataTitle: cat.metadataTitle || cat.name,
          metadataDescription: cat.metadataDescription || '',
          content: cat.content || '',
        };

        let rewritten: SEOContent | null = null;
        if (isNew && enableRewrite) {
          try {
            // 对新记录执行改写
            rewritten = await rewriter.rewriteSEOContent(original, {
              entity: 'category',
              originalName: cat.name,
              seoOptimize: true,
            });
          } catch (error) {
            console.error(`[Preview] Failed to rewrite category ${cat.name}:`, error);
            rewritten = null; // 改写失败时返回 null
          }
        }

        return {
          uuid: cat.uuid,
          name: cat.name,
          slug: cat.slug,
          iconUrl: cat.iconUrl,
          status: isNew ? ('new' as const) : ('existing' as const),
          original,
          rewritten,
          rewriteAttempts: rewritten ? 1 : 0,
        };
      }),
    );

    // 7. 返回对比数据
    const summary = {
      total: items.length,
      new: items.filter((i) => i.status === 'new').length,
      existing: items.filter((i) => i.status === 'existing').length,
      rewritten: items.filter((i) => i.rewritten !== null).length,
    };

    return NextResponse.json({
      success: true,
      items,
      summary,
    });
  } catch (error: any) {
    console.error('[Preview Categories] Error:', error);
    return NextResponse.json(
      {
        success: false,
        items: [],
        summary: { total: 0, new: 0, existing: 0, rewritten: 0 },
        error: error.message || 'Failed to preview categories',
      },
      { status: 500 },
    );
  }
}
