/**
 * Comment Detail API Routes
 * GET /api/admin/comments/[uuid] - Get comment by UUID
 * PUT /api/admin/comments/[uuid] - Update comment by UUID
 * DELETE /api/admin/comments/[uuid] - Delete comment by UUID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import { validateUuid, validateLength, validateEnum, composeValidation } from '@/lib/validation';
import { getCommentByUuid, updateComment, deleteComment } from '@/services/content/comments';

interface RouteContext {
  params: Promise<{ uuid: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const { uuid } = await params;

    const uuidValidation = validateUuid(uuid);
    if (!uuidValidation.valid) {
      return await APIErrors.badRequest(uuidValidation.errorCode!, { customMessage: uuidValidation.message });
    }

    const env = await getCloudflareEnv();
    const db = env.DB;
    const comment = await getCommentByUuid(uuid, db);

    if (!comment) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    return NextResponse.json({
      success: true,
      data: comment,
      message: 'Comment retrieved successfully',
    });
  } catch (error) {
    console.error('Error getting comment:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const { uuid } = await params;

    const uuidValidation = validateUuid(uuid);
    if (!uuidValidation.valid) {
      return await APIErrors.badRequest(uuidValidation.errorCode!, { customMessage: uuidValidation.message });
    }

    const body = (await request.json()) as any;
    const { content, status } = body;

    const validations = [];

    if (content !== undefined) {
      validations.push(validateLength(content, 'Content', 1, 2000));
    }

    if (status !== undefined) {
      validations.push(validateEnum(status, 'Status', ['pending', 'approved', 'rejected'], false));
    }

    const validation = composeValidation(...validations);
    if (!validation.valid) {
      return await APIErrors.badRequest(validation.errorCode!, { customMessage: validation.message });
    }

    const env = await getCloudflareEnv();
    const db = env.DB;

    const existingComment = await getCommentByUuid(uuid, db);
    if (!existingComment) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    const updatedComment = await updateComment(uuid, { content, status }, db);

    return NextResponse.json({
      success: true,
      data: updatedComment,
      message: 'Comment updated successfully',
    });
  } catch (error) {
    console.error('Error updating comment:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const { uuid } = await params;

    const uuidValidation = validateUuid(uuid);
    if (!uuidValidation.valid) {
      return await APIErrors.badRequest(uuidValidation.errorCode!, { customMessage: uuidValidation.message });
    }

    const env = await getCloudflareEnv();
    const db = env.DB;

    const existingComment = await getCommentByUuid(uuid, db);
    if (!existingComment) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    await deleteComment(uuid, db);

    return NextResponse.json({
      success: true,
      data: null,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting comment:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
