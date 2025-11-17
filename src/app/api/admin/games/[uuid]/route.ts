/**
 * Game Detail API Routes
 * GET /api/admin/games/[uuid] - Get game by UUID
 * PUT /api/admin/games/[uuid] - Update game by UUID
 * DELETE /api/admin/games/[uuid] - Delete game by UUID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode, EValidationErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import {
  validateUuid,
  validateRequired,
  validateLength,
  validateSlug,
  validateUrl,
  validateEnum,
  composeValidation,
} from '@/lib/validation';
import {
  getGameByUuid,
  getGameWithAllTranslations,
  updateGame,
  deleteGame,
  slugExists,
} from '@/services/content/games';

interface RouteContext {
  params: Promise<{ uuid: string }>;
}

/**
 * GET /api/admin/games/[uuid]
 * Get game by UUID
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    // Check admin access
    await requireAdmin();

    // Await params to get the uuid
    const { uuid } = await params;

    // Validate UUID
    const uuidValidation = validateUuid(uuid);
    if (!uuidValidation.valid) {
      return await APIErrors.badRequest(uuidValidation.errorCode!, { customMessage: uuidValidation.message });
    }

    // Get database
    const env = await getCloudflareEnv();
    const db = env.DB;

    // Get game with all translations for admin panel
    const game = await getGameWithAllTranslations(uuid, db);

    if (!game) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    return NextResponse.json({
      success: true,
      data: game,
      message: 'Game retrieved successfully',
    });
  } catch (error) {
    console.error('Error getting game:', error);

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
 * PUT /api/admin/games/[uuid]
 * Update game by UUID
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    // Check admin access
    await requireAdmin();

    // Await params to get the uuid
    const { uuid } = await params;

    // Validate UUID
    const uuidValidation = validateUuid(uuid);
    if (!uuidValidation.valid) {
      return await APIErrors.badRequest(uuidValidation.errorCode!, { customMessage: uuidValidation.message });
    }

    // Parse request body
    const body = (await request.json()) as any;
    const { name, slug, thumbnail, source, status, introduction, nameI18n } = body;

    // Build validations for provided fields
    const validations = [];

    if (name !== undefined) {
      validations.push(validateLength(name, 'Name', 1, 200));
    }

    if (slug !== undefined) {
      if (slug === '') {
        // Empty slug is allowed (homepage game)
      } else {
        // Only validate format and length if slug is not empty
        validations.push(composeValidation(validateSlug(slug, true), validateLength(slug, 'Slug', 1, 100)));
      }
    }

    if (thumbnail !== undefined) {
      validations.push(validateUrl(thumbnail, 'Thumbnail'));
    }

    if (source !== undefined) {
      validations.push(validateUrl(source, 'Source'));
    }

    if (status !== undefined) {
      validations.push(validateEnum(status, 'Status', ['draft', 'online', 'offline'], false));
    }

    // Validate introduction fields if provided
    if (introduction) {
      if (introduction?.metadataTitle !== undefined) {
        validations.push(
          composeValidation(
            validateRequired(introduction.metadataTitle, 'SEO Title'),
            validateLength(introduction.metadataTitle, 'SEO Title', 1, 200),
          ),
        );
      }

      if (introduction?.metadataDescription !== undefined) {
        validations.push(
          composeValidation(
            validateRequired(introduction.metadataDescription, 'SEO Description'),
            validateLength(introduction.metadataDescription, 'SEO Description', 1, 300),
          ),
        );
      }

      if (introduction?.content !== undefined) {
        validations.push(validateRequired(introduction.content, 'Game Introduction'));
      }
    }

    // Run all validations
    const validation = composeValidation(...validations);
    if (!validation.valid) {
      return await APIErrors.badRequest(validation.errorCode!, { customMessage: validation.message });
    }

    // Get database
    const env = await getCloudflareEnv();
    const db = env.DB;

    // Check if game exists
    const existingGame = await getGameByUuid(uuid, db);
    if (!existingGame) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    // Check if slug already exists (excluding current game)
    if (slug && slug !== existingGame.slug) {
      const slugAlreadyExists = await slugExists(slug, uuid, db);
      if (slugAlreadyExists) {
        return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
          customMessage: 'Slug already exists',
        });
      }
    }

    // Update game
    const updatedGame = await updateGame(
      uuid,
      {
        name,
        slug,
        thumbnail,
        source,
        status,
        introduction: introduction || undefined,
        nameI18n: nameI18n || undefined,
      },
      db,
    );

    return NextResponse.json({
      success: true,
      data: updatedGame,
      message: 'Game updated successfully',
    });
  } catch (error) {
    console.error('Error updating game:', error);

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
 * DELETE /api/admin/games/[uuid]
 * Soft delete game by UUID
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    // Check admin access
    await requireAdmin();

    // Await params to get the uuid
    const { uuid } = await params;

    // Validate UUID
    const uuidValidation = validateUuid(uuid);
    if (!uuidValidation.valid) {
      return await APIErrors.badRequest(uuidValidation.errorCode!, { customMessage: uuidValidation.message });
    }

    // Get database
    const env = await getCloudflareEnv();
    const db = env.DB;

    // Check if game exists
    const existingGame = await getGameByUuid(uuid, db);
    if (!existingGame) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    // Delete game
    await deleteGame(uuid, db);

    return NextResponse.json({
      success: true,
      data: null,
      message: 'Game deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting game:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
