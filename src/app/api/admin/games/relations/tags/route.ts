import { NextRequest, NextResponse } from 'next/server';
import { createDrizzleClient } from '@/db/client';
import { gamesToTags, tags } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCloudflareEnv } from '@/services/base';

// POST - 添加关联
export async function POST(request: NextRequest) {
  try {
    const { gameUuid, tagUuid, sortOrder = 0 } = await request.json();

    if (!gameUuid || !tagUuid) {
      return NextResponse.json({ success: false, message: 'gameUuid and tagUuid are required' }, { status: 400 });
    }

    const env = await getCloudflareEnv();
    const client = createDrizzleClient(env.DB);

    // 插入关联记录，如果已存在则更新 sortOrder
    await client
      .insert(gamesToTags)
      .values({
        gameUuid,
        tagUuid,
        sortOrder,
        createdAt: Math.floor(Date.now() / 1000),
      })
      .onConflictDoUpdate({
        target: [gamesToTags.gameUuid, gamesToTags.tagUuid],
        set: { sortOrder },
      });

    return NextResponse.json({ success: true, message: 'Relation added successfully' });
  } catch (error) {
    console.error('Failed to add tag relation:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to add relation', error: String(error) },
      { status: 500 },
    );
  }
}

// DELETE - 移除关联
export async function DELETE(request: NextRequest) {
  try {
    const { gameUuid, tagUuid } = await request.json();

    if (!gameUuid || !tagUuid) {
      return NextResponse.json({ success: false, message: 'gameUuid and tagUuid are required' }, { status: 400 });
    }

    const env = await getCloudflareEnv();
    const client = createDrizzleClient(env.DB);

    await client.delete(gamesToTags).where(and(eq(gamesToTags.gameUuid, gameUuid), eq(gamesToTags.tagUuid, tagUuid)));

    return NextResponse.json({ success: true, message: 'Relation removed successfully' });
  } catch (error) {
    console.error('Failed to remove tag relation:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to remove relation', error: String(error) },
      { status: 500 },
    );
  }
}

// PATCH - 更新排序
export async function PATCH(request: NextRequest) {
  try {
    const { gameUuid, tagUuid, sortOrder } = await request.json();

    if (!gameUuid || !tagUuid || sortOrder === undefined) {
      return NextResponse.json(
        { success: false, message: 'gameUuid, tagUuid and sortOrder are required' },
        { status: 400 },
      );
    }

    const env = await getCloudflareEnv();
    const client = createDrizzleClient(env.DB);

    await client
      .update(gamesToTags)
      .set({ sortOrder })
      .where(and(eq(gamesToTags.gameUuid, gameUuid), eq(gamesToTags.tagUuid, tagUuid)));

    return NextResponse.json({ success: true, message: 'Sort order updated successfully' });
  } catch (error) {
    console.error('Failed to update sort order:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update sort order', error: String(error) },
      { status: 500 },
    );
  }
}

// GET - 查询关联
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameUuid = searchParams.get('gameUuid');

    if (!gameUuid) {
      return NextResponse.json({ success: false, message: 'gameUuid is required' }, { status: 400 });
    }

    const env = await getCloudflareEnv();
    const client = createDrizzleClient(env.DB);

    const relations = await client
      .select({
        gameUuid: gamesToTags.gameUuid,
        tagUuid: gamesToTags.tagUuid,
        sortOrder: gamesToTags.sortOrder,
        createdAt: gamesToTags.createdAt,
        tagName: tags.name,
        tagSlug: tags.slug,
      })
      .from(gamesToTags)
      .innerJoin(tags, eq(gamesToTags.tagUuid, tags.uuid))
      .where(eq(gamesToTags.gameUuid, gameUuid))
      .orderBy(gamesToTags.sortOrder);

    return NextResponse.json({ success: true, data: relations });
  } catch (error) {
    console.error('Failed to fetch tag relations:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch relations', error: String(error) },
      { status: 500 },
    );
  }
}
