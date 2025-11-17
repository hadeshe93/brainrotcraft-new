/**
 * 母站点 - Mock 数据接口
 * GET /api/fetch/mock/[entity] - 提供 Mock 测试数据
 * 用于本地开发测试，无需 API Key 验证
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFetchResponse, createFetchError } from '@/lib/fetch-auth';
import { getMockData } from '@/services/fetch/mock-generator';
import { addCorsHeaders } from '@/lib/fetch-cors';

interface RouteParams {
  params: Promise<{
    entity: string;
  }>;
}

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  const origin = request.headers.get('origin');
  return addCorsHeaders(response, origin);
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { entity } = await params;

    // 验证 entity 参数
    const validEntities = ['categories', 'tags', 'featured', 'games'];
    if (!validEntities.includes(entity)) {
      return createFetchError(`Invalid entity: ${entity}. Must be one of: ${validEntities.join(', ')}`, 400, request);
    }

    // 获取 Mock 数据
    const data = getMockData(entity as 'categories' | 'tags' | 'featured' | 'games');

    console.log(`[Fetch API Mock] Providing ${data.length} mock ${entity}`);

    return createFetchResponse(data, undefined, request);
  } catch (error: any) {
    console.error('[Fetch API Mock] Error:', error);
    return createFetchError('Failed to generate mock data: ' + error.message, 500, request);
  }
}
