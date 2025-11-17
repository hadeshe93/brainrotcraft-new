/**
 * 母站点 - 标签数据提供接口
 * GET /api/fetch/tags - 提供所有标签数据（不包含翻译）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { validateApiKey, createFetchResponse, createFetchError } from '@/lib/fetch-auth';
import { getAllTags } from '@/services/content/tags';
import { addCorsHeaders } from '@/lib/fetch-cors';

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  const origin = request.headers.get('origin');
  return addCorsHeaders(response, origin);
}

export async function GET(request: NextRequest) {
  try {
    // 验证 API Key
    const authError = await validateApiKey(request);
    if (authError) return authError;

    // 获取数据库
    const env = await getCloudflareEnv();
    const db = env.DB;

    // 获取所有标签（不包含翻译）
    const tags = await getAllTags(db);

    // 转换数据格式（排除 id 字段和翻译）
    const fetchData = tags.map((tag) => ({
      uuid: tag.uuid,
      name: tag.name,
      slug: tag.slug,
      metadataTitle: tag.metadataTitle,
      metadataDescription: tag.metadataDescription,
      content: tag.content,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    }));

    return createFetchResponse(fetchData, undefined, request);
  } catch (error: any) {
    console.error('[Fetch API] Error fetching tags:', error);
    return createFetchError('Failed to fetch tags: ' + error.message, 500, request);
  }
}
