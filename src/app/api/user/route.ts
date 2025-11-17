import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { getUserProfileByUuid } from '@/services/user/profile';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode } from '@/types/services/errors';
import { auth } from '@/auth';

export async function GET() {
  try {
    // 检查是否登录
    const session = await auth();
    const isAuthenticated = !!session?.user;
    if (!isAuthenticated) {
      return await APIErrors.forbidden(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    // 获取 Cloudflare 上下文
    const env = await getCloudflareEnv();
    const db = env.DB;

    // 获取用户资料
    const userId = session.user.uuid!;
    const userProfile = await getUserProfileByUuid(userId, db);

    if (!userProfile) {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    // 检查用户状态
    if (userProfile.accountStatus && userProfile.accountStatus !== 'active') {
      return await APIErrors.notFound(ECommonErrorCode.NOT_FOUND);
    }

    return NextResponse.json({
      success: true,
      data: userProfile,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
