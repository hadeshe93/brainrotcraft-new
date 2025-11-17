/**
 * Translation Audit API Routes
 * GET /api/admin/translations/audit - Get translation audit data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import { auditTranslations } from '@/services/content/translation-audit';
import type { ContentType, TranslationStatus } from '@/types/services/translation-audit';

/**
 * GET /api/admin/translations/audit
 * Get translation audit data
 *
 * Query parameters:
 * - contentTypes: comma-separated list of content types (category,tag,featured,game)
 * - locales: comma-separated list of locales (en,zh,ja)
 * - status: translation status filter (complete,partial,missing)
 * - page: page number (default: 1)
 * - pageSize: items per page (default: 100)
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin(request);

    // Get database
    const env = await getCloudflareEnv();
    const db = env.DB;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;

    const contentTypesParam = searchParams.get('contentTypes');
    const localesParam = searchParams.get('locales');
    const statusParam = searchParams.get('status');
    const pageParam = searchParams.get('page');
    const pageSizeParam = searchParams.get('pageSize');

    // Build options
    const options: {
      contentTypes?: ContentType[];
      locales?: string[];
      status?: TranslationStatus;
      page?: number;
      pageSize?: number;
    } = {};

    if (contentTypesParam) {
      const types = contentTypesParam.split(',').map((t) => t.trim());
      // Validate content types
      const validTypes: ContentType[] = ['category', 'tag', 'featured', 'game'];
      options.contentTypes = types.filter((t) => validTypes.includes(t as ContentType)) as ContentType[];
    }

    if (localesParam) {
      options.locales = localesParam.split(',').map((l) => l.trim());
    }

    if (statusParam && ['complete', 'partial', 'missing'].includes(statusParam)) {
      options.status = statusParam as TranslationStatus;
    }

    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (!isNaN(page) && page > 0) {
        options.page = page;
      }
    }

    if (pageSizeParam) {
      const pageSize = parseInt(pageSizeParam, 10);
      if (!isNaN(pageSize) && pageSize > 0 && pageSize <= 500) {
        options.pageSize = pageSize;
      }
    }

    // Get audit data
    const auditData = await auditTranslations(options, db);

    return NextResponse.json({
      success: true,
      data: auditData,
      message: 'Translation audit completed successfully',
    });
  } catch (error) {
    console.error('Error auditing translations:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
