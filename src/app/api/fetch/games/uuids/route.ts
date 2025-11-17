/**
 * 母站点 - 游戏 UUID 列表接口
 * GET /api/fetch/games/uuids - 仅提供所有游戏的 UUID 列表（用于大数据量优化）
 */

import { NextRequest, NextResponse } from 'next/server';
import { isNull, like, and } from 'drizzle-orm';
import { getCloudflareEnv } from '@/services/base';
import { createDrizzleClient } from '@/db/client';
import { games } from '@/db/schema';
import { validateApiKey, createFetchResponse, createFetchError } from '@/lib/fetch-auth';
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

    // 获取搜索参数
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    // 获取数据库
    const env = await getCloudflareEnv();
    const db = createDrizzleClient(env.DB);

    // 构建查询条件
    const conditions = [isNull(games.deletedAt)];

    // 如果有搜索参数，添加模糊搜索条件
    if (search && search.trim()) {
      conditions.push(like(games.name, `%${search.trim()}%`));
    }

    // 执行查询并排序
    const allGames = await db
      .select({ uuid: games.uuid })
      .from(games)
      .where(and(...conditions))
      .orderBy(games.createdAt);

    const uuids = allGames.map((g: { uuid: string }) => g.uuid);

    return createFetchResponse(uuids, undefined, request);
  } catch (error: any) {
    console.error('[Fetch API] Error fetching game UUIDs:', error);
    return createFetchError('Failed to fetch game UUIDs: ' + error.message, 500, request);
  }
}
