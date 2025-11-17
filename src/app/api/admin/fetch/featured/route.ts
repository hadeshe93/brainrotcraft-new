/**
 * 子站点 - 特性合集数据拉取接口
 * POST /api/admin/fetch/featured - 从母站点拉取并导入特性合集数据
 *
 * @deprecated 请使用新的双 API 模式代替：
 *   - POST /api/admin/fetch/featured/preview - 预览并改写内容
 *   - POST /api/admin/fetch/featured/confirm - 确认并导入
 * 保留此端点仅用于紧急回滚
 */

import { NextRequest, NextResponse } from 'next/server';
import { isNull } from 'drizzle-orm';
import { getCloudflareEnv } from '@/services/base';
import { createDrizzleClient } from '@/db/client';
import { featured } from '@/db/schema';
import { requireAdmin } from '@/lib/auth-helpers';
import { fetchFeatured } from '@/services/fetch/client';
import { importFeatured, FeaturedImportData } from '@/services/content/featured';

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    await requireAdmin(request);

    // 解析请求体
    const body = await request.json();
    const { uuids } = body;

    // 1. 从母站点拉取数据
    const { data: remoteFeatured, error: fetchError } = await fetchFeatured();

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

    // 2. 过滤指定 UUID
    let featuredToImport = remoteFeatured;
    if (uuids && Array.isArray(uuids) && uuids.length > 0) {
      const uuidSet = new Set(uuids);
      featuredToImport = remoteFeatured.filter((item) => uuidSet.has(item.uuid));
    }

    if (featuredToImport.length === 0) {
      return NextResponse.json({
        success: true,
        fetched: remoteFeatured.length,
        imported: 0,
        skipped: 0,
        message: 'No featured collections to import',
      });
    }

    // 3. 获取本地已存在的 UUID
    const env = await getCloudflareEnv();
    const db = createDrizzleClient(env.DB);

    const existingFeatured = await db.select({ uuid: featured.uuid }).from(featured).where(isNull(featured.deletedAt));

    const existingUuidSet = new Set(existingFeatured.map((f) => f.uuid));

    // 4. 过滤掉已存在的特性合集
    const newFeatured = featuredToImport.filter((item) => !existingUuidSet.has(item.uuid));

    if (newFeatured.length === 0) {
      return NextResponse.json({
        success: true,
        fetched: featuredToImport.length,
        imported: 0,
        skipped: featuredToImport.length,
        message: 'All featured collections already exist locally',
      });
    }

    // 5. 转换为导入格式并执行导入
    const importData: FeaturedImportData[] = newFeatured.map((item) => ({
      uuid: item.uuid,
      name: item.name,
      slug: item.slug,
      content: item.content || '',
      metaTitle: item.metadataTitle || item.name,
      metaDescription: item.metadataDescription || '',
    }));

    const result = await importFeatured(importData, 'skip_existing', env.DB);

    return NextResponse.json({
      success: true,
      fetched: featuredToImport.length,
      imported: result.created,
      skipped: result.skipped,
      details: result,
    });
  } catch (error: any) {
    console.error('[Fetch Featured] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch featured collections',
      },
      { status: 500 },
    );
  }
}
