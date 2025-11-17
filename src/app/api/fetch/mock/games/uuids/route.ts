/**
 * 母站点 - Mock 游戏 UUID 列表接口
 * GET /api/fetch/mock/games/uuids - 提供 Mock 游戏的 UUID 列表
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

export async function GET(request: NextRequest) {
  try {
    // 提取所有 Mock 游戏的 UUID
    const uuids = mockGames.map((game) => game.uuid);

    console.log(`[Fetch API Mock] Providing ${uuids.length} mock game UUIDs`);

    return createFetchResponse(uuids, undefined, request);
  } catch (error: any) {
    console.error('[Fetch API Mock] Error fetching game UUIDs:', error);
    return createFetchError('Failed to fetch mock game UUIDs: ' + error.message, 500, request);
  }
}
