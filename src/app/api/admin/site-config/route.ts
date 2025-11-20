import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { getCloudflareEnv } from '@/services/base';
import { getAllSiteConfigs, getSiteConfigByScopes } from '@/services/content/site-config';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode } from '@/types/services/errors';

/**
 * GET /api/admin/site-config
 * 获取站点配置
 * 支持 scopes 查询参数过滤（如 ?scopes=admin,client）
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const scopesParam = searchParams.get('scopes');

    const env = await getCloudflareEnv();

    // 根据是否有 scopes 参数选择不同的查询函数
    let configs;
    if (scopesParam) {
      const scopesArray = scopesParam
        .split(',')
        .map((s) => s.trim())
        .filter((s) => ['client', 'admin', 'common'].includes(s)) as Array<'client' | 'admin' | 'common'>;

      configs = await getSiteConfigByScopes(scopesArray, env.DB);
    } else {
      configs = await getAllSiteConfigs(env.DB);
    }

    return NextResponse.json({
      success: true,
      data: configs,
      message: 'Site configurations retrieved successfully',
    });
  } catch (error) {
    console.error('Error retrieving site configurations:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
