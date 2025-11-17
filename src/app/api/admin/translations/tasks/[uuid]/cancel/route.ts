/**
 * Translation Task Cancel API
 * POST /api/admin/translations/tasks/[uuid]/cancel - Cancel a translation task
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import { cancelTranslationTask } from '@/services/i18n/translation-tasks';

/**
 * POST /api/admin/translations/tasks/[uuid]/cancel
 * Cancel a translation task
 *
 * Response:
 * {
 *   "success": true,
 *   "data": { ...updated task },
 *   "message": "Translation task cancelled successfully"
 * }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  try {
    // Check admin access
    await requireAdmin(request);

    // Get database
    const env = await getCloudflareEnv();
    const db = env.DB;

    // Get task UUID from params
    const { uuid } = await params;

    // Cancel task
    const task = await cancelTranslationTask(uuid, db);

    return NextResponse.json({
      success: true,
      data: task,
      message: 'Translation task cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling translation task:', error);

    if (error instanceof Error) {
      if (error.message === 'Admin access required') {
        return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
      }

      if (error.message === 'Authentication required') {
        return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
      }

      if (error.message === 'Translation task not found') {
        return NextResponse.json(
          {
            success: false,
            message: error.message,
          },
          { status: 404 },
        );
      }

      if (error.message.includes('Cannot cancel task')) {
        return NextResponse.json(
          {
            success: false,
            message: error.message,
          },
          { status: 400 },
        );
      }
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
