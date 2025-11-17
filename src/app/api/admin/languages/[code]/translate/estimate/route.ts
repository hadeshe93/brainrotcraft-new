/**
 * Translation Estimate API Route
 * GET /api/admin/languages/[code]/translate/estimate - Get translation workload estimate
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
 * GET /api/admin/languages/[code]/translate/estimate
 * Get translation workload estimate
 *
 * Query parameters:
 * - type: 'full' | 'supplement' (default: 'supplement')
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

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'supplement';

    if (type !== 'full' && type !== 'supplement') {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Type must be either "full" or "supplement"',
      });
    }

    const env = await getCloudflareEnv();
    const db = env.DB;

    // Verify language exists
    const language = await getLanguageByCode(code, db);
    if (!language) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    // Get audit data for this language
    const auditData = await auditTranslations(
      {
        locales: [code],
      },
      db,
    );

    // Calculate items to translate
    const estimate = {
      type,
      totalItems: 0,
      breakdown: {
        games: 0,
        categories: 0,
        tags: 0,
        featured: 0,
      },
      estimatedMinutes: 0,
    };

    if (auditData.stats?.byType) {
      const typeStats = auditData.stats.byType;

      if (type === 'supplement') {
        // Only count missing and partial items
        // For games: use online games statistics if available (primary focus)
        if (typeStats.game) {
          if (typeStats.game.online) {
            estimate.breakdown.games = typeStats.game.online.missingItems + typeStats.game.online.partialItems;
          } else {
            estimate.breakdown.games = typeStats.game.missingItems + typeStats.game.partialItems;
          }
        }
        if (typeStats.category) {
          estimate.breakdown.categories = typeStats.category.missingItems + typeStats.category.partialItems;
        }
        if (typeStats.tag) {
          estimate.breakdown.tags = typeStats.tag.missingItems + typeStats.tag.partialItems;
        }
        if (typeStats.featured) {
          estimate.breakdown.featured = typeStats.featured.missingItems + typeStats.featured.partialItems;
        }
      } else {
        // Full translation - count all items
        // For games: use online games statistics if available (only translate online games)
        if (typeStats.game) {
          if (typeStats.game.online) {
            estimate.breakdown.games = typeStats.game.online.totalItems;
          } else {
            estimate.breakdown.games = typeStats.game.totalItems;
          }
        }
        if (typeStats.category) {
          estimate.breakdown.categories = typeStats.category.totalItems;
        }
        if (typeStats.tag) {
          estimate.breakdown.tags = typeStats.tag.totalItems;
        }
        if (typeStats.featured) {
          estimate.breakdown.featured = typeStats.featured.totalItems;
        }
      }
    }

    // Calculate total items
    estimate.totalItems =
      estimate.breakdown.games + estimate.breakdown.categories + estimate.breakdown.tags + estimate.breakdown.featured;

    // Estimate time (rough estimate: 2 seconds per item on average)
    // Categories/Tags/Featured are simpler (1.5s), Games are more complex (3s)
    const estimatedSeconds =
      estimate.breakdown.games * 3 +
      estimate.breakdown.categories * 1.5 +
      estimate.breakdown.tags * 1.5 +
      estimate.breakdown.featured * 1.5;

    estimate.estimatedMinutes = Math.ceil(estimatedSeconds / 60);

    return NextResponse.json({
      success: true,
      data: estimate,
      message: 'Translation estimate calculated successfully',
    });
  } catch (error) {
    console.error('Error estimating translation workload:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
