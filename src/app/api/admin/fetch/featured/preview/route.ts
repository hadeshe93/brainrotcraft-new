/**
 * 特性合集数据预览与改写接口
 * POST /api/admin/fetch/featured/preview - 从母站点拉取数据并执行改写，返回对比数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { isNull } from 'drizzle-orm';
import { getCloudflareEnv } from '@/services/base';
import { createDrizzleClient } from '@/db/client';
import { featured } from '@/db/schema';
import { requireAdmin } from '@/lib/auth-helpers';
import { fetchFeatured } from '@/services/fetch/client';
import { ContentRewriter } from '@/services/content/rewriter';
import type { SEOContent } from '@/services/content/rewrite-prompts';

interface PreviewRequestBody {
  uuids?: string[];
  enableRewrite?: boolean;
}

interface PreviewItem {
  uuid: string;
  name: string;
  slug: string;
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
    await requireAdmin(request);

    const body: PreviewRequestBody = await request.json();
    const { uuids, enableRewrite = true } = body;

    const { data: remoteFeatured, error: fetchError } = await fetchFeatured();

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

    let featuredToProcess = remoteFeatured;
    if (uuids && Array.isArray(uuids) && uuids.length > 0) {
      const uuidSet = new Set(uuids);
      featuredToProcess = remoteFeatured.filter((item) => uuidSet.has(item.uuid));
    }

    if (featuredToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
        summary: { total: 0, new: 0, existing: 0, rewritten: 0 },
      });
    }

    const env = await getCloudflareEnv();
    const db = createDrizzleClient(env.DB);

    const existingFeatured = await db.select({ uuid: featured.uuid }).from(featured).where(isNull(featured.deletedAt));

    const existingUuidSet = new Set(existingFeatured.map((f) => f.uuid));

    const rewriter = new ContentRewriter();
    const items: PreviewItem[] = await Promise.all(
      featuredToProcess.map(async (item) => {
        const isNew = !existingUuidSet.has(item.uuid);
        const original: SEOContent = {
          metadataTitle: item.metadataTitle || item.name,
          metadataDescription: item.metadataDescription || '',
          content: item.content || '',
        };

        let rewritten: SEOContent | null = null;
        if (isNew && enableRewrite) {
          try {
            rewritten = await rewriter.rewriteSEOContent(original, {
              entity: 'featured',
              originalName: item.name,
              seoOptimize: true,
            });
          } catch (error) {
            console.error(`[Preview] Failed to rewrite featured ${item.name}:`, error);
            rewritten = null;
          }
        }

        return {
          uuid: item.uuid,
          name: item.name,
          slug: item.slug,
          status: isNew ? ('new' as const) : ('existing' as const),
          original,
          rewritten,
          rewriteAttempts: rewritten ? 1 : 0,
        };
      }),
    );

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
    console.error('[Preview Featured] Error:', error);
    return NextResponse.json(
      {
        success: false,
        items: [],
        summary: { total: 0, new: 0, existing: 0, rewritten: 0 },
        error: error.message || 'Failed to preview featured',
      },
      { status: 500 },
    );
  }
}
