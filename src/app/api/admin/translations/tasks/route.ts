/**
 * Translation Tasks List API
 * GET /api/admin/translations/tasks - Get all translation tasks with optional filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import { getAllTranslationTasks, getTranslationTaskStats } from '@/services/i18n/translation-tasks';

/**
 * GET /api/admin/translations/tasks
 * Get all translation tasks with optional filters
 *
 * Query parameters:
 * - languageCode: Filter by language code (optional)
 * - status: Filter by status (optional)
 * - limit: Limit number of results (optional, default: 50)
 * - offset: Offset for pagination (optional, default: 0)
 * - includeStats: Include task statistics (optional, default: false)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "tasks": [...],
 *     "stats": { ... } // Only if includeStats=true
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin(request);

    // Get database
    const env = await getCloudflareEnv();
    const db = env.DB;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const languageCode = searchParams.get('languageCode') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const includeStats = searchParams.get('includeStats') === 'true';

    // Validate status if provided
    const validStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        },
        { status: 400 },
      );
    }

    // Get tasks
    const tasks = await getAllTranslationTasks(
      {
        languageCode,
        status: status as 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | undefined,
        limit,
        offset,
      },
      db,
    );

    // Get stats if requested
    let stats = undefined;
    if (includeStats) {
      stats = await getTranslationTaskStats(db);
    }

    return NextResponse.json({
      success: true,
      data: {
        tasks,
        ...(stats && { stats }),
      },
    });
  } catch (error) {
    console.error('Error fetching translation tasks:', error);

    if (error instanceof Error) {
      if (error.message === 'Admin access required') {
        return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
      }

      if (error.message === 'Authentication required') {
        return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
      }
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
