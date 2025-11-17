/**
 * 标签数据确认导入接口
 * POST /api/admin/fetch/tags/confirm - 处理审核决策并导入数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { requireAdmin } from '@/lib/auth-helpers';
import { fetchTagsByUuids } from '@/services/fetch/client';
import { importTags, type TagImportData } from '@/services/content/tags';
import { ContentRewriter } from '@/services/content/rewriter';
import type { SEOContent } from '@/services/content/rewrite-prompts';

type ItemAction = 'use_original' | 'use_rewritten' | 'skip' | 'rewrite';

interface ConfirmRequestItem {
  uuid: string;
  action: ItemAction;
  rewriteOptions?: {
    temperature?: number;
  };
  selectedContent?: SEOContent;
}

interface ConfirmRequestBody {
  items: ConfirmRequestItem[];
}

interface RewriteResponse {
  success: boolean;
  rewrittenItems: Array<{
    uuid: string;
    rewritten: SEOContent;
  }>;
  needsConfirmation: true;
}

interface ImportResponse {
  success: boolean;
  imported: number;
  skipped: number;
  failed: number;
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
    const { items } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No items provided',
        },
        { status: 400 },
      );
    }

    const rewriteItems = items.filter((item) => item.action === 'rewrite');

    if (rewriteItems.length > 0) {
      const uuids = rewriteItems.map((item) => item.uuid);
      const { data: remoteTags, error: fetchError } = await fetchTagsByUuids(uuids);

      if (fetchError) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to fetch tags: ${fetchError.message}`,
          },
          { status: 500 },
        );
      }

      const rewriter = new ContentRewriter();
      const rewrittenItems = await Promise.all(
        rewriteItems.map(async (item) => {
          const tag = remoteTags.find((t) => t.uuid === item.uuid);
          if (!tag) {
            throw new Error(`Tag with UUID ${item.uuid} not found`);
          }

          const original: SEOContent = {
            metadataTitle: tag.metadataTitle || tag.name,
            metadataDescription: tag.metadataDescription || '',
            content: tag.content || '',
          };

          const rewritten = await rewriter.rewriteSEOContent(original, {
            entity: 'tag',
            originalName: tag.name,
            seoOptimize: true,
            temperature: item.rewriteOptions?.temperature || 0.5,
          });

          return {
            uuid: item.uuid,
            rewritten,
          };
        }),
      );

      return NextResponse.json({
        success: true,
        rewrittenItems,
        needsConfirmation: true,
      });
    }

    const env = await getCloudflareEnv();

    const importUuids = items.filter((item) => item.action !== 'skip').map((item) => item.uuid);

    if (importUuids.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        skipped: items.length,
        failed: 0,
        details: {
          created: [],
          updated: [],
          skipped: items.filter((item) => item.action === 'skip').map((item) => item.uuid),
        },
      });
    }

    const { data: remoteTags, error: fetchError } = await fetchTagsByUuids(importUuids);

    if (fetchError) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch tags: ${fetchError.message}`,
        },
        { status: 500 },
      );
    }

    const importData: TagImportData[] = [];
    const skipList: string[] = [];

    for (const item of items) {
      if (item.action === 'skip') {
        skipList.push(item.uuid);
        continue;
      }

      const tagData = remoteTags.find((t) => t.uuid === item.uuid);
      if (!tagData) {
        console.error(`Tag with UUID ${item.uuid} not found`);
        continue;
      }

      let contentToUse: SEOContent;

      if (item.selectedContent) {
        contentToUse = item.selectedContent;
      } else if (item.action === 'use_original') {
        contentToUse = {
          metadataTitle: tagData.metadataTitle || tagData.name,
          metadataDescription: tagData.metadataDescription || '',
          content: tagData.content || '',
        };
      } else {
        contentToUse = {
          metadataTitle: tagData.metadataTitle || tagData.name,
          metadataDescription: tagData.metadataDescription || '',
          content: tagData.content || '',
        };
      }

      importData.push({
        uuid: tagData.uuid,
        name: tagData.name,
        slug: tagData.slug,
        content: contentToUse.content,
        metaTitle: contentToUse.metadataTitle,
        metaDescription: contentToUse.metadataDescription,
      });
    }

    const result = await importTags(importData, 'skip_existing', env.DB);

    return NextResponse.json({
      success: true,
      imported: result.created + result.updated,
      skipped: skipList.length,
      failed: result.failed,
      details: {
        created: result.items.filter((r) => r.status === 'created').map((r) => r.uuid!),
        updated: result.items.filter((r) => r.status === 'updated').map((r) => r.uuid!),
        skipped: skipList,
      },
    });
  } catch (error: any) {
    console.error('[Confirm Tags] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to confirm tags',
      },
      { status: 500 },
    );
  }
}
