/**
 * 子站点 - 分类数据拉取接口
 * POST /api/admin/fetch/categories - 从母站点拉取并导入分类数据
 *
 * @deprecated 请使用新的双 API 模式代替：
 *   - POST /api/admin/fetch/categories/preview - 预览并改写内容
 *   - POST /api/admin/fetch/categories/confirm - 确认并导入
 * 保留此端点仅用于紧急回滚
 */

import { NextRequest, NextResponse } from 'next/server';
import { isNull } from 'drizzle-orm';
import { getCloudflareEnv } from '@/services/base';
import { createDrizzleClient } from '@/db/client';
import { categories } from '@/db/schema';
import { requireAdmin } from '@/lib/auth-helpers';
import { fetchCategories } from '@/services/fetch/client';
import { importCategories, CategoryImportData } from '@/services/content/categories';

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    await requireAdmin(request);

    // 解析请求体
    const body = (await request.json()) as any;
    const { uuids } = body; // 可选：指定要拉取的 UUID 列表

    // 1. 从母站点拉取数据
    const { data: remoteCategories, error: fetchError } = await fetchCategories();

    if (fetchError) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch from parent site: ${fetchError.message}`,
          errorType: fetchError.type,
        },
        { status: 500 },
      );
    }

    // 2. 过滤指定 UUID（如果提供）
    let categoriesToImport = remoteCategories;
    if (uuids && Array.isArray(uuids) && uuids.length > 0) {
      const uuidSet = new Set(uuids);
      categoriesToImport = remoteCategories.filter((cat) => uuidSet.has(cat.uuid));
    }

    if (categoriesToImport.length === 0) {
      return NextResponse.json({
        success: true,
        fetched: remoteCategories.length,
        imported: 0,
        skipped: 0,
        message: 'No categories to import',
      });
    }

    // 3. 获取本地已存在的 UUID
    const env = await getCloudflareEnv();
    const db = createDrizzleClient(env.DB);

    const existingCategories = await db
      .select({ uuid: categories.uuid })
      .from(categories)
      .where(isNull(categories.deletedAt));

    const existingUuidSet = new Set(existingCategories.map((c) => c.uuid));

    // 4. 过滤掉已存在的分类
    const newCategories = categoriesToImport.filter((cat) => !existingUuidSet.has(cat.uuid));

    if (newCategories.length === 0) {
      return NextResponse.json({
        success: true,
        fetched: categoriesToImport.length,
        imported: 0,
        skipped: categoriesToImport.length,
        message: 'All categories already exist locally',
      });
    }

    // 5. 转换为导入格式并执行导入
    const importData: CategoryImportData[] = newCategories.map((cat) => ({
      uuid: cat.uuid, // 保留 UUID
      name: cat.name,
      slug: cat.slug,
      iconUrl: cat.iconUrl,
      content: cat.content || '',
      metaTitle: cat.metadataTitle || cat.name,
      metaDescription: cat.metadataDescription || '',
    }));

    const result = await importCategories(importData, 'skip_existing', env.DB);

    return NextResponse.json({
      success: true,
      fetched: categoriesToImport.length,
      imported: result.created,
      skipped: result.skipped,
      details: result,
    });
  } catch (error: any) {
    console.error('[Fetch Categories] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch categories',
      },
      { status: 500 },
    );
  }
}
