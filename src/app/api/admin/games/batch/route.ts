/**
 * Batch Operations API Routes
 * POST /api/admin/games/batch - Batch update or delete games
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode, EValidationErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import { validateRequired, validateEnum, composeValidation } from '@/lib/validation';
import { batchUpdateGames, batchDeleteGames } from '@/services/content/games';

/**
 * POST /api/admin/games/batch
 * Batch update or delete games
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin();

    // Parse request body
    const body = (await request.json()) as any;
    const { action, uuids, data } = body;

    // Validate required fields
    const actionValidation = composeValidation(
      validateRequired(action, 'Action'),
      validateEnum(action, 'Action', ['update', 'delete'], true),
    );

    const uuidsValidation = validateRequired(uuids, 'UUIDs');

    const validation = composeValidation(actionValidation, uuidsValidation);

    if (!validation.valid) {
      return await APIErrors.badRequest(validation.errorCode!, { customMessage: validation.message });
    }

    // Validate uuids is an array
    if (!Array.isArray(uuids) || uuids.length === 0) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'UUIDs must be a non-empty array',
      });
    }

    // Get database
    const env = await getCloudflareEnv();
    const db = env.DB;

    // Perform batch operation
    if (action === 'update') {
      // Validate data for update
      if (!data || typeof data !== 'object') {
        return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
          customMessage: 'Data is required for update action',
        });
      }

      // Validate status if provided
      if (data.status) {
        const statusValidation = validateEnum(data.status, 'Status', ['draft', 'online', 'offline'], false);
        if (!statusValidation.valid) {
          return await APIErrors.badRequest(statusValidation.errorCode!, { customMessage: statusValidation.message });
        }
      }

      await batchUpdateGames(uuids, data, db);

      return NextResponse.json({
        success: true,
        data: { count: uuids.length },
        message: `${uuids.length} game(s) updated successfully`,
      });
    } else if (action === 'delete') {
      await batchDeleteGames(uuids, db);

      return NextResponse.json({
        success: true,
        data: { count: uuids.length },
        message: `${uuids.length} game(s) deleted successfully`,
      });
    }

    return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER);
  } catch (error) {
    console.error('Error in batch operation:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
