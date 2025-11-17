/**
 * Translation Task Detail API
 * GET /api/admin/translations/tasks/[uuid] - Get task details
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import { getTranslationTaskByUuid } from '@/services/i18n/translation-tasks';

/**
 * GET /api/admin/translations/tasks/[uuid]
 * Get translation task details
 *
 * Response:
 * {
 *   "success": true,
 *   "data": { ...task }
 * }
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  try {
    // Check admin access
    await requireAdmin(request);

    // Get database
    const env = await getCloudflareEnv();
    const db = env.DB;

    // Get task UUID from params
    const { uuid } = await params;

    // Get task
    const task = await getTranslationTaskByUuid(uuid, db);

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          message: 'Translation task not found',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Error fetching translation task:', error);

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
