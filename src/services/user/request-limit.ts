/**
 * 用户预测请求限频设计
 * 
 * 系统机制设计：
 * 1. 所有用户都需要进行限制（暂未接入付费订阅系统）
 * 2. 使用 ThrottlerDO 进行限频
 * 3. 如果判断为当前无法执行，则返回相关错误码，让 API Route 去下发对应的回包信息
 * 
 * 使用示例：
 * ```typescript
 * // 在 API Route 中使用
 * import { checkUserRequestLimit, shouldApplyThrottle } from '@/services/user/request-limit';
 * 
 * // 检查是否需要限频（当前所有用户都需要限频）
 * const needThrottle = shouldApplyThrottle(session);
 * 
 * if (needThrottle) {
 *   // 检查限频
 *   const throttleResult = await checkUserRequestLimit({
 *     userIdentifier: generateUserIdentifier(session?.user?.uuid, anonymousUserId, clientIP),
 *     clientIP,
 *     userAgent: request.headers.get('user-agent'),
 *   });
 * 
 *   if (!throttleResult.success) {
 *     return createErrorResponse(throttleResult.errorCode);
 *   }
 * }
 * ```
 */
// 引入依赖
import { debug } from '@/lib/debug';
import { EThrottleErrorCode } from '@/types/services/errors';
import { getTranslations } from 'next-intl/server';
import { Session } from 'next-auth';
import { checkUsePaidRecords } from './subscription';
import { DEFAULT_THROTTLE_CONFIG, FORCE_THROTTLE_CHECK } from '@/constants/config';
import { throttleDoStorage, type TryApplyOptions } from '../do-storage/throttle';
import { EAppEnv } from '@/types/base/env';

// ========================================
// 类型定义
// ========================================

/**
 * 限频状态信息
 */
export interface ThrottleState {
  /** 第几次被限制 */
  limitTimes: number;
  /** 限制结束时间戳（毫秒） */
  limitEndTimeMs: number;
  /** 当前周期已执行次数 */
  executedTimesCurrentCycle: number;
  /** 当前是第几个周期 */
  currentCycle: number;
}

/**
 * 限频检查结果
 */
export interface ThrottleCheckResult {
  /** 是否允许执行 */
  granted: boolean;
  /** 当前限频状态 */
  state: ThrottleState;
  /** 如果被限制，剩余等待时间（毫秒） */
  remainingWaitTimeMs?: number;
}

/**
 * 限频操作结果
 */
export interface ThrottleOperationResult {
  /** 操作是否成功 */
  success: boolean;
  /** 错误码 */
  errorCode?: ThrottleErrorCode;
  /** 错误信息 */
  message?: string;
  /** 限频检查结果 */
  data?: ThrottleCheckResult;
}

/**
 * 限频配置参数
 */
export interface ThrottleConfig {
  /** 每个周期允许的最大执行次数 */
  limitCycleExcutionTimes?: number;
  /** 限制周期时长（毫秒） */
  limitCycleTimeMs?: number;
}

/**
 * 请求限频检查参数
 */
export interface CheckRequestLimitParams {
  /** 用户标识符（匿名用户ID或IP地址） */
  userIdentifier: string;
  // 业务标识
  bizIdentifier?: string;
  // 限频配置
  throttleOptions?: TryApplyOptions;
}

export interface ClearRequestLimitParams {
  userIdentifier: string;
  bizIdentifier?: string;
}

// 类型别名
export type ThrottleErrorCode = EThrottleErrorCode;

// ========================================
// 常量定义
// ========================================

// ========================================
// 工具函数
// ========================================


/**
 * 验证用户标识符格式
 */
function validateUserIdentifier(userIdentifier: string): boolean {
  return typeof userIdentifier === 'string' && userIdentifier.length > 0 && userIdentifier.length <= 100;
}


/**
 * 创建错误结果
 */
async function createErrorResult(errorCode: ThrottleErrorCode, message?: string): Promise<ThrottleOperationResult> {
  let errorMessage = message;
  if (!errorMessage) {
    try {
      const tError = await getTranslations('error');
      errorMessage = tError(errorCode.toString());
    } catch (error) {
      debug('获取错误翻译失败:', error);
      errorMessage = `Error ${errorCode}`;
    }
  }
  
  return {
    success: false,
    errorCode,
    message: errorMessage,
  };
}

/**
 * 创建成功结果
 */
function createSuccessResult(data: ThrottleCheckResult): ThrottleOperationResult {
  return {
    success: true,
    data,
  };
}

/**
 * 计算剩余等待时间
 */
function calculateRemainingWaitTime(limitEndTimeMs: number): number {
  const currentTime = Date.now();
  return Math.max(0, limitEndTimeMs - currentTime);
}

// ========================================
// 核心服务函数
// ========================================

/**
 * 检查用户请求是否被限频
 * 
 * @param params 检查参数
 * @returns 限频检查结果
 */
export async function checkUserRequestLimit(
  params: CheckRequestLimitParams
): Promise<ThrottleOperationResult> {
  try {
    const { userIdentifier: userIdentifierRaw, bizIdentifier = '', throttleOptions = DEFAULT_THROTTLE_CONFIG } = params;
    const userIdentifier = `${userIdentifierRaw}-${bizIdentifier}`;

    // 参数验证
    if (!validateUserIdentifier(userIdentifier)) {
      return await createErrorResult(EThrottleErrorCode.INVALID_USER_IDENTIFIER);
    }

    debug('开始检查匿名用户限频:', { userIdentifier });

    const result = await throttleDoStorage.tryApply(userIdentifier, throttleOptions || DEFAULT_THROTTLE_CONFIG);
    debug('RPC 服务返回结果:', result);

    // 构造返回结果
    const throttleState: ThrottleState = {
      limitTimes: result.value.limitTimes,
      limitEndTimeMs: result.value.limitEndTimeMs,
      executedTimesCurrentCycle: result.value.executedTimesCurrentCycle,
      currentCycle: result.value.currentCycle,
    };

    const checkResult: ThrottleCheckResult = {
      granted: result.granted,
      state: throttleState,
    };

    // 如果被限制，计算剩余等待时间
    if (!result.granted && result.value.limitEndTimeMs > 0) {
      checkResult.remainingWaitTimeMs = calculateRemainingWaitTime(result.value.limitEndTimeMs);
    }

    if (result.granted) {
      debug('限频检查通过:', { userIdentifier, executedTimes: result.value.executedTimesCurrentCycle });
      return createSuccessResult(checkResult);
    } else {
      debug('限频检查被拒绝:', { 
        userIdentifier, 
        limitTimes: result.value.limitTimes,
        remainingWaitTime: checkResult.remainingWaitTimeMs 
      });
      
      // 获取翻译的错误信息
      let errorMessage = '';
      try {
        const tError = await getTranslations('error');
        errorMessage = tError(EThrottleErrorCode.TOO_MANY_REQUESTS.toString(), { number: String(Math.ceil((checkResult.remainingWaitTimeMs || 30 * 1000) / 1000)) });
      } catch (error) {
        debug('获取错误翻译失败:', error);
        errorMessage = `Error ${EThrottleErrorCode.TOO_MANY_REQUESTS}`;
      }
      
      return {
        success: false,
        errorCode: EThrottleErrorCode.TOO_MANY_REQUESTS,
        message: errorMessage,
        data: checkResult,
      };
    }
  } catch (error) {
    debug('检查匿名用户限频失败:', error);
    return await createErrorResult(EThrottleErrorCode.THROTTLE_SERVICE_UNAVAILABLE);
  }
}

export async function clearUserRequestLimit(params: ClearRequestLimitParams) {
  const { userIdentifier: userIdentifierRaw, bizIdentifier = '' } = params;
  const userIdentifier = `${userIdentifierRaw}-${bizIdentifier}`;
  return await throttleDoStorage.clearState(userIdentifier);
}

/**
 * 获取用户当前的限频状态
 * 
 * @param userIdentifier 用户标识符
 * @returns 当前限频状态
 */
export async function getUserThrottleState(
  userIdentifier: string
): Promise<ThrottleOperationResult> {
  try {
    // 参数验证
    if (!validateUserIdentifier(userIdentifier)) {
      return await createErrorResult(EThrottleErrorCode.INVALID_USER_IDENTIFIER);
    }

    debug('获取用户限频状态:', { userIdentifier });

    // 获取 RPC 服务并调用 getState
    const result = await throttleDoStorage.getState(userIdentifier);
    
    // 构造返回结果
    const throttleState: ThrottleState = {
      limitTimes: result.value.limitTimes,
      limitEndTimeMs: result.value.limitEndTimeMs,
      executedTimesCurrentCycle: result.value.executedTimesCurrentCycle,
      currentCycle: result.value.currentCycle,
    };

    const checkResult: ThrottleCheckResult = {
      granted: result.granted,
      state: throttleState,
    };

    // 如果被限制，计算剩余等待时间
    if (!result.granted && result.value.limitEndTimeMs > 0) {
      checkResult.remainingWaitTimeMs = calculateRemainingWaitTime(result.value.limitEndTimeMs);
    }

    debug('获取限频状态成功:', { userIdentifier, granted: result.granted, state: throttleState });
    return createSuccessResult(checkResult);
  } catch (error) {
    debug('获取用户限频状态失败:', error);
    return await createErrorResult(EThrottleErrorCode.THROTTLE_SERVICE_UNAVAILABLE);
  }
}

/**
 * 判断用户是否需要限频
 * - 仅付费用户不需要限频
 * 
 * @param session 用户会话
 * @returns 是否需要限频
 */
export async function shouldApplyThrottle(session: Session | null): Promise<boolean> {
  // 这里不用 session?.user?.userType 来判断，因为可能有缓存或者伪造，服务端我们直接使用可信数据源
  const { hasEffectiveSubscription, hasOneTimePayment } = await checkUsePaidRecords(session?.user?.uuid);
  const hasPaid = hasEffectiveSubscription || hasOneTimePayment;
  return (!hasPaid && process.env.NEXT_PUBLIC_RUNTIME_ENV === EAppEnv.production) || FORCE_THROTTLE_CHECK;
}

/**
 * 生成用户标识符（用于限频）
 * 
 * @param userUuid 已认证用户的UUID
 * @param anonymousUserId 匿名用户ID
 * @param clientIP 客户端IP
 * @returns 用户标识符
 */
export function generateUserIdentifier(userUuid?: string, anonymousUserId?: string, clientIP?: string): string {
  // 优先使用已认证用户UUID，其次使用匿名用户ID，最后使用IP地址
  if (userUuid && userUuid.length > 0) {
    return `user-${userUuid}`;
  }
  
  if (anonymousUserId && anonymousUserId.length > 0) {
    return `anon-${anonymousUserId}`;
  }
  
  if (clientIP && clientIP.length > 0) {
    return `ip-${clientIP}`;
  }
  
  // 如果都没有，使用默认标识符（这种情况下限频会对所有此类用户生效）
  return 'unknown-user';
}

/**
 * 获取限频统计信息（用于监控和调试）
 * 
 * @param result 限频检查结果
 * @returns 统计信息
 */
export function getThrottleStatistics(result: ThrottleOperationResult): {
  isThrottled: boolean;
  executedTimes: number;
  limitTimes: number;
  remainingWaitMinutes: number;
} | null {
  if (!result.data) {
    return null;
  }

  const { granted, state, remainingWaitTimeMs } = result.data;
  
  return {
    isThrottled: !granted,
    executedTimes: state.executedTimesCurrentCycle,
    limitTimes: state.limitTimes,
    remainingWaitMinutes: remainingWaitTimeMs ? Math.ceil(remainingWaitTimeMs / (60 * 1000)) : 0,
  };
}

