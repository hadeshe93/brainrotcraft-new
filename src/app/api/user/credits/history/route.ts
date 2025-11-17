/**
 * 用户积分历史记录 API
 * GET /api/user/credits/history - 获取积分消费历史
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createErrorResponse } from '@/lib/api-response';
import { ECommonErrorCode } from '@/types/services/errors';
import { getUserCreditHistory } from '@/services/user/credits';
import { CreditsHistoryResponse, APICreditsHistoryResponse } from '@/types/services/credits';
import { APIErrorResponse } from '@/types/services/response';

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

/**
 * 解析分页参数
 */
function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * 解析历史查询参数
 */
function parseHistoryParams(searchParams: URLSearchParams) {
  const startTime = searchParams.get('startTime');
  const endTime = searchParams.get('endTime');
  const expenseType = searchParams.get('expenseType');

  return {
    startTime: startTime ? parseInt(startTime, 10) : undefined,
    endTime: endTime ? parseInt(endTime, 10) : undefined,
    expenseType: expenseType || undefined,
  };
}

// ========================================
// API 处理函数
// ========================================

/**
 * 获取用户积分历史记录
 */
export async function GET(request: NextRequest): Promise<NextResponse<APICreditsHistoryResponse>> {
  try {
    // 1. 验证用户认证
    const authResult = await validateUserAuth();
    if (!authResult.success) {
      return authResult.errorResponse!;
    }
    const userUuid = authResult.userUuid!;
    const { searchParams } = new URL(request.url);

    // 2. 解析查询参数
    const { page, limit, offset } = parsePaginationParams(searchParams);
    const historyParams = parseHistoryParams(searchParams);

    console.log('📋 积分历史查询参数:', {
      userUuid,
      page,
      limit,
      offset,
      ...historyParams,
    });

    // 3. 获取积分历史记录
    const historyResult = await getUserCreditHistory(userUuid, {
      limit,
      offset,
      ...historyParams,
    });
    console.log('✅ 积分历史获取成功:', {
      userUuid,
      recordsCount: historyResult.records.length,
      total: historyResult.total,
    });

    // 4. 构建响应
    const hasMore = offset + limit < historyResult.total;
    const response: CreditsHistoryResponse = {
      success: true,
      data: {
        records: historyResult.records,
        total: historyResult.total,
        pagination: {
          page,
          limit,
          hasMore,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ 获取积分历史失败:', error);

    return await createErrorResponse({
      errorCode: ECommonErrorCode.INTERNAL_SERVER_ERROR,
      customMessage: 'Failed to get credit history',
    });
  }
}
