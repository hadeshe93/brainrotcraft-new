/**
 * Comments API Routes
 * GET /api/admin/comments - List comments with pagination and filtering
 * POST /api/admin/comments - Create a new comment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode, EValidationErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import {
  validateRequired,
  validateLength,
  validateUuid,
  validateEnum,
  validatePagination,
  composeValidation,
} from '@/lib/validation';
import { createComment, listComments } from '@/services/content/comments';
import { getGameByUuid } from '@/services/content/games';

/**
 * GET /api/admin/comments
 * List comments with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const gameUuid = searchParams.get('gameUuid');
    const userUuid = searchParams.get('userUuid');
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;
    const isAiGenerated = searchParams.get('isAiGenerated');
    const orderBy = (searchParams.get('orderBy') || 'created_at') as 'created_at';
    const orderDirection = (searchParams.get('orderDirection') || 'desc') as 'asc' | 'desc';
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');

    // Validate pagination
    const paginationValidation = validatePagination(page, pageSize, 100);
    if (!paginationValidation.valid) {
      return await APIErrors.badRequest(paginationValidation.errorCode!, {
        customMessage: paginationValidation.message,
      });
    }

    // Validate status if provided
    if (status) {
      const statusValidation = validateEnum(status, 'Status', ['pending', 'approved', 'rejected'], false);
      if (!statusValidation.valid) {
        return await APIErrors.badRequest(statusValidation.errorCode!, { customMessage: statusValidation.message });
      }
    }

    // Validate gameUuid if provided
    if (gameUuid) {
      const gameUuidValidation = validateUuid(gameUuid);
      if (!gameUuidValidation.valid) {
        return await APIErrors.badRequest(gameUuidValidation.errorCode!, { customMessage: gameUuidValidation.message });
      }
    }

    const env = await getCloudflareEnv();
    const db = env.DB;

    // List comments
    const result = await listComments(
      {
        gameUuid: gameUuid || undefined,
        userUuid: userUuid || undefined,
        status: status || undefined,
        isAiGenerated: isAiGenerated === 'true' ? true : isAiGenerated === 'false' ? false : undefined,
        orderBy,
        orderDirection,
        page: paginationValidation.params!.page,
        pageSize: paginationValidation.params!.pageSize,
      },
      db,
    );

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.pagination,
      message: 'Comments retrieved successfully',
    });
  } catch (error) {
    console.error('Error listing comments:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}

/**
 * POST /api/admin/comments
 * Create a new comment
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = (await request.json()) as any;
    const { gameUuid, userUuid, content, status, isAiGenerated } = body;

    // Validate required fields
    const gameUuidValidation = validateUuid(gameUuid);
    const contentValidation = composeValidation(
      validateRequired(content, 'Content'),
      validateLength(content, 'Content', 1, 2000),
    );

    const statusValidation = validateEnum(status, 'Status', ['pending', 'approved', 'rejected'], false);

    // Validate userUuid if provided
    let userUuidValidation = { valid: true };
    if (userUuid) {
      userUuidValidation = validateUuid(userUuid);
    }

    const validation = composeValidation(gameUuidValidation, contentValidation, statusValidation, userUuidValidation);

    if (!validation.valid) {
      return await APIErrors.badRequest(validation.errorCode!, { customMessage: validation.message });
    }

    const env = await getCloudflareEnv();
    const db = env.DB;

    // Check if game exists
    const game = await getGameByUuid(gameUuid, db);
    if (!game) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, { customMessage: 'Game not found' });
    }

    // Create comment
    const newComment = await createComment(
      {
        gameUuid,
        userUuid: userUuid || null,
        content,
        status: status || 'pending',
        isAiGenerated: !!isAiGenerated,
      },
      db,
    );

    return NextResponse.json(
      {
        success: true,
        data: newComment,
        message: 'Comment created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating comment:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
