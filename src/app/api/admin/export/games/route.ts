/**
 * Games Export API
 * GET /api/admin/export/games - Export all games in demo JSON format
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, isNull, and, inArray } from 'drizzle-orm';
import { getCloudflareEnv } from '@/services/base';
import { createDrizzleClient } from '@/db/client';
import {
  games,
  gamesToCategories,
  gamesToTags,
  categories,
  tags,
  introductions,
} from '@/db/schema';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import { transformGameForExport } from '@/lib/export-transformers';

/**
 * GET /api/admin/export/games
 * Export all games with resolved category/tag names
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin(request);

    // Get database
    const env = await getCloudflareEnv();
    const db = createDrizzleClient(env.DB);

    // Step 1: Get all non-deleted games
    const allGames = await db
      .select()
      .from(games)
      .where(isNull(games.deletedAt))
      .orderBy(games.createdAt);

    if (allGames.length === 0) {
      return NextResponse.json([]);
    }

    const gameUuids = allGames.map((g) => g.uuid);

    // Step 2: Get introductions for all games
    const allIntroductions = await db
      .select()
      .from(introductions)
      .where(and(isNull(introductions.deletedAt), inArray(introductions.gameUuid, gameUuids)));

    const introductionMap = new Map(
      allIntroductions.map((intro) => [intro.gameUuid, intro])
    );

    // Step 3: Get category relationships and resolve to names
    const categoryRelations = await db
      .select({
        gameUuid: gamesToCategories.gameUuid,
        categoryName: categories.name,
        sortOrder: gamesToCategories.sortOrder,
      })
      .from(gamesToCategories)
      .innerJoin(categories, eq(gamesToCategories.categoryUuid, categories.uuid))
      .where(
        and(
          inArray(gamesToCategories.gameUuid, gameUuids),
          isNull(categories.deletedAt)
        )
      )
      .orderBy(gamesToCategories.sortOrder);

    // Build category names map
    const categoryNamesMap = new Map<string, string[]>();
    categoryRelations.forEach((rel) => {
      const names = categoryNamesMap.get(rel.gameUuid) || [];
      names.push(rel.categoryName);
      categoryNamesMap.set(rel.gameUuid, names);
    });

    // Step 4: Get tag relationships and resolve to names
    const tagRelations = await db
      .select({
        gameUuid: gamesToTags.gameUuid,
        tagName: tags.name,
        sortOrder: gamesToTags.sortOrder,
      })
      .from(gamesToTags)
      .innerJoin(tags, eq(gamesToTags.tagUuid, tags.uuid))
      .where(
        and(
          inArray(gamesToTags.gameUuid, gameUuids),
          isNull(tags.deletedAt)
        )
      )
      .orderBy(gamesToTags.sortOrder);

    // Build tag names map
    const tagNamesMap = new Map<string, string[]>();
    tagRelations.forEach((rel) => {
      const names = tagNamesMap.get(rel.gameUuid) || [];
      names.push(rel.tagName);
      tagNamesMap.set(rel.gameUuid, names);
    });

    // Step 5: Combine all data and transform
    const exportData = allGames.map((game) => {
      const gameWithRelations = {
        ...game,
        introduction: introductionMap.get(game.uuid),
        categoryNames: categoryNamesMap.get(game.uuid) || [],
        tagNames: tagNamesMap.get(game.uuid) || [],
      };

      // Include content for generating markdown files
      return transformGameForExport(gameWithRelations, true);
    });

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('Error exporting games:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
