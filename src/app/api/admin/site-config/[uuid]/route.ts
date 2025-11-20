import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { getCloudflareEnv } from '@/services/base';
import { updateSiteConfig, getSiteConfigByUuid } from '@/services/content/site-config';
import { APIErrors } from '@/lib/api-response';
import { EValidationErrorCode, ECommonErrorCode } from '@/types/services/errors';
import { validateUuid } from '@/lib/validation';

interface RouteContext {
  params: Promise<{ uuid: string }>;
}

/**
 * PUT /api/admin/site-config/[uuid]
 * 更新站点配置
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin();

    const { uuid } = await params;

    // 验证 UUID
    const uuidValidation = validateUuid(uuid);
    if (!uuidValidation.valid) {
      return await APIErrors.badRequest(uuidValidation.errorCode!);
    }

    const body = (await request.json()) as { config?: unknown };
    const { config } = body;

    // 验证配置内容
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Config must be a valid JSON object',
      });
    }

    const env = await getCloudflareEnv();

    // 检查配置是否存在
    const existing = await getSiteConfigByUuid(uuid, env.DB);
    if (!existing) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND, {
        customMessage: 'Site configuration not found',
      });
    }

    // 更新配置
    const updated = await updateSiteConfig(uuid, config as Record<string, any>, env.DB);

    if (!updated) {
      return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Site configuration updated successfully',
    });
  } catch (error) {
    console.error('Error updating site configuration:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
