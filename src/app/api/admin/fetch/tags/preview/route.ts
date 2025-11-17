/**
 * 标签数据预览与改写接口
 * POST /api/admin/fetch/tags/preview - 从母站点拉取数据并执行改写，返回对比数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { isNull } from 'drizzle-orm';
import { getCloudflareEnv } from '@/services/base';
import { createDrizzleClient } from '@/db/client';
import { tags } from '@/db/schema';
import { requireAdmin } from '@/lib/auth-helpers';
import { fetchTags } from '@/services/fetch/client';
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

    const { data: remoteTags, error: fetchError } = await fetchTags();

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

    let tagsToProcess = remoteTags;
    if (uuids && Array.isArray(uuids) && uuids.length > 0) {
      const uuidSet = new Set(uuids);
      tagsToProcess = remoteTags.filter((tag) => uuidSet.has(tag.uuid));
    }

    if (tagsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
        summary: { total: 0, new: 0, existing: 0, rewritten: 0 },
      });
    }

    const env = await getCloudflareEnv();
    const db = createDrizzleClient(env.DB);

    const existingTags = await db.select({ uuid: tags.uuid }).from(tags).where(isNull(tags.deletedAt));

    const existingUuidSet = new Set(existingTags.map((t) => t.uuid));

    const rewriter = new ContentRewriter();
    const items: PreviewItem[] = await Promise.all(
      tagsToProcess.map(async (tag) => {
        const isNew = !existingUuidSet.has(tag.uuid);
        const original: SEOContent = {
          metadataTitle: tag.metadataTitle || tag.name,
          metadataDescription: tag.metadataDescription || '',
          content: tag.content || '',
        };

        let rewritten: SEOContent | null = null;
        if (isNew && enableRewrite) {
          try {
            rewritten = await rewriter.rewriteSEOContent(original, {
              entity: 'tag',
              originalName: tag.name,
              seoOptimize: true,
            });
          } catch (error) {
            console.error(`[Preview] Failed to rewrite tag ${tag.name}:`, error);
            rewritten = null;
          }
        }

        return {
          uuid: tag.uuid,
          name: tag.name,
          slug: tag.slug,
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
    console.error('[Preview Tags] Error:', error);
    return NextResponse.json(
      {
        success: false,
        items: [],
        summary: { total: 0, new: 0, existing: 0, rewritten: 0 },
        error: error.message || 'Failed to preview tags',
      },
      { status: 500 },
    );
  }
}
