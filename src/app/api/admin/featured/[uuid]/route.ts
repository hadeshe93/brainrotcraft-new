/**
 * Featured Collection Detail API Routes
 * GET /api/admin/featured/[uuid] - Get featured collection by UUID
 * PUT /api/admin/featured/[uuid] - Update featured collection by UUID
 * DELETE /api/admin/featured/[uuid] - Delete featured collection by UUID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode, EValidationErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import { validateUuid, validateLength, validateSlug, composeValidation } from '@/lib/validation';
import {
  getFeaturedByUuid,
  getFeaturedWithAllTranslations,
  updateFeatured,
  deleteFeatured,
  featuredSlugExists,
} from '@/services/content/featured';

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

    // Get featured collection with all translations for admin panel
    const featured = await getFeaturedWithAllTranslations(uuid, db);

    if (!featured) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    return NextResponse.json({
      success: true,
      data: featured,
      message: 'Featured collection retrieved successfully',
    });
  } catch (error) {
    console.error('Error getting featured:', error);

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
    const { name, slug, metadataTitle, metadataDescription, content, translations } = body;

    const validations = [];

    if (name !== undefined) {
      validations.push(validateLength(name, 'Name', 1, 200));
    }

    if (slug !== undefined) {
      validations.push(composeValidation(validateSlug(slug, true), validateLength(slug, 'Slug', 1, 100)));
    }

    if (metadataTitle !== undefined) {
      validations.push(validateLength(metadataTitle, 'Metadata title', 1, 200));
    }

    if (metadataDescription !== undefined) {
      validations.push(validateLength(metadataDescription, 'Metadata description', 1, 500));
    }

    const validation = composeValidation(...validations);
    if (!validation.valid) {
      return await APIErrors.badRequest(validation.errorCode!, { customMessage: validation.message });
    }

    const env = await getCloudflareEnv();
    const db = env.DB;

    const existingFeatured = await getFeaturedByUuid(uuid, db);
    if (!existingFeatured) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    if (slug && slug !== existingFeatured.slug) {
      const slugAlreadyExists = await featuredSlugExists(slug, uuid, db);
      if (slugAlreadyExists) {
        return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
          customMessage: 'Slug already exists',
        });
      }
    }

    const updatedFeatured = await updateFeatured(
      uuid,
      { name, slug, metadataTitle, metadataDescription, content, translations },
      db,
    );

    return NextResponse.json({
      success: true,
      data: updatedFeatured,
      message: 'Featured collection updated successfully',
    });
  } catch (error) {
    console.error('Error updating featured:', error);

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

    const existingFeatured = await getFeaturedByUuid(uuid, db);
    if (!existingFeatured) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    await deleteFeatured(uuid, db);

    return NextResponse.json({
      success: true,
      data: null,
      message: 'Featured collection deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting featured:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
