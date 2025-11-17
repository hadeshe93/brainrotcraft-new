/**
 * 子站点 - 本地游戏 UUID 列表接口
 * GET /api/admin/games/uuids - 仅返回所有本地游戏的 UUID 列表
 */

import { NextRequest } from 'next/server';
import { isNull } from 'drizzle-orm';
import { getCloudflareEnv } from '@/services/base';
import { createDrizzleClient } from '@/db/client';
import { games } from '@/db/schema';
import { requireAdmin } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    await requireAdmin(request);

    // 获取数据库
    const env = await getCloudflareEnv();
    const db = createDrizzleClient(env.DB);

    // 仅获取 UUID 列表（未删除的）
    const allGames = await db.select({ uuid: games.uuid }).from(games).where(isNull(games.deletedAt));

    const uuids = allGames.map((g: { uuid: string }) => g.uuid);

    return Response.json({
      data: uuids,
      total: uuids.length,
    });
  } catch (error: any) {
    console.error('[Admin API] Error fetching local game UUIDs:', error);
    return Response.json(
      {
        error: error.message || 'Failed to fetch local game UUIDs',
      },
      { status: 500 },
    );
  }
}
