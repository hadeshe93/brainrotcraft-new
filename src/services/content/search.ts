/**
 * Search Service
 * Provides full-text search functionality for games
 */

import { eq, desc, and, isNull, sql, SQL } from 'drizzle-orm';
import { createDrizzleClient } from '@/db/client';
import { games } from '@/db/schema';

export interface SearchGamesOptions {
  query: string;
  page?: number;
  pageSize?: number;
  status?: 'draft' | 'online' | 'offline';
}

/**
 * Search games using full-text search
 * Note: This uses LIKE search. For better performance with large datasets,
 * consider implementing SQLite FTS5 virtual table in the future.
 */
export async function searchGames(options: SearchGamesOptions, db: D1Database) {
  const client = createDrizzleClient(db);

  const { query, page = 1, pageSize = 24, status = 'online' } = options;

  // Build where conditions
  const conditions: SQL[] = [isNull(games.deletedAt)];

  // Filter by status
  if (status) {
    conditions.push(eq(games.status, status));
  }

  // Add search condition
  if (query && query.trim()) {
    const searchPattern = `%${query.trim()}%`;
    conditions.push(sql`(${games.name} LIKE ${searchPattern} OR ${games.slug} LIKE ${searchPattern})`);
  }

  // Get total count
  const countResult = await client
    .select({ count: sql<number>`count(*)` })
    .from(games)
    .where(and(...conditions));

  const total = countResult[0]?.count ?? 0;

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const results = await client
    .select()
    .from(games)
    .where(and(...conditions))
    .orderBy(desc(games.interact)) // Order by popularity
    .limit(pageSize)
    .offset(offset);

  return {
    data: results,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasMore: page * pageSize < total,
    },
  };
}

/**
 * Get hot games (most popular)
 */
export async function getHotGames(limit: number = 10, db: D1Database) {
  const client = createDrizzleClient(db);

  const results = await client
    .select()
    .from(games)
    .where(and(eq(games.status, 'online'), isNull(games.deletedAt)))
    .orderBy(desc(games.interact))
    .limit(limit);

  return results;
}

/**
 * Get similar games based on shared categories/tags
 * Note: This is a simple implementation. For better recommendations,
 * consider implementing collaborative filtering in the future.
 */
export async function getSimilarGames(gameUuid: string, limit: number = 6, db: D1Database) {
  const client = createDrizzleClient(db);

  // For now, return hot games excluding the current game
  const results = await client
    .select()
    .from(games)
    .where(and(eq(games.status, 'online'), isNull(games.deletedAt), sql`${games.uuid} != ${gameUuid}`))
    .orderBy(desc(games.interact))
    .limit(limit);

  return results;
}
