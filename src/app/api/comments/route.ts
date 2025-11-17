/**
 * Public Comments API
 * Handles anonymous comment submission and retrieval
 */

import { NextRequest } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors, APISuccess } from '@/lib/api-response';
import { ECommonErrorCode, EValidationErrorCode } from '@/types/services/errors';
import { createComment, getApprovedComments, type CreateCommentInput } from '@/services/content/comments';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { checkRateLimit, getClientIP, RateLimits } from '@/lib/rate-limit';
import { filterContent, validateContentLength, validateEmail, validateName } from '@/lib/content-filter';
import { validateUuid, validatePagination } from '@/lib/validation';

/**
 * GET /api/comments?game_uuid=xxx&page=1
 * Get approved comments for a game
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameUuid = searchParams.get('game_uuid');
    const page = searchParams.get('page');
    const pageSize = searchParams.get('page_size');

    // Validate game UUID
    const uuidValidation = validateUuid(gameUuid);
    if (!uuidValidation.valid) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: uuidValidation.message,
      });
    }

    // Validate pagination
    const paginationValidation = validatePagination(page, pageSize, 50);
    if (!paginationValidation.valid) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: paginationValidation.message,
      });
    }

    const { page: pageNum, pageSize: pageSizeNum } = paginationValidation.params!;

    // Get database
    const env = await getCloudflareEnv();
    const db = (env as any).DB as D1Database;

    // Get approved comments
    const result = await getApprovedComments(gameUuid!, pageNum, pageSizeNum, db);

    return await APISuccess.ok({
      comments: result.data.map((comment) => ({
        uuid: comment.uuid,
        content: comment.content,
        author_name: comment.userUuid ? 'User' : 'Anonymous', // Can be enhanced to fetch user name
        created_at: comment.createdAt,
        is_ai_generated: comment.isAiGenerated,
      })),
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('GET /api/comments error:', error);
    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}

/**
 * POST /api/comments
 * Submit anonymous comment
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as any;
    const { game_uuid, anonymous_name, anonymous_email, content, turnstile_token } = body;

    // Validate required fields
    if (!game_uuid || !anonymous_name || !anonymous_email || !content || !turnstile_token) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Missing required fields',
      });
    }

    // Validate game UUID
    const uuidValidation = validateUuid(game_uuid);
    if (!uuidValidation.valid) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: uuidValidation.message,
      });
    }

    // Validate name
    const nameValidation = validateName(anonymous_name);
    if (!nameValidation.valid) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: nameValidation.message,
      });
    }

    // Validate email
    if (!validateEmail(anonymous_email)) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Invalid email format',
      });
    }

    // Validate content length (10-500 characters)
    const lengthValidation = validateContentLength(content, 10, 500);
    if (!lengthValidation.valid) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: lengthValidation.message,
      });
    }

    // Filter profanity
    const filterResult = filterContent(content);
    if (filterResult.hasProfanity) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Content contains inappropriate language',
      });
    }

    // Get client IP
    const clientIP = getClientIP(request);

    // Verify Turnstile token
    const turnstileResult = await verifyTurnstileToken(turnstile_token, clientIP);
    if (!turnstileResult.success) {
      return await APIErrors.badRequest(ECommonErrorCode.TURNSTILE_VERIFICATION_FAILED, {
        customMessage: 'Verification failed',
      });
    }

    // Check rate limit (3 comments per 5 minutes)
    const rateLimitResult = await checkRateLimit(clientIP, RateLimits.COMMENT);
    if (!rateLimitResult.allowed) {
      return await APIErrors.tooManyRequests(ECommonErrorCode.RATE_LIMIT_EXCEEDED, {
        customMessage: `Too many comments. Please wait ${rateLimitResult.resetIn} seconds`,
      });
    }

    // Get database
    const env = await getCloudflareEnv();
    const db = (env as any).DB as D1Database;

    // Create comment
    const commentInput: CreateCommentInput = {
      gameUuid: game_uuid,
      userUuid: null, // Anonymous comment
      content: filterResult.cleanedContent,
      status: 'pending', // Default to pending for moderation
      isAiGenerated: false,
      anonymousName: anonymous_name,
      anonymousEmail: anonymous_email,
      source: 'anonymous',
      ipAddress: clientIP,
    };

    const newComment = await createComment(commentInput, db);

    return await APISuccess.created({
      success: true,
      message: 'Comment submitted successfully. It will be reviewed before appearing publicly.',
      comment_uuid: newComment.uuid,
    });
  } catch (error) {
    console.error('POST /api/comments error:', error);
    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
