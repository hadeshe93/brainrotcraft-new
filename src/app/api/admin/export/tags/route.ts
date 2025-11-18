/**
 * Tags Export API
 * GET /api/admin/export/tags - Export all tags in demo JSON format
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import { getAllTags } from '@/services/content/tags';
import {
  transformTagForExport,
  wrapTagsExport,
} from '@/lib/export-transformers';

/**
 * GET /api/admin/export/tags
 * Export all tags with metadata
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin();

    // Get database
    const env = await getCloudflareEnv();
    const db = env.DB;

    // Get all tags
    const tags = await getAllTags(db);

    // Transform to export format
    const exportData = tags.map(transformTagForExport);

    // Wrap with metadata
    const response = wrapTagsExport(exportData);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error exporting tags:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
