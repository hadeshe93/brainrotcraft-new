/**
 * Comments Batch Operations API
 * POST /api/admin/comments/batch - Batch approve or reject comments
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode, EValidationErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import { validateRequired, validateEnum, composeValidation } from '@/lib/validation';
import { batchApproveComments, batchRejectComments } from '@/services/content/comments';

/**
 * POST /api/admin/comments/batch
 * Batch approve or reject comments
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = (await request.json()) as any;
    const { uuids, action } = body;

    // Validate required fields
    const uuidsValidation = validateRequired(JSON.stringify(uuids), 'Comment UUIDs');
    const actionValidation = validateEnum(action, 'Action', ['approve', 'reject'], true);

    const validation = composeValidation(uuidsValidation, actionValidation);

    if (!validation.valid) {
      return await APIErrors.badRequest(validation.errorCode!, { customMessage: validation.message });
    }

    // Validate uuids is an array
    if (!Array.isArray(uuids) || uuids.length === 0) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'UUIDs must be a non-empty array',
      });
    }

    const env = await getCloudflareEnv();
    const db = env.DB;

    // Perform batch operation
    if (action === 'approve') {
      await batchApproveComments(uuids, db);
    } else if (action === 'reject') {
      await batchRejectComments(uuids, db);
    }

    return NextResponse.json({
      success: true,
      data: {
        count: uuids.length,
        action,
      },
      message: `Successfully ${action === 'approve' ? 'approved' : 'rejected'} ${uuids.length} comments`,
    });
  } catch (error) {
    console.error('Error batch processing comments:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
