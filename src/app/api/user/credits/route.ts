/**
 * 用户积分查询 API
 * GET /api/user/credits - 获取当前用户积分信息
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createErrorResponse } from '@/lib/api-response';
import { ECommonErrorCode } from '@/types/services/errors';
import { APICreditsInfoResponse } from '@/types/services/credits';
import { APIErrorResponse } from '@/types/services/response';
import { getUserCreditsInfoSafely } from '@/services/user/credits';

// ========================================
// 工具函数
// ========================================

/**
 * 验证用户认证状态
 */
async function validateUserAuth(): Promise<{
  success: boolean;
  userUuid?: string;
  errorResponse?: NextResponse<APIErrorResponse>;
}> {
  const session = await auth();

  if (!session?.user?.uuid) {
    return {
      success: false,
      errorResponse: await createErrorResponse({
        errorCode: ECommonErrorCode.USER_NOT_AUTHENTICATED,
      }),
    };
  }

  return {
    success: true,
    userUuid: session.user.uuid,
  };
}

// ========================================
// API 处理函数
// ========================================

/**
 * 获取用户积分信息
 */
export async function GET(request: NextRequest): Promise<NextResponse<APICreditsInfoResponse>> {
  try {
    // 1. 验证用户认证
    const authResult = await validateUserAuth();
    if (!authResult.success) {
      return authResult.errorResponse!;
    }

    const userUuid = authResult.userUuid!;

    // 2. 获取积分信息
    const result = await getUserCreditsInfoSafely(userUuid);
    if (result.success) {
      return NextResponse.json(result);
    }
    return createErrorResponse({
      errorCode: result.errorCode,
      customMessage: result.message,
    });
  } catch (error) {
    console.error('❌ 用户积分查询API错误:', error);
    return await createErrorResponse({
      errorCode: ECommonErrorCode.INTERNAL_SERVER_ERROR,
    });
  }
}
