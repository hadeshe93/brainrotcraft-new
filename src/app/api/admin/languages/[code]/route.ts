/**
 * Language Detail API Routes
 * GET /api/admin/languages/[code] - Get language by code
 * PUT /api/admin/languages/[code] - Update language by code
 * DELETE /api/admin/languages/[code] - Delete language by code
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode, EValidationErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import { validateLength, composeValidation } from '@/lib/validation';
import { getLanguageByCode, updateLanguage, deleteLanguage } from '@/services/i18n/languages';

interface RouteContext {
  params: Promise<{ code: string }>;
}

/**
 * GET /api/admin/languages/[code]
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const { code } = await params;

    if (!code || code.trim() === '') {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Language code is required',
      });
    }

    const env = await getCloudflareEnv();
    const db = env.DB;

    const language = await getLanguageByCode(code, db);

    if (!language) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    return NextResponse.json({
      success: true,
      data: language,
      message: 'Language retrieved successfully',
    });
  } catch (error) {
    console.error('Error getting language:', error);

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
 * PUT /api/admin/languages/[code]
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const { code } = await params;

    if (!code || code.trim() === '') {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Language code is required',
      });
    }

    const body = (await request.json()) as any;
    const { nativeName, chineseName, englishName, enabled, sortOrder } = body;

    const validations = [];

    if (nativeName !== undefined) {
      validations.push(validateLength(nativeName, 'Native name', 1, 100));
    }

    if (chineseName !== undefined) {
      validations.push(validateLength(chineseName, 'Chinese name', 1, 100));
    }

    if (englishName !== undefined) {
      validations.push(validateLength(englishName, 'English name', 1, 100));
    }

    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Enabled must be a boolean',
      });
    }

    if (sortOrder !== undefined && (typeof sortOrder !== 'number' || sortOrder < 0)) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Sort order must be a non-negative number',
      });
    }

    const validation = composeValidation(...validations);
    if (!validation.valid) {
      return await APIErrors.badRequest(validation.errorCode!, { customMessage: validation.message });
    }

    const env = await getCloudflareEnv();
    const db = env.DB;

    const existingLanguage = await getLanguageByCode(code, db);
    if (!existingLanguage) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    const updatedLanguage = await updateLanguage(
      code,
      { nativeName, chineseName, englishName, enabled, sortOrder },
      db,
    );

    return NextResponse.json({
      success: true,
      data: updatedLanguage,
      message: 'Language updated successfully',
    });
  } catch (error) {
    console.error('Error updating language:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    if (error instanceof Error && error.message === 'Cannot disable default language') {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: error.message,
      });
    }

    if (error instanceof Error && error.message === 'Language not found') {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}

/**
 * DELETE /api/admin/languages/[code]
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();
    const { code } = await params;

    if (!code || code.trim() === '') {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Language code is required',
      });
    }

    const env = await getCloudflareEnv();
    const db = env.DB;

    const existingLanguage = await getLanguageByCode(code, db);
    if (!existingLanguage) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    await deleteLanguage(code, db);

    return NextResponse.json({
      success: true,
      data: null,
      message: 'Language deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting language:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    if (error instanceof Error && error.message === 'Cannot delete default language') {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: error.message,
      });
    }

    if (error instanceof Error && error.message === 'Language not found') {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
