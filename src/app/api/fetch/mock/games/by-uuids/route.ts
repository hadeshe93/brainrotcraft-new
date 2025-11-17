/**
 * 母站点 - Mock 按 UUID 批量获取游戏数据接口
 * POST /api/fetch/mock/games/by-uuids - 根据提供的 UUID 列表返回对应的 Mock 游戏数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFetchResponse, createFetchError } from '@/lib/fetch-auth';
import { mockGames } from '@/services/fetch/mock-generator';
import { addCorsHeaders } from '@/lib/fetch-cors';

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  const origin = request.headers.get('origin');
  return addCorsHeaders(response, origin);
}

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: { uuids?: unknown } = await request.json();
    const { uuids } = body;

    if (!Array.isArray(uuids) || uuids.length === 0) {
      return createFetchError('uuids array is required and must not be empty', 400, request);
    }

    // 过滤出匹配的 Mock 游戏
    const uuidSet = new Set(uuids);
    const matchedGames = mockGames.filter((game) => uuidSet.has(game.uuid));

    console.log(`[Fetch API Mock] Providing ${matchedGames.length} mock games for ${uuids.length} UUIDs`);

    return createFetchResponse(matchedGames, undefined, request);
  } catch (error: any) {
    console.error('[Fetch API Mock] Error fetching games by UUIDs:', error);
    return createFetchError('Failed to fetch mock games by UUIDs: ' + error.message, 500, request);
  }
}
