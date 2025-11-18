/**
 * Featured API Routes
 * GET /api/admin/featured - Get all featured collections
 * POST /api/admin/featured - Create a new featured collection
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
import { createFeatured, listFeatured, featuredSlugExists } from '@/services/content/featured';

/**
 * GET /api/admin/featured
 * List featured collections with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const orderBy = (searchParams.get('orderBy') || 'name') as 'created_at' | 'name';
    const orderDirection = (searchParams.get('orderDirection') || 'asc') as 'asc' | 'desc';
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');

    // Validate pagination
    const paginationValidation = validatePagination(page, pageSize, 100);
    if (!paginationValidation.valid) {
      return await APIErrors.badRequest(paginationValidation.errorCode!, {
        customMessage: paginationValidation.message,
      });
    }

    // Get database
    const env = await getCloudflareEnv();
    const db = env.DB;

    // List featured collections
    const result = await listFeatured(
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
      message: 'Featured collections retrieved successfully',
    });
  } catch (error) {
    console.error('Error listing featured collections:', error);

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
 * POST /api/admin/featured
 * Create a new featured collection
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin();

    // Parse request body
    const body = (await request.json()) as any;
    const { name, slug, metadataTitle, metadataDescription, content, translations } = body;

    // Validate required fields
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

    // Combine all validations
    const validation = composeValidation(
      nameValidation,
      slugValidation,
      metadataTitleValidation,
      metadataDescriptionValidation,
    );

    if (!validation.valid) {
      return await APIErrors.badRequest(validation.errorCode!, { customMessage: validation.message });
    }

    // Get database
    const env = await getCloudflareEnv();
    const db = env.DB;

    // Check if slug already exists (including deleted records)
    const slugAlreadyExists = await featuredSlugExists(slug, undefined, db);
    if (slugAlreadyExists) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Slug already exists',
      });
    }

    // Check if a deleted record with this slug exists and permanently delete it
    const { createDrizzleClient } = await import('@/db/client');
    const { featured: featuredTable } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');

    const client = createDrizzleClient(db);
    const deletedRecord = await client
      .select()
      .from(featuredTable)
      .where(eq(featuredTable.slug, slug))
      .limit(1);

    if (deletedRecord.length > 0 && deletedRecord[0].deletedAt !== null) {
      // Permanently delete the old record to free up the slug
      await client.delete(featuredTable).where(eq(featuredTable.uuid, deletedRecord[0].uuid));
    }

    // Create featured collection
    const newFeatured = await createFeatured(
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
        data: newFeatured,
        message: 'Featured collection created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating featured collection:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
