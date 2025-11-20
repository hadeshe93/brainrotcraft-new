/**
 * Categories Export API
 * GET /api/admin/export/categories - Export all categories in demo JSON format
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import { getAllCategories } from '@/services/content/categories';
import {
  transformCategoryForExport,
  wrapCategoriesExport,
} from '@/lib/export-transformers';

/**
 * GET /api/admin/export/categories
 * Export all categories with metadata
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin(request);

    // Get database
    const env = await getCloudflareEnv();
    const db = env.DB;

    // Get all categories
    const categories = await getAllCategories(db);

    // Transform to export format
    const exportData = categories.map(transformCategoryForExport);

    // Wrap with metadata
    const response = wrapCategoriesExport(exportData);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error exporting categories:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
