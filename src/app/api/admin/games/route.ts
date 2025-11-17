/**
 * Games API Routes
 * GET /api/admin/games - List games with pagination and filtering
 * POST /api/admin/games - Create a new game
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode, EValidationErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import {
  validateRequired,
  validateLength,
  validateSlug,
  validateUrl,
  validateEnum,
  validatePagination,
  composeValidation,
} from '@/lib/validation';
import { createGame, listGames, slugExists } from '@/services/content/games';

/**
 * GET /api/admin/games
 * List games with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as 'draft' | 'online' | 'offline' | null;
    const search = searchParams.get('search');
    const orderBy = (searchParams.get('orderBy') || 'created_at') as
      | 'created_at'
      | 'rating'
      | 'interact'
      | 'name'
      | 'status';
    const orderDirection = (searchParams.get('orderDirection') || 'desc') as 'asc' | 'desc';
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');

    // Validate pagination
    const paginationValidation = validatePagination(page, pageSize, 10000);
    if (!paginationValidation.valid) {
      return await APIErrors.badRequest(paginationValidation.errorCode!, {
        customMessage: paginationValidation.message,
      });
    }

    // Validate status if provided
    if (status) {
      const statusValidation = validateEnum(status, 'Status', ['draft', 'online', 'offline'], false);
      if (!statusValidation.valid) {
        return await APIErrors.badRequest(statusValidation.errorCode!, { customMessage: statusValidation.message });
      }
    }

    // Get database
    const env = await getCloudflareEnv();
    const db = env.DB;

    // List games
    const result = await listGames(
      {
        status: status || undefined,
        search: search || undefined,
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
      message: 'Games retrieved successfully',
    });
  } catch (error) {
    console.error('Error listing games:', error);

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
 * POST /api/admin/games
 * Create a new game
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin();

    // Parse request body
    const body = (await request.json()) as any;
    const { name, slug, thumbnail, source, status, introduction, nameI18n } = body;

    // Validate required fields
    const nameValidation = composeValidation(validateRequired(name, 'Name'), validateLength(name, 'Name', 1, 200));

    const slugValidation = composeValidation(validateSlug(slug, true), validateLength(slug, 'Slug', 1, 100));

    const thumbnailValidation = composeValidation(
      validateRequired(thumbnail, 'Thumbnail'),
      validateUrl(thumbnail, 'Thumbnail'),
    );

    const sourceValidation = composeValidation(validateRequired(source, 'Source'), validateUrl(source, 'Source'));

    const statusValidation = validateEnum(status, 'Status', ['draft', 'online', 'offline'], false);

    // Validate introduction fields if provided
    const validations = [nameValidation, slugValidation, thumbnailValidation, sourceValidation, statusValidation];

    if (introduction) {
      const metadataTitleValidation = composeValidation(
        validateRequired(introduction.metadataTitle, 'SEO Title'),
        validateLength(introduction.metadataTitle, 'SEO Title', 1, 200),
      );

      const metadataDescriptionValidation = composeValidation(
        validateRequired(introduction.metadataDescription, 'SEO Description'),
        validateLength(introduction.metadataDescription, 'SEO Description', 1, 300),
      );

      const contentValidation = validateRequired(introduction.content, 'Game Introduction');

      validations.push(metadataTitleValidation, metadataDescriptionValidation, contentValidation);
    }

    // Combine all validations
    const validation = composeValidation(...validations);

    if (!validation.valid) {
      return await APIErrors.badRequest(validation.errorCode!, { customMessage: validation.message });
    }

    // Get database
    const env = await getCloudflareEnv();
    const db = env.DB;

    // Check if slug already exists
    const slugAlreadyExists = await slugExists(slug, undefined, db);
    if (slugAlreadyExists) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Slug already exists',
      });
    }

    // Create game
    const newGame = await createGame(
      {
        name,
        slug,
        thumbnail,
        source,
        status: status || 'draft',
        introduction: introduction || undefined,
        nameI18n: nameI18n || undefined,
      },
      db,
    );

    return NextResponse.json(
      {
        success: true,
        data: newGame,
        message: 'Game created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating game:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
