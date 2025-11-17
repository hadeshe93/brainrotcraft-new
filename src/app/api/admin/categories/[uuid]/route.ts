/**
 * Category Detail API Routes
 * GET /api/admin/categories/[uuid] - Get category by UUID
 * PUT /api/admin/categories/[uuid] - Update category by UUID
 * DELETE /api/admin/categories/[uuid] - Delete category by UUID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode, EValidationErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import { validateUuid, validateLength, validateSlug, composeValidation } from '@/lib/validation';
import {
  getCategoryByUuid,
  getCategoryWithAllTranslations,
  updateCategory,
  deleteCategory,
  categorySlugExists,
} from '@/services/content/categories';

interface RouteContext {
  params: Promise<{ uuid: string }>;
}

/**
 * GET /api/admin/categories/[uuid]
 */
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

    // Get category with all translations for admin panel
    const category = await getCategoryWithAllTranslations(uuid, db);

    if (!category) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Category retrieved successfully',
    });
  } catch (error) {
    console.error('Error getting category:', error);

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
 * PUT /api/admin/categories/[uuid]
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const { uuid } = await params;

    const uuidValidation = validateUuid(uuid);
    if (!uuidValidation.valid) {
      return await APIErrors.badRequest(uuidValidation.errorCode!, { customMessage: uuidValidation.message });
    }

    const body = (await request.json()) as any;
    const { name, slug, iconUrl, metadataTitle, metadataDescription, content, translations } = body;

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

    const existingCategory = await getCategoryByUuid(uuid, db);
    if (!existingCategory) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    if (slug && slug !== existingCategory.slug) {
      const slugAlreadyExists = await categorySlugExists(slug, uuid, db);
      if (slugAlreadyExists) {
        return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
          customMessage: 'Slug already exists',
        });
      }
    }

    const updatedCategory = await updateCategory(
      uuid,
      { name, slug, iconUrl, metadataTitle, metadataDescription, content, translations },
      db,
    );

    return NextResponse.json({
      success: true,
      data: updatedCategory,
      message: 'Category updated successfully',
    });
  } catch (error) {
    console.error('Error updating category:', error);

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
 * DELETE /api/admin/categories/[uuid]
 */
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

    const existingCategory = await getCategoryByUuid(uuid, db);
    if (!existingCategory) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    await deleteCategory(uuid, db);

    return NextResponse.json({
      success: true,
      data: null,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting category:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
