/**
 * 母站点 - 分类数据提供接口
 * GET /api/fetch/categories - 提供所有分类数据（不包含翻译）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { validateApiKey, createFetchResponse, createFetchError } from '@/lib/fetch-auth';
import { getAllCategories } from '@/services/content/categories';
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

    // 获取所有分类（不包含翻译）
    const categories = await getAllCategories(db);

    // 转换数据格式（排除 id 字段和翻译）
    const fetchData = categories.map((category) => ({
      uuid: category.uuid,
      name: category.name,
      slug: category.slug,
      iconUrl: category.iconUrl,
      metadataTitle: category.metadataTitle,
      metadataDescription: category.metadataDescription,
      content: category.content,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));

    return createFetchResponse(fetchData, undefined, request);
  } catch (error: any) {
    console.error('[Fetch API] Error fetching categories:', error);
    return createFetchError('Failed to fetch categories: ' + error.message, 500, request);
  }
}
