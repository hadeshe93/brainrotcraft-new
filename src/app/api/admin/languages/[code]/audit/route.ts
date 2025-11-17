/**
 * Language Audit API Route
 * GET /api/admin/languages/[code]/audit - Get translation audit data for a specific language
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode, EValidationErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import { getLanguageByCode } from '@/services/i18n/languages';
import { auditTranslations } from '@/services/content/translation-audit';

interface RouteContext {
  params: Promise<{ code: string }>;
}

/**
 * GET /api/admin/languages/[code]/audit
 * Get translation audit data for a specific language
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const { code } = await params;

    if (!code || code.trim() === '') {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Language code is required',
      });
    }

    const env = await getCloudflareEnv();
    const db = env.DB;

    // Verify language exists
    const language = await getLanguageByCode(code, db);
    if (!language) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    // Get audit data filtered by this language
    const auditData = await auditTranslations(
      {
        locales: [code],
      },
      db,
    );

    // Extract statistics for this language
    const stats = {
      overall: {
        totalItems: 0,
        completeItems: 0,
        partialItems: 0,
        missingItems: 0,
        completeness: 0,
        online: undefined as { completeness: number } | undefined,
      },
      byModule: {
        games: { total: 0, done: 0, completeness: 0 } as {
          total: number;
          done: number;
          completeness: number;
          online?: { total: number; done: number };
        },
        categories: { total: 0, done: 0, completeness: 0 },
        tags: { total: 0, done: 0, completeness: 0 },
        featured: { total: 0, done: 0, completeness: 0 },
      },
      lastUpdated: Math.floor(Date.now() / 1000),
    };

    // Calculate statistics from audit data
    if (auditData.stats) {
      const overallStats = auditData.stats.overall;

      // Calculate overall completeness (all content)
      const completeness = overallStats.totalItems > 0 ? overallStats.completeItems / overallStats.totalItems : 0;

      stats.overall = {
        totalItems: overallStats.totalItems,
        completeItems: overallStats.completeItems,
        partialItems: overallStats.partialItems,
        missingItems: overallStats.missingItems,
        completeness,
        online: undefined,
      };

      // Add online games + other content completeness (primary focus)
      if (overallStats.online) {
        const onlineCompleteness =
          overallStats.online.totalItems > 0 ? overallStats.online.completeItems / overallStats.online.totalItems : 0;

        stats.overall.online = {
          completeness: onlineCompleteness,
        };
      }

      // Extract module-specific stats
      if (auditData.stats.byType) {
        const typeStats = auditData.stats.byType;

        if (typeStats.game) {
          const gameCompleteness =
            typeStats.game.totalItems > 0 ? typeStats.game.completeItems / typeStats.game.totalItems : 0;

          // Build game stats with optional online field
          const gameStats: {
            total: number;
            done: number;
            completeness: number;
            online?: { total: number; done: number };
          } = {
            total: typeStats.game.totalItems,
            done: typeStats.game.completeItems,
            completeness: gameCompleteness,
          };

          // Add online games statistics if available
          if (typeStats.game.online) {
            gameStats.online = {
              total: typeStats.game.online.totalItems,
              done: typeStats.game.online.completeItems,
            };
          }

          stats.byModule.games = gameStats;
        }

        if (typeStats.category) {
          const categoryCompleteness =
            typeStats.category.totalItems > 0 ? typeStats.category.completeItems / typeStats.category.totalItems : 0;
          stats.byModule.categories = {
            total: typeStats.category.totalItems,
            done: typeStats.category.completeItems,
            completeness: categoryCompleteness,
          };
        }

        if (typeStats.tag) {
          const tagCompleteness =
            typeStats.tag.totalItems > 0 ? typeStats.tag.completeItems / typeStats.tag.totalItems : 0;
          stats.byModule.tags = {
            total: typeStats.tag.totalItems,
            done: typeStats.tag.completeItems,
            completeness: tagCompleteness,
          };
        }

        if (typeStats.featured) {
          const featuredCompleteness =
            typeStats.featured.totalItems > 0 ? typeStats.featured.completeItems / typeStats.featured.totalItems : 0;
          stats.byModule.featured = {
            total: typeStats.featured.totalItems,
            done: typeStats.featured.completeItems,
            completeness: featuredCompleteness,
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: stats,
      message: 'Language audit completed successfully',
    });
  } catch (error) {
    console.error('Error auditing language:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
