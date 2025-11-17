/**
 * 子站点 - 标签数据拉取接口
 * POST /api/admin/fetch/tags - 从母站点拉取并导入标签数据
 *
 * @deprecated 请使用新的双 API 模式代替：
 *   - POST /api/admin/fetch/tags/preview - 预览并改写内容
 *   - POST /api/admin/fetch/tags/confirm - 确认并导入
 * 保留此端点仅用于紧急回滚
 */

import { NextRequest, NextResponse } from 'next/server';
import { isNull } from 'drizzle-orm';
import { getCloudflareEnv } from '@/services/base';
import { createDrizzleClient } from '@/db/client';
import { tags } from '@/db/schema';
import { requireAdmin } from '@/lib/auth-helpers';
import { fetchTags } from '@/services/fetch/client';
import { importTags, TagImportData } from '@/services/content/tags';

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    await requireAdmin(request);

    // 解析请求体
    const body = await request.json();
    const { uuids } = body;

    // 1. 从母站点拉取数据
    const { data: remoteTags, error: fetchError } = await fetchTags();

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
    let tagsToImport = remoteTags;
    if (uuids && Array.isArray(uuids) && uuids.length > 0) {
      const uuidSet = new Set(uuids);
      tagsToImport = remoteTags.filter((tag) => uuidSet.has(tag.uuid));
    }

    if (tagsToImport.length === 0) {
      return NextResponse.json({
        success: true,
        fetched: remoteTags.length,
        imported: 0,
        skipped: 0,
        message: 'No tags to import',
      });
    }

    // 3. 获取本地已存在的 UUID
    const env = await getCloudflareEnv();
    const db = createDrizzleClient(env.DB);

    const existingTags = await db.select({ uuid: tags.uuid }).from(tags).where(isNull(tags.deletedAt));

    const existingUuidSet = new Set(existingTags.map((t) => t.uuid));

    // 4. 过滤掉已存在的标签
    const newTags = tagsToImport.filter((tag) => !existingUuidSet.has(tag.uuid));

    if (newTags.length === 0) {
      return NextResponse.json({
        success: true,
        fetched: tagsToImport.length,
        imported: 0,
        skipped: tagsToImport.length,
        message: 'All tags already exist locally',
      });
    }

    // 5. 转换为导入格式并执行导入
    const importData: TagImportData[] = newTags.map((tag) => ({
      uuid: tag.uuid,
      name: tag.name,
      slug: tag.slug,
      content: tag.content || '',
      metaTitle: tag.metadataTitle || tag.name,
      metaDescription: tag.metadataDescription || '',
    }));

    const result = await importTags(importData, 'skip_existing', env.DB);

    return NextResponse.json({
      success: true,
      fetched: tagsToImport.length,
      imported: result.created,
      skipped: result.skipped,
      details: result,
    });
  } catch (error: any) {
    console.error('[Fetch Tags] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch tags',
      },
      { status: 500 },
    );
  }
}
