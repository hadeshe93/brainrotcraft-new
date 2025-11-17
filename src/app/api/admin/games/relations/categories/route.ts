import { NextRequest, NextResponse } from 'next/server';
import { createDrizzleClient } from '@/db/client';
import { gamesToCategories, categories } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCloudflareEnv } from '@/services/base';

// POST - 添加关联
export async function POST(request: NextRequest) {
  try {
    const { gameUuid, categoryUuid, sortOrder = 0 } = await request.json();

    if (!gameUuid || !categoryUuid) {
      return NextResponse.json({ success: false, message: 'gameUuid and categoryUuid are required' }, { status: 400 });
    }

    const env = await getCloudflareEnv();
    const client = createDrizzleClient(env.DB);

    // 插入关联记录，如果已存在则更新 sortOrder
    await client
      .insert(gamesToCategories)
      .values({
        gameUuid,
        categoryUuid,
        sortOrder,
        createdAt: Math.floor(Date.now() / 1000),
      })
      .onConflictDoUpdate({
        target: [gamesToCategories.gameUuid, gamesToCategories.categoryUuid],
        set: { sortOrder },
      });

    return NextResponse.json({ success: true, message: 'Relation added successfully' });
  } catch (error) {
    console.error('Failed to add category relation:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to add relation', error: String(error) },
      { status: 500 },
    );
  }
}

// DELETE - 移除关联
export async function DELETE(request: NextRequest) {
  try {
    const { gameUuid, categoryUuid } = await request.json();

    if (!gameUuid || !categoryUuid) {
      return NextResponse.json({ success: false, message: 'gameUuid and categoryUuid are required' }, { status: 400 });
    }

    const env = await getCloudflareEnv();
    const client = createDrizzleClient(env.DB);

    await client
      .delete(gamesToCategories)
      .where(and(eq(gamesToCategories.gameUuid, gameUuid), eq(gamesToCategories.categoryUuid, categoryUuid)));

    return NextResponse.json({ success: true, message: 'Relation removed successfully' });
  } catch (error) {
    console.error('Failed to remove category relation:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to remove relation', error: String(error) },
      { status: 500 },
    );
  }
}

// PATCH - 更新排序
export async function PATCH(request: NextRequest) {
  try {
    const { gameUuid, categoryUuid, sortOrder } = await request.json();

    if (!gameUuid || !categoryUuid || sortOrder === undefined) {
      return NextResponse.json(
        { success: false, message: 'gameUuid, categoryUuid and sortOrder are required' },
        { status: 400 },
      );
    }

    const env = await getCloudflareEnv();
    const client = createDrizzleClient(env.DB);

    await client
      .update(gamesToCategories)
      .set({ sortOrder })
      .where(and(eq(gamesToCategories.gameUuid, gameUuid), eq(gamesToCategories.categoryUuid, categoryUuid)));

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
        gameUuid: gamesToCategories.gameUuid,
        categoryUuid: gamesToCategories.categoryUuid,
        sortOrder: gamesToCategories.sortOrder,
        createdAt: gamesToCategories.createdAt,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(gamesToCategories)
      .innerJoin(categories, eq(gamesToCategories.categoryUuid, categories.uuid))
      .where(eq(gamesToCategories.gameUuid, gameUuid))
      .orderBy(gamesToCategories.sortOrder);

    return NextResponse.json({ success: true, data: relations });
  } catch (error) {
    console.error('Failed to fetch category relations:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch relations', error: String(error) },
      { status: 500 },
    );
  }
}
