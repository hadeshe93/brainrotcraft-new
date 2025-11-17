/**
 * Game Introductions API Routes
 * GET /api/admin/introductions - Get introduction by game UUID
 * POST /api/admin/introductions - Create or update introduction (upsert)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode, EValidationErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import { validateUuid, validateRequired, validateLength, composeValidation } from '@/lib/validation';
import { getIntroductionByGameUuid, upsertIntroduction } from '@/services/content/introductions';
import { getGameByUuid } from '@/services/content/games';

/**
 * GET /api/admin/introductions?gameUuid=xxx
 * Get introduction by game UUID
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const gameUuid = searchParams.get('gameUuid');

    if (!gameUuid) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'gameUuid query parameter is required',
      });
    }

    const gameUuidValidation = validateUuid(gameUuid);
    if (!gameUuidValidation.valid) {
      return await APIErrors.badRequest(gameUuidValidation.errorCode!, { customMessage: gameUuidValidation.message });
    }

    const env = await getCloudflareEnv();
    const db = env.DB;

    const introduction = await getIntroductionByGameUuid(gameUuid, db);

    if (!introduction) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    return NextResponse.json({
      success: true,
      data: introduction,
      message: 'Introduction retrieved successfully',
    });
  } catch (error) {
    console.error('Error getting introduction:', error);

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
 * POST /api/admin/introductions
 * Create or update introduction (upsert)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = (await request.json()) as any;
    const { gameUuid, metadataTitle, metadataDescription, content } = body;

    // Validate required fields
    const gameUuidValidation = validateUuid(gameUuid);

    const metadataTitleValidation = composeValidation(
      validateRequired(metadataTitle, 'Metadata title'),
      validateLength(metadataTitle, 'Metadata title', 1, 200),
    );

    const metadataDescriptionValidation = composeValidation(
      validateRequired(metadataDescription, 'Metadata description'),
      validateLength(metadataDescription, 'Metadata description', 1, 500),
    );

    const contentValidation = composeValidation(
      validateRequired(content, 'Content'),
      validateLength(content, 'Content', 10, 50000),
    );

    const validation = composeValidation(
      gameUuidValidation,
      metadataTitleValidation,
      metadataDescriptionValidation,
      contentValidation,
    );

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

    // Upsert introduction
    const introduction = await upsertIntroduction(
      {
        gameUuid,
        metadataTitle,
        metadataDescription,
        content,
      },
      db,
    );

    return NextResponse.json(
      {
        success: true,
        data: introduction,
        message: 'Introduction saved successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error saving introduction:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
