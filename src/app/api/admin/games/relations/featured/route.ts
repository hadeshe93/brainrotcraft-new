import { NextRequest, NextResponse } from 'next/server';
import { createDrizzleClient } from '@/db/client';
import { gamesToFeatured, featured } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCloudflareEnv } from '@/services/base';

// POST - 添加关联
export async function POST(request: NextRequest) {
  try {
    const { gameUuid, featuredUuid, sortOrder = 0 } = await request.json();

    if (!gameUuid || !featuredUuid) {
      return NextResponse.json({ success: false, message: 'gameUuid and featuredUuid are required' }, { status: 400 });
    }

    const env = await getCloudflareEnv();
    const client = createDrizzleClient(env.DB);

    // 插入关联记录，如果已存在则更新 sortOrder
    await client
      .insert(gamesToFeatured)
      .values({
        gameUuid,
        featuredUuid,
        sortOrder,
        createdAt: Math.floor(Date.now() / 1000),
      })
      .onConflictDoUpdate({
        target: [gamesToFeatured.gameUuid, gamesToFeatured.featuredUuid],
        set: { sortOrder },
      });

    return NextResponse.json({ success: true, message: 'Relation added successfully' });
  } catch (error) {
    console.error('Failed to add featured relation:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to add relation', error: String(error) },
      { status: 500 },
    );
  }
}

// DELETE - 移除关联
export async function DELETE(request: NextRequest) {
  try {
    const { gameUuid, featuredUuid } = await request.json();

    if (!gameUuid || !featuredUuid) {
      return NextResponse.json({ success: false, message: 'gameUuid and featuredUuid are required' }, { status: 400 });
    }

    const env = await getCloudflareEnv();
    const client = createDrizzleClient(env.DB);

    await client
      .delete(gamesToFeatured)
      .where(and(eq(gamesToFeatured.gameUuid, gameUuid), eq(gamesToFeatured.featuredUuid, featuredUuid)));

    return NextResponse.json({ success: true, message: 'Relation removed successfully' });
  } catch (error) {
    console.error('Failed to remove featured relation:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to remove relation', error: String(error) },
      { status: 500 },
    );
  }
}

// PATCH - 更新排序
export async function PATCH(request: NextRequest) {
  try {
    const { gameUuid, featuredUuid, sortOrder } = await request.json();

    if (!gameUuid || !featuredUuid || sortOrder === undefined) {
      return NextResponse.json(
        { success: false, message: 'gameUuid, featuredUuid and sortOrder are required' },
        { status: 400 },
      );
    }

    const env = await getCloudflareEnv();
    const client = createDrizzleClient(env.DB);

    await client
      .update(gamesToFeatured)
      .set({ sortOrder })
      .where(and(eq(gamesToFeatured.gameUuid, gameUuid), eq(gamesToFeatured.featuredUuid, featuredUuid)));

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
        gameUuid: gamesToFeatured.gameUuid,
        featuredUuid: gamesToFeatured.featuredUuid,
        sortOrder: gamesToFeatured.sortOrder,
        createdAt: gamesToFeatured.createdAt,
        featuredName: featured.name,
        featuredSlug: featured.slug,
      })
      .from(gamesToFeatured)
      .innerJoin(featured, eq(gamesToFeatured.featuredUuid, featured.uuid))
      .where(eq(gamesToFeatured.gameUuid, gameUuid))
      .orderBy(gamesToFeatured.sortOrder);

    return NextResponse.json({ success: true, data: relations });
  } catch (error) {
    console.error('Failed to fetch featured relations:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch relations', error: String(error) },
      { status: 500 },
    );
  }
}
