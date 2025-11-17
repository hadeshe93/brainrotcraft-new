/**
 * 特性合集数据确认导入接口
 * POST /api/admin/fetch/featured/confirm - 处理审核决策并导入数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { requireAdmin } from '@/lib/auth-helpers';
import { fetchFeaturedByUuids } from '@/services/fetch/client';
import { importFeatured, type FeaturedImportData } from '@/services/content/featured';
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
      const { data: remoteFeatured, error: fetchError } = await fetchFeaturedByUuids(uuids);

      if (fetchError) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to fetch featured: ${fetchError.message}`,
          },
          { status: 500 },
        );
      }

      const rewriter = new ContentRewriter();
      const rewrittenItems = await Promise.all(
        rewriteItems.map(async (item) => {
          const featuredItem = remoteFeatured.find((f) => f.uuid === item.uuid);
          if (!featuredItem) {
            throw new Error(`Featured with UUID ${item.uuid} not found`);
          }

          const original: SEOContent = {
            metadataTitle: featuredItem.metadataTitle || featuredItem.name,
            metadataDescription: featuredItem.metadataDescription || '',
            content: featuredItem.content || '',
          };

          const rewritten = await rewriter.rewriteSEOContent(original, {
            entity: 'featured',
            originalName: featuredItem.name,
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

    const { data: remoteFeatured, error: fetchError } = await fetchFeaturedByUuids(importUuids);

    if (fetchError) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch featured: ${fetchError.message}`,
        },
        { status: 500 },
      );
    }

    const importData: FeaturedImportData[] = [];
    const skipList: string[] = [];

    for (const item of items) {
      if (item.action === 'skip') {
        skipList.push(item.uuid);
        continue;
      }

      const featuredData = remoteFeatured.find((f) => f.uuid === item.uuid);
      if (!featuredData) {
        console.error(`Featured with UUID ${item.uuid} not found`);
        continue;
      }

      let contentToUse: SEOContent;

      if (item.selectedContent) {
        contentToUse = item.selectedContent;
      } else if (item.action === 'use_original') {
        contentToUse = {
          metadataTitle: featuredData.metadataTitle || featuredData.name,
          metadataDescription: featuredData.metadataDescription || '',
          content: featuredData.content || '',
        };
      } else {
        contentToUse = {
          metadataTitle: featuredData.metadataTitle || featuredData.name,
          metadataDescription: featuredData.metadataDescription || '',
          content: featuredData.content || '',
        };
      }

      importData.push({
        uuid: featuredData.uuid,
        name: featuredData.name,
        slug: featuredData.slug,
        content: contentToUse.content,
        metaTitle: contentToUse.metadataTitle,
        metaDescription: contentToUse.metadataDescription,
      });
    }

    const result = await importFeatured(importData, 'skip_existing', env.DB);

    return NextResponse.json({
      success: true,
      imported: result.created + result.updated,
      skipped: skipList.length,
      failed: result.failed,
      details: {
        created: result.items.filter((r) => r.status === 'created').map((r) => r.slug!),
        updated: result.items.filter((r) => r.status === 'updated').map((r) => r.slug!),
        skipped: skipList,
      },
    });
  } catch (error: any) {
    console.error('[Confirm Featured] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to confirm featured',
      },
      { status: 500 },
    );
  }
}
