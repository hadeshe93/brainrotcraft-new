/**
 * 分类数据确认导入接口
 * POST /api/admin/fetch/categories/confirm - 处理审核决策并导入数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { requireAdmin } from '@/lib/auth-helpers';
import { fetchCategoriesByUuids } from '@/services/fetch/client';
import { importCategories, type CategoryImportData } from '@/services/content/categories';
import { ContentRewriter } from '@/services/content/rewriter';
import type { SEOContent } from '@/services/content/rewrite-prompts';

type ItemAction = 'use_original' | 'use_rewritten' | 'skip' | 'rewrite';

interface ConfirmRequestItem {
  uuid: string;
  action: ItemAction;
  rewriteOptions?: {
    temperature?: number;
  };
  // 用户选择的内容（当 action 为 use_original 或 use_rewritten 时）
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
    // 1. 验证管理员权限
    await requireAdmin(request);

    // 2. 解析请求体
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

    // 3. 检查是否有需要重新改写的项
    const rewriteItems = items.filter((item) => item.action === 'rewrite');

    if (rewriteItems.length > 0) {
      // 拉取原始数据
      const uuids = rewriteItems.map((item) => item.uuid);
      const { data: remoteCategories, error: fetchError } = await fetchCategoriesByUuids(uuids);

      if (fetchError) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to fetch categories: ${fetchError.message}`,
          },
          { status: 500 },
        );
      }

      // 执行重新改写
      const rewriter = new ContentRewriter();
      const rewrittenItems = await Promise.all(
        rewriteItems.map(async (item) => {
          const category = remoteCategories.find((c) => c.uuid === item.uuid);
          if (!category) {
            throw new Error(`Category with UUID ${item.uuid} not found`);
          }

          const original: SEOContent = {
            metadataTitle: category.metadataTitle || category.name,
            metadataDescription: category.metadataDescription || '',
            content: category.content || '',
          };

          const rewritten = await rewriter.rewriteSEOContent(original, {
            entity: 'category',
            originalName: category.name,
            seoOptimize: true,
            temperature: item.rewriteOptions?.temperature || 0.5,
          });

          return {
            uuid: item.uuid,
            rewritten,
          };
        }),
      );

      // 返回重新改写的内容，需要再次确认
      return NextResponse.json({
        success: true,
        rewrittenItems,
        needsConfirmation: true,
      });
    }

    // 4. 处理最终导入
    const env = await getCloudflareEnv();

    // 拉取需要导入的分类数据
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

    const { data: remoteCategories, error: fetchError } = await fetchCategoriesByUuids(importUuids);

    if (fetchError) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch categories: ${fetchError.message}`,
        },
        { status: 500 },
      );
    }

    // 5. 准备导入数据
    const importData: CategoryImportData[] = [];
    const skipList: string[] = [];

    for (const item of items) {
      if (item.action === 'skip') {
        skipList.push(item.uuid);
        continue;
      }

      const categoryData = remoteCategories.find((c) => c.uuid === item.uuid);
      if (!categoryData) {
        console.error(`Category with UUID ${item.uuid} not found`);
        continue;
      }

      // 根据 action 决定使用哪个版本的内容
      let contentToUse: SEOContent;

      if (item.selectedContent) {
        // 使用前端传递的选中内容
        contentToUse = item.selectedContent;
      } else if (item.action === 'use_original') {
        // 使用原始内容
        contentToUse = {
          metadataTitle: categoryData.metadataTitle || categoryData.name,
          metadataDescription: categoryData.metadataDescription || '',
          content: categoryData.content || '',
        };
      } else {
        // 默认使用原始内容（不应该到这里，但作为后备）
        contentToUse = {
          metadataTitle: categoryData.metadataTitle || categoryData.name,
          metadataDescription: categoryData.metadataDescription || '',
          content: categoryData.content || '',
        };
      }

      importData.push({
        uuid: categoryData.uuid,
        name: categoryData.name,
        slug: categoryData.slug,
        iconUrl: categoryData.iconUrl,
        content: contentToUse.content,
        metaTitle: contentToUse.metadataTitle,
        metaDescription: contentToUse.metadataDescription,
      });
    }

    // 6. 执行导入
    const result = await importCategories(importData, 'skip_existing', env.DB);

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
    console.error('[Confirm Categories] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to confirm categories',
      },
      { status: 500 },
    );
  }
}
