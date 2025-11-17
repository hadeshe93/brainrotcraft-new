/**
 * 用户积分查询 Hook
 * 使用 SWR 进行数据缓存和自动重新验证
 */

import { useCallback, useMemo } from 'react';
import useSWR, { KeyedMutator } from 'swr';
import { 
  UserCreditsInfo, 
  EUserType,
  EStrictUserType
} from '@/types/user';
import { ECommonErrorCode, ServiceErrorCode } from '@/types/services/errors';
import { APIErrorResponse } from '@/lib/api-response';
import { CreditsInfoResponse } from '@/types/services/credits';

// ========================================
// Hook 类型定义
// ========================================

/**
 * Hook 返回值
 */
export interface UseUserCreditsReturn {
  /** 积分信息 */
  credits: UserCreditsInfo | null;
  /** 用户类型 */
  userType: EUserType;
  /** 更加精细的用户类型 */
  strictUserType: EStrictUserType;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否有错误 */
  isError: boolean;
  /** 错误信息 */
  error: APIErrorResponse | null;
  /** 是否需要初始化积分池 */
  requiresInitialization: boolean;
  /** 手动刷新数据 */
  mutate: KeyedMutator<CreditsInfoResponse>;
  /** 重新验证数据 */
  revalidate: () => Promise<CreditsInfoResponse | undefined>;
}

// ========================================
// 数据获取函数
// ========================================

/**
 * 获取用户积分信息的 fetcher 函数
 */
const fetcher = async (url: string): Promise<CreditsInfoResponse> => {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include', // 包含认证信息
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data: any = await response.json();

  if (!response.ok) {
    // 如果响应不成功，抛出错误
    const error: APIErrorResponse = {
      success: false,
      message: data.message || 'Failed to fetch credits',
      errorCode: data.errorCode || response.status,
      category: data.category || 'API_ERROR',
    };
    throw error;
  }

  // 检查 API 返回的成功标志
  if (!data.success) {
    throw data as APIErrorResponse;
  }

  return data as CreditsInfoResponse;
};

// ========================================
// Hook 实现
// ========================================

/**
 * 用户积分查询 Hook
 * 
 * @param enabled - 是否启用自动查询，默认为 true
 * @param refreshInterval - 自动刷新间隔（毫秒），默认 30 秒
 * @returns 积分信息和相关状态
 * 
 * @example
 * ```tsx
 * function CreditDisplay() {
 *   const { credits, isLoading, isError } = useUserCredits();
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (isError) return <div>Failed to load credits</div>;
 *   
 *   return (
 *     <div>
 *       Available: {credits?.availableCredits} / {credits?.totalCredits}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserCredits(
  enabled: boolean = true,
  refreshInterval: number = 30 * 1000 // 30 秒
): UseUserCreditsReturn {
  // 使用 SWR 进行数据获取和缓存
  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<CreditsInfoResponse, APIErrorResponse>(
    enabled ? '/api/user/credits' : null, // 如果禁用则不发起请求
    fetcher,
    {
      // SWR 配置选项
      refreshInterval, // 自动刷新间隔
      revalidateOnFocus: true, // 窗口聚焦时重新验证
      revalidateOnReconnect: true, // 重新连接时重新验证
      dedupingInterval: 10 * 1000, // 10 秒内去重
      errorRetryCount: 3, // 错误重试次数
      errorRetryInterval: 2000, // 重试间隔
      shouldRetryOnError: (error) => {
        // 某些错误不应该重试
        const typedError = error as APIErrorResponse;
        if (([ECommonErrorCode.USER_NOT_AUTHENTICATED] as ServiceErrorCode[]).includes(typedError?.errorCode)) {
          return false; // 认证/授权错误不重试
        }
        return true;
      },
      onError: (error) => {
        console.warn('积分信息获取失败:', error);
      },
      onSuccess: (data) => {
        console.debug('积分信息获取成功:', data);
      },
    }
  );

  // 重新验证函数
  const revalidate = useCallback(async () => {
    return await mutate();
  }, [mutate]);

  const strictUserType = useMemo(() => {
    if (Number(data?.data?.availableCredits) > 0) {
      return EStrictUserType.HasCredits;
    }
    if (([EUserType.PAID, EUserType.FREE] as any[]).includes(data?.userType)) {
      return EStrictUserType.SignedIn;
    }
    return EStrictUserType.Anonymous;
  }, [data]);
  return {
    credits: data?.data || null,
    userType: data?.userType || EUserType.ANONYMOUS,
    strictUserType,
    isLoading,
    isError: !!error,
    error: error || null,
    requiresInitialization: data?.requiresInitialization || false,
    mutate,
    revalidate,
  };
}

// ========================================
// 便捷 Hook
// ========================================

/**
 * 简单的积分余额 Hook
 * 只返回可用积分数量，适用于简单的显示场景
 * 
 * @param enabled - 是否启用
 * @returns 可用积分数量，加载中返回 null，错误时返回 0，免费用户返回 null
 */
export function useAvailableCredits(enabled: boolean = true): number | null {
  const { credits, userType, isLoading, isError } = useUserCredits(enabled);
  
  if (isLoading) return null;
  if (isError) return 0;
  if (userType !== EUserType.PAID) return null; // 免费用户无积分概念
  
  return credits?.availableCredits || 0;
}

/**
 * 积分百分比 Hook
 * 返回已使用积分的百分比
 * 
 * @param enabled - 是否启用
 * @returns 使用百分比 (0-100)，加载中或错误时返回 0，免费用户返回 0
 */
export function useCreditsUsagePercentage(enabled: boolean = true): number {
  const { credits, userType, isLoading, isError } = useUserCredits(enabled);
  
  if (isLoading || isError || !credits) return 0;
  if (userType !== EUserType.PAID) return 0; // 免费用户无积分概念
  if (credits.totalCreditsInCurrentCycle === 0) return 0;
  
  return Math.round((credits.usedCreditsInCurrentCycle / credits.totalCreditsInCurrentCycle) * 100);
}

/**
 * 积分不足检查 Hook
 * 检查用户积分是否不足
 * 
 * @param requiredCredits - 需要的积分数
 * @param enabled - 是否启用
 * @returns 是否积分不足，免费用户始终返回 false（不受积分限制）
 */
export function useIsCreditsInsufficient(
  requiredCredits: number,
  enabled: boolean = true
): boolean {
  const { credits, userType } = useUserCredits(enabled);
  
  if (userType !== EUserType.PAID) return false; // 免费用户不受积分限制
  if (!credits) return true; // 无法获取积分信息时认为不足
  
  return credits.availableCredits < requiredCredits;
}