/**
 * 母站点 - 特性合集数据提供接口
 * GET /api/fetch/featured - 提供所有特性合集数据（不包含翻译）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { validateApiKey, createFetchResponse, createFetchError } from '@/lib/fetch-auth';
import { getAllFeatured } from '@/services/content/featured';
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

    // 获取所有特性合集（不包含翻译）
    const featured = await getAllFeatured(db);

    // 转换数据格式（排除 id 字段和翻译）
    const fetchData = featured.map((item) => ({
      uuid: item.uuid,
      name: item.name,
      slug: item.slug,
      metadataTitle: item.metadataTitle,
      metadataDescription: item.metadataDescription,
      content: item.content,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return createFetchResponse(fetchData, undefined, request);
  } catch (error: any) {
    console.error('[Fetch API] Error fetching featured:', error);
    return createFetchError('Failed to fetch featured: ' + error.message, 500, request);
  }
}
