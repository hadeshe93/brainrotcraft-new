/**
 * Report Detail API Routes
 * GET /api/admin/reports/[uuid] - Get report by UUID
 * DELETE /api/admin/reports/[uuid] - Delete report by UUID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import { validateUuid } from '@/lib/validation';
import { getReportByUuid, deleteReport } from '@/services/content/reports';

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
    const report = await getReportByUuid(uuid, db);

    if (!report) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    return NextResponse.json({
      success: true,
      data: report,
      message: 'Report retrieved successfully',
    });
  } catch (error) {
    console.error('Error getting report:', error);

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

    const existingReport = await getReportByUuid(uuid, db);
    if (!existingReport) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    await deleteReport(uuid, db);

    return NextResponse.json({
      success: true,
      data: null,
      message: 'Report deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting report:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
