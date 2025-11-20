import { createDrizzleClient } from '@/db/client';
import { siteConfig } from '@/db/schema';
import { eq, isNull, and, inArray } from 'drizzle-orm';

export interface SiteConfigData {
  id: number;
  uuid: string;
  scope: 'client' | 'admin' | 'common';
  config: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

/**
 * 获取所有站点配置
 */
export async function getAllSiteConfigs(db: D1Database): Promise<SiteConfigData[]> {
  const client = createDrizzleClient(db);
  const results = await client
    .select()
    .from(siteConfig)
    .where(isNull(siteConfig.deletedAt))
    .orderBy(siteConfig.scope);

  return results.map((item) => ({
    ...item,
    config: typeof item.config === 'string' ? JSON.parse(item.config) : item.config,
  }));
}

/**
 * 根据多个 scope 获取配置
 */
export async function getSiteConfigByScopes(
  scopes: Array<'client' | 'admin' | 'common'>,
  db: D1Database,
): Promise<SiteConfigData[]> {
  const client = createDrizzleClient(db);
  const results = await client
    .select()
    .from(siteConfig)
    .where(and(inArray(siteConfig.scope, scopes), isNull(siteConfig.deletedAt)))
    .orderBy(siteConfig.scope);

  return results.map((item) => ({
    ...item,
    config: typeof item.config === 'string' ? JSON.parse(item.config) : item.config,
  }));
}

/**
 * 根据使用方获取配置
 */
export async function getSiteConfigByScope(
  scope: 'client' | 'admin' | 'common',
  db: D1Database,
): Promise<SiteConfigData | null> {
  const client = createDrizzleClient(db);
  const results = await client
    .select()
    .from(siteConfig)
    .where(and(eq(siteConfig.scope, scope), isNull(siteConfig.deletedAt)))
    .limit(1);

  if (!results[0]) {
    return null;
  }

  const item = results[0];
  return {
    ...item,
    config: typeof item.config === 'string' ? JSON.parse(item.config) : item.config,
  };
}

/**
 * 根据 UUID 获取配置
 */
export async function getSiteConfigByUuid(uuid: string, db: D1Database): Promise<SiteConfigData | null> {
  const client = createDrizzleClient(db);
  const results = await client
    .select()
    .from(siteConfig)
    .where(and(eq(siteConfig.uuid, uuid), isNull(siteConfig.deletedAt)))
    .limit(1);

  if (!results[0]) {
    return null;
  }

  const item = results[0];
  return {
    ...item,
    config: typeof item.config === 'string' ? JSON.parse(item.config) : item.config,
  };
}

/**
 * 更新配置
 */
export async function updateSiteConfig(
  uuid: string,
  configData: Record<string, any>,
  db: D1Database,
): Promise<SiteConfigData | null> {
  const client = createDrizzleClient(db);
  const result = await client
    .update(siteConfig)
    .set({
      config: configData as any, // Drizzle will handle JSON serialization
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(and(eq(siteConfig.uuid, uuid), isNull(siteConfig.deletedAt)))
    .returning();

  if (!result[0]) {
    return null;
  }

  const item = result[0];
  return {
    ...item,
    config: typeof item.config === 'string' ? JSON.parse(item.config) : item.config,
  };
}
