/**
 * Languages API Routes
 * GET /api/admin/languages - List all language configurations
 * POST /api/admin/languages - Create a new language configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode, EValidationErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import { validateRequired, validateLength, composeValidation } from '@/lib/validation';
import { getAllLanguages, createLanguage } from '@/services/i18n/languages';

/**
 * GET /api/admin/languages
 * List all language configurations
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const includeDisabled = searchParams.get('includeDisabled') === 'true';

    // Get database
    const env = await getCloudflareEnv();
    const db = env.DB;

    // List languages
    const languages = await getAllLanguages(includeDisabled, db);

    return NextResponse.json({
      success: true,
      data: languages,
      message: 'Languages retrieved successfully',
    });
  } catch (error) {
    console.error('Error listing languages:', error);

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
 * POST /api/admin/languages
 * Create a new language configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin();

    // Parse request body
    const body = (await request.json()) as any;
    const { code, nativeName, chineseName, englishName, sortOrder } = body;

    // Validate required fields
    const codeValidation = composeValidation(
      validateRequired(code, 'Language code'),
      validateLength(code, 'Language code', 2, 10),
    );

    const nativeNameValidation = composeValidation(
      validateRequired(nativeName, 'Native name'),
      validateLength(nativeName, 'Native name', 1, 100),
    );

    const chineseNameValidation = composeValidation(
      validateRequired(chineseName, 'Chinese name'),
      validateLength(chineseName, 'Chinese name', 1, 100),
    );

    const englishNameValidation = composeValidation(
      validateRequired(englishName, 'English name'),
      validateLength(englishName, 'English name', 1, 100),
    );

    // Validate language code format (lowercase letters, optional dash and uppercase letters)
    const codeFormatRegex = /^[a-z]{2}(-[A-Z]{2})?$/;
    if (code && !codeFormatRegex.test(code)) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Language code must be in format: "en", "zh", "ja", or "zh-CN"',
      });
    }

    // Combine all validations
    const validation = composeValidation(
      codeValidation,
      nativeNameValidation,
      chineseNameValidation,
      englishNameValidation,
    );

    if (!validation.valid) {
      return await APIErrors.badRequest(validation.errorCode!, { customMessage: validation.message });
    }

    // Get database
    const env = await getCloudflareEnv();
    const db = env.DB;

    // Create language (will handle both new creation and restoration of disabled languages)
    const newLanguage = await createLanguage(
      {
        code,
        nativeName,
        chineseName,
        englishName,
        sortOrder: sortOrder || undefined,
      },
      db,
    );

    return NextResponse.json(
      {
        success: true,
        data: newLanguage,
        message: 'Language created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating language:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    if (error instanceof Error && error.message === 'Language code already exists') {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: error.message,
      });
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
