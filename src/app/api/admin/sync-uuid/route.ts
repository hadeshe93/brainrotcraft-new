/**
 * UUID 同步接口
 * POST /api/admin/sync-uuid - 同步 categories、tags、featured 表的 UUID 及其关联表
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { getCloudflareEnv } from '@/services/base';
import { createDrizzleClient } from '@/db/client';
import {
  categories,
  tags,
  featured,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import syncData from '@/constants/sync-data';

interface SyncEntity {
  uuid: string;
  name: string;
  slug: string;
  iconUrl?: string;
  metadataTitle?: string;
  metadataDescription?: string;
  content?: string;
}

interface SyncRequest {
  categories?: SyncEntity[];
  tags?: SyncEntity[];
  featured?: SyncEntity[];
}

interface SyncDetail {
  name: string;
  slug: string;
  oldUuid: string;
  newUuid: string;
  status: 'updated';
}

interface EntityResult {
  updated: number;
  skipped: number;
  failed: number;
  details: SyncDetail[];
}

interface SyncResults {
  categories: EntityResult;
  tags: EntityResult;
  featured: EntityResult;
}

export async function GET(request: NextRequest) {
  if (Boolean('1')) {
    return NextResponse.json({ error: 'Already synced' }, { status: 400 });
  }

  // 1. 验证管理员权限
  try {
    await requireAdmin(request);
  } catch (error) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }

  try {
    // const body: SyncRequest = await request.json();
    const body = syncData;

    // 2. 验证请求体
    if (!body || (!body.categories && !body.tags && !body.featured)) {
      return NextResponse.json(
        { success: false, error: '请求体为空或未包含任何同步数据' },
        { status: 400 },
      );
    }
    const env = await getCloudflareEnv();
    const client = createDrizzleClient(env.DB);
    const db = env.DB;

    const results: SyncResults = {
      categories: { updated: 0, skipped: 0, failed: 0, details: [] },
      tags: { updated: 0, skipped: 0, failed: 0, details: [] },
      featured: { updated: 0, skipped: 0, failed: 0, details: [] },
    };

    console.log('[UUID Sync] Starting sync operation:', {
      categoriesCount: body.categories?.length || 0,
      tagsCount: body.tags?.length || 0,
      featuredCount: body.featured?.length || 0,
    });

    // 3. 同步 Categories
    if (body.categories && body.categories.length > 0) {
      for (const item of body.categories) {
        try {
          const updated = await syncCategoryUuid(item, client, db);
          if (updated) {
            results.categories.updated++;
            results.categories.details.push({
              name: item.name,
              slug: item.slug,
              oldUuid: updated.oldUuid,
              newUuid: item.uuid,
              status: 'updated',
            });
          } else {
            results.categories.skipped++;
          }
        } catch (error) {
          results.categories.failed++;
          console.error(`Failed to sync category ${item.slug}:`, error);
        }
      }
    }

    // 4. 同步 Tags
    if (body.tags && body.tags.length > 0) {
      for (const item of body.tags) {
        try {
          const updated = await syncTagUuid(item, client, db);
          if (updated) {
            results.tags.updated++;
            results.tags.details.push({
              name: item.name,
              slug: item.slug,
              oldUuid: updated.oldUuid,
              newUuid: item.uuid,
              status: 'updated',
            });
          } else {
            results.tags.skipped++;
          }
        } catch (error) {
          results.tags.failed++;
          console.error(`Failed to sync tag ${item.slug}:`, error);
        }
      }
    }

    // 5. 同步 Featured
    if (body.featured && body.featured.length > 0) {
      for (const item of body.featured) {
        try {
          const updated = await syncFeaturedUuid(item, client, db);
          if (updated) {
            results.featured.updated++;
            results.featured.details.push({
              name: item.name,
              slug: item.slug,
              oldUuid: updated.oldUuid,
              newUuid: item.uuid,
              status: 'updated',
            });
          } else {
            results.featured.skipped++;
          }
        } catch (error) {
          results.featured.failed++;
          console.error(`Failed to sync featured ${item.slug}:`, error);
        }
      }
    }

    console.log('[UUID Sync] Sync operation completed:', {
      categories: `${results.categories.updated} updated, ${results.categories.skipped} skipped, ${results.categories.failed} failed`,
      tags: `${results.tags.updated} updated, ${results.tags.skipped} skipped, ${results.tags.failed} failed`,
      featured: `${results.featured.updated} updated, ${results.featured.skipped} skipped, ${results.featured.failed} failed`,
    });

    return NextResponse.json({
      success: true,
      message: generateSummary(results),
      results,
    });
  } catch (error) {
    console.error('UUID 同步失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

// 同步 Category UUID
async function syncCategoryUuid(item: SyncEntity, client: any, db: D1Database) {
  // 1. 查找现有记录
  const existing = await client
    .select()
    .from(categories)
    .where(and(eq(categories.name, item.name), eq(categories.slug, item.slug)))
    .limit(1);

  if (!existing[0]) {
    console.log(`[Category] Record not found: ${item.name} (${item.slug})`);
    return null; // 不存在，跳过
  }

  if (existing[0].uuid === item.uuid) {
    console.log(`[Category] UUID already matches: ${item.name} (${item.uuid})`);
    return null; // UUID 相同，跳过
  }

  const oldUuid = existing[0].uuid;
  const newUuid = item.uuid;

  console.log(`[Category] Updating UUID: ${item.name} (${item.slug}): ${oldUuid} -> ${newUuid}`);

  // 2. 在事务中更新所有相关表
  await db.batch([
    // 更新翻译表
    db.prepare('UPDATE category_translations SET category_uuid = ? WHERE category_uuid = ?').bind(newUuid, oldUuid),

    // 更新游戏关联表
    db.prepare('UPDATE games_to_categories SET category_uuid = ? WHERE category_uuid = ?').bind(newUuid, oldUuid),

    // 最后更新主表
    db.prepare('UPDATE categories SET uuid = ?, updated_at = unixepoch() WHERE uuid = ?').bind(newUuid, oldUuid),
  ]);

  return { oldUuid, newUuid };
}

// 同步 Tag UUID
async function syncTagUuid(item: SyncEntity, client: any, db: D1Database) {
  const existing = await client
    .select()
    .from(tags)
    .where(and(eq(tags.name, item.name), eq(tags.slug, item.slug)))
    .limit(1);

  if (!existing[0]) {
    console.log(`[Tag] Record not found: ${item.name} (${item.slug})`);
    return null;
  }

  if (existing[0].uuid === item.uuid) {
    console.log(`[Tag] UUID already matches: ${item.name} (${item.uuid})`);
    return null;
  }

  const oldUuid = existing[0].uuid;
  const newUuid = item.uuid;

  console.log(`[Tag] Updating UUID: ${item.name} (${item.slug}): ${oldUuid} -> ${newUuid}`);

  await db.batch([
    db.prepare('UPDATE tag_translations SET tag_uuid = ? WHERE tag_uuid = ?').bind(newUuid, oldUuid),
    db.prepare('UPDATE games_to_tags SET tag_uuid = ? WHERE tag_uuid = ?').bind(newUuid, oldUuid),
    db.prepare('UPDATE tags SET uuid = ?, updated_at = unixepoch() WHERE uuid = ?').bind(newUuid, oldUuid),
  ]);

  return { oldUuid, newUuid };
}

// 同步 Featured UUID
async function syncFeaturedUuid(item: SyncEntity, client: any, db: D1Database) {
  const existing = await client
    .select()
    .from(featured)
    .where(and(eq(featured.name, item.name), eq(featured.slug, item.slug)))
    .limit(1);

  if (!existing[0]) {
    console.log(`[Featured] Record not found: ${item.name} (${item.slug})`);
    return null;
  }

  if (existing[0].uuid === item.uuid) {
    console.log(`[Featured] UUID already matches: ${item.name} (${item.uuid})`);
    return null;
  }

  const oldUuid = existing[0].uuid;
  const newUuid = item.uuid;

  console.log(`[Featured] Updating UUID: ${item.name} (${item.slug}): ${oldUuid} -> ${newUuid}`);

  await db.batch([
    db.prepare('UPDATE featured_translations SET featured_uuid = ? WHERE featured_uuid = ?').bind(newUuid, oldUuid),
    db.prepare('UPDATE games_to_featured SET featured_uuid = ? WHERE featured_uuid = ?').bind(newUuid, oldUuid),
    db.prepare('UPDATE featured SET uuid = ?, updated_at = unixepoch() WHERE uuid = ?').bind(newUuid, oldUuid),
  ]);

  return { oldUuid, newUuid };
}

function generateSummary(results: SyncResults): string {
  const parts: string[] = [];

  for (const [type, data] of Object.entries(results)) {
    if (data.updated > 0 || data.skipped > 0 || data.failed > 0) {
      const typeLabel = type === 'categories' ? '分类' : type === 'tags' ? '标签' : '特性';
      parts.push(`${typeLabel}: 更新${data.updated}个, 跳过${data.skipped}个, 失败${data.failed}个`);
    }
  }

  return parts.join('; ') || '无更新';
}
