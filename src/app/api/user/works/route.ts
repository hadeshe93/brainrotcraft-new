import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { getUserWorksPaginated } from '@/services/user/profile';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode, EValidationErrorCode } from '@/types/services/errors';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 检查是否本人
    const session = await auth();
    const isAuthenticated = !!session?.user;
    if (!isAuthenticated) {
      return await APIErrors.forbidden(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }
    const userId = session.user.uuid!;

    // 获取分页参数
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // 限制最大50条

    if (page < 1 || limit < 1) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER);
    }

    // 获取 Cloudflare 上下文
    const env = await getCloudflareEnv();
    const db = env.DB;

    if (!db) {
      return await APIErrors.internalError(ECommonErrorCode.CONFIG_ERROR);
    }

    // 获取用户作品列表
    const worksData = await getUserWorksPaginated(userId, page, limit, db);

    return NextResponse.json({
      success: true,
      data: {
        works: worksData.works,
        pagination: {
          page,
          limit,
          total: worksData.total,
          hasMore: worksData.hasMore,
          totalPages: Math.ceil(worksData.total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching user works:', error);
    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
