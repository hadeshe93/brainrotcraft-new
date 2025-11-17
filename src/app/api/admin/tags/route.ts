/**
 * Tags API Routes
 * GET /api/admin/tags - List tags with pagination and filtering
 * POST /api/admin/tags - Create a new tag
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
  validatePagination,
  composeValidation,
} from '@/lib/validation';
import { createTag, listTags, tagSlugExists } from '@/services/content/tags';

/**
 * GET /api/admin/tags
 * List tags with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const orderBy = (searchParams.get('orderBy') || 'name') as 'created_at' | 'name';
    const orderDirection = (searchParams.get('orderDirection') || 'asc') as 'asc' | 'desc';
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');

    const paginationValidation = validatePagination(page, pageSize, 100);
    if (!paginationValidation.valid) {
      return await APIErrors.badRequest(paginationValidation.errorCode!, {
        customMessage: paginationValidation.message,
      });
    }

    const env = await getCloudflareEnv();
    const db = env.DB;

    const result = await listTags(
      {
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
      message: 'Tags retrieved successfully',
    });
  } catch (error) {
    console.error('Error listing tags:', error);

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
 * POST /api/admin/tags
 * Create a new tag
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = (await request.json()) as any;
    const { name, slug, metadataTitle, metadataDescription, content, translations } = body;

    const nameValidation = composeValidation(validateRequired(name, 'Name'), validateLength(name, 'Name', 1, 200));

    const slugValidation = composeValidation(validateSlug(slug, true), validateLength(slug, 'Slug', 1, 100));

    const metadataTitleValidation = composeValidation(
      validateRequired(metadataTitle, 'Metadata title'),
      validateLength(metadataTitle, 'Metadata title', 1, 200),
    );

    const metadataDescriptionValidation = composeValidation(
      validateRequired(metadataDescription, 'Metadata description'),
      validateLength(metadataDescription, 'Metadata description', 1, 500),
    );

    const validation = composeValidation(
      nameValidation,
      slugValidation,
      metadataTitleValidation,
      metadataDescriptionValidation,
    );

    if (!validation.valid) {
      return await APIErrors.badRequest(validation.errorCode!, { customMessage: validation.message });
    }

    const env = await getCloudflareEnv();
    const db = env.DB;

    const slugAlreadyExists = await tagSlugExists(slug, undefined, db);
    if (slugAlreadyExists) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Slug already exists',
      });
    }

    const newTag = await createTag(
      {
        name,
        slug,
        metadataTitle,
        metadataDescription,
        content: content || undefined,
        translations: translations || undefined,
      },
      db,
    );

    return NextResponse.json(
      {
        success: true,
        data: newTag,
        message: 'Tag created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating tag:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
