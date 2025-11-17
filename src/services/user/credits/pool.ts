/**
 * 用户积分池业务逻辑实现
 * 使用 BaseDO 来管理用户积分池状态
 */

import { debug } from '@/lib/debug';
import { EUserCreditsErrorCode } from '@/types/services/errors';
import { PendingCreditReservation, UserCreditsPoolState } from '@/types/user';
import { baseDoStorage } from '@/services/do-storage/base';
// ========================================
// 类型定义
// ========================================

/**
 * 积分池操作结果
 */
export interface CreditPoolOperationResult {
  success: boolean;
  errorCode?: EUserCreditsErrorCode;
  message?: string;
  data?: any;
}

// ========================================
// 常量定义
// ========================================

/** 预扣记录过期时间（毫秒）- 30分钟 */
export const RESERVATION_TIMEOUT_MS = 30 * 60 * 1000;

// ========================================
// 工具函数
// ========================================

/**
 * 积分分配结果
 */
interface CreditAllocationResult {
  success: boolean;
  error?: string;
  available?: number;
  required?: number;
  allocation?: {
    fromCycleCredits: number;
    fromPermanentCredits: number;
  };
}

/**
 * 获取用户积分池的 RPC 服务和键名
 */
async function getUserCreditsService(userUuid: string) {
  try {
    const key = `user-credits-${userUuid}`;
    return { service: baseDoStorage, key };
  } catch (error) {
    debug('获取用户积分 RPC 服务失败:', error);
    throw error;
  }
}

/**
 * 计算积分分配方案
 * 优先级：订阅积分 > 永久积分
 * @param required 需要的总积分
 * @param state 当前积分池状态
 * @returns 分配结果
 */
function allocateCredits(required: number, state: UserCreditsPoolState): CreditAllocationResult {
  // 1. 计算订阅积分中预扣的量
  const pendingFromCycle = Object.values(state.pendingReservations).reduce(
    (sum, r) => sum + (r.deductionSource?.fromCycleCredits || 0),
    0,
  );

  // 2. 计算永久积分中预扣的量
  const pendingFromPermanent = Object.values(state.pendingReservations).reduce(
    (sum, r) => sum + (r.deductionSource?.fromPermanentCredits || 0),
    0,
  );

  // 3. 计算订阅积分可用量
  const cycleAvailable = Math.max(
    0,
    state.totalCreditsInCurrentCycle - state.usedCreditsInCurrentCycle - pendingFromCycle,
  );

  // 4. 优先从订阅积分扣除
  const fromCycle = Math.min(required, cycleAvailable);
  const remaining = required - fromCycle;

  // 5. 不足部分从永久积分扣除
  const permanentAvailable = Math.max(
    0,
    state.totalPermanentCredits - state.usedPermanentCredits - pendingFromPermanent,
  );
  const fromPermanent = Math.min(remaining, permanentAvailable);

  // 6. 检查是否足够
  const totalAllocated = fromCycle + fromPermanent;
  if (totalAllocated < required) {
    return {
      success: false,
      error: 'INSUFFICIENT_CREDITS',
      available: totalAllocated,
      required: required,
    };
  }

  // 7. 返回分配方案
  return {
    success: true,
    allocation: {
      fromCycleCredits: fromCycle,
      fromPermanentCredits: fromPermanent,
    },
  };
}

// ========================================
// 积分池核心业务逻辑
// ========================================

/**
 * 初始化用户积分池
 */
export async function initializeUserCreditPool(
  userUuid: string,
  totalCredits: number,
  cycleStartTime: number,
  cycleEndTime: number,
  permanentCredits: number = 0
): Promise<CreditPoolOperationResult> {
  try {
    const { service, key } = await getUserCreditsService(userUuid);
    const existingState = await service.get(key);

    // 如果已经初始化过，返回错误
    if (existingState) {
      return {
        success: false,
        errorCode: EUserCreditsErrorCode.POOL_ALREADY_INITIALIZED,
        message: '',
      };
    }

    const initialState: UserCreditsPoolState = {
      userUuid,
      totalCreditsInCurrentCycle: totalCredits,
      usedCreditsInCurrentCycle: 0,
      currentCycleStartTime: cycleStartTime,
      currentCycleEndTime: cycleEndTime,
      totalPermanentCredits: permanentCredits,
      usedPermanentCredits: 0,
      pendingReservations: {},
      lastUpdatedAt: Date.now(),
    };

    await service.set(key, initialState);

    return {
      success: true,
      data: initialState,
    };
  } catch (error) {
    return {
      success: false,
      errorCode: EUserCreditsErrorCode.POOL_INITIALIZATION_FAILED,
      message: '',
    };
  }
}

/**
 * 获取积分池状态
 */
export async function getCreditPoolState(userUuid: string): Promise<CreditPoolOperationResult> {
  try {
    const { service, key } = await getUserCreditsService(userUuid);
    const state = await service.get(key) as UserCreditsPoolState | null;
    
    if (!state) {
      return {
        success: false,
        errorCode: EUserCreditsErrorCode.CREDIT_POOL_NOT_INITIALIZED,
        message: '',
      };
    }

    // 清理过期的预扣记录
    const cleanedState = await cleanupExpiredReservations(userUuid, state);
    
    return {
      success: true,
      data: cleanedState.success ? cleanedState.data : state,
    };
  } catch (error: any) {
    console.log(`[getCreditPoolState] 异常: ${error.message}`);
    return {
      success: false,
      errorCode: EUserCreditsErrorCode.POOL_GET_STATE_FAILED,
      message: '',
    };
  }
}

/**
 * 预扣积分
 */
export async function reserveCredits(
  userUuid: string,
  predictionId: string,
  creditsAmount: number,
  taskType: PendingCreditReservation['taskType'],
  taskDescription?: string
): Promise<CreditPoolOperationResult> {
  try {
    const { service, key } = await getUserCreditsService(userUuid);
    const state = await service.get(key) as UserCreditsPoolState | null;

    if (!state) {
      return {
        success: false,
        errorCode: EUserCreditsErrorCode.CREDIT_POOL_NOT_INITIALIZED,
        message: '',
      };
    }

    // 检查是否已经存在相同的预扣记录
    if (state.pendingReservations[predictionId]) {
      return {
        success: false,
        errorCode: EUserCreditsErrorCode.RESERVATION_ALREADY_EXISTS,
        message: '',
      };
    }

    // 计算积分分配方案（订阅积分优先）
    const allocation = allocateCredits(creditsAmount, state);
    if (!allocation.success) {
      return {
        success: false,
        errorCode: EUserCreditsErrorCode.INSUFFICIENT_CREDITS,
        message: '',
      };
    }

    // 创建预扣记录（包含分配信息）
    const reservation: PendingCreditReservation = {
      predictionId,
      creditsAmount,
      reservedAt: Date.now(),
      taskType,
      taskDescription,
      deductionSource: allocation.allocation,
    };

    // 更新状态
    const updatedState: UserCreditsPoolState = {
      ...state,
      pendingReservations: {
        ...state.pendingReservations,
        [predictionId]: reservation,
      },
      lastUpdatedAt: Date.now(),
    };

    await service.set(key, updatedState);

    return {
      success: true,
      data: updatedState,
    };
  } catch (error) {
    return {
      success: false,
      errorCode: EUserCreditsErrorCode.POOL_RESERVE_FAILED,
      message: '',
    };
  }
}

/**
 * 确认扣除积分（生成成功后调用）
 */
export async function confirmCreditDeduction(
  userUuid: string,
  predictionId: string,
  actualCreditsUsed?: number
): Promise<CreditPoolOperationResult> {
  try {
    const { service, key } = await getUserCreditsService(userUuid);
    const state = await service.get(key) as UserCreditsPoolState | null;

    if (!state) {
      return {
        success: false,
        errorCode: EUserCreditsErrorCode.CREDIT_POOL_NOT_INITIALIZED,
        message: '',
      };
    }

    const reservation = state.pendingReservations[predictionId];
    if (!reservation) {
      return {
        success: false,
        errorCode: EUserCreditsErrorCode.RESERVATION_NOT_FOUND,
        message: '',
      };
    }

    // 使用实际消耗积分，如果没有提供则使用预扣积分
    const creditsToDeduct = actualCreditsUsed ?? reservation.creditsAmount;

    // 根据预扣时的分配方案更新两个池子
    const fromCycle = reservation.deductionSource?.fromCycleCredits || 0;
    const fromPermanent = reservation.deductionSource?.fromPermanentCredits || 0;

    // 更新状态：移除预扣记录，增加已消耗积分
    const { [predictionId]: removedReservation, ...remainingReservations } = state.pendingReservations;

    const updatedState: UserCreditsPoolState = {
      ...state,
      usedCreditsInCurrentCycle: state.usedCreditsInCurrentCycle + fromCycle,
      usedPermanentCredits: state.usedPermanentCredits + fromPermanent,
      pendingReservations: remainingReservations,
      lastUpdatedAt: Date.now(),
    };

    await service.set(key, updatedState);

    return {
      success: true,
      data: {
        state: updatedState,
        deductedCredits: creditsToDeduct,
        reservation,
      },
    };
  } catch (error) {
    return {
      success: false,
      errorCode: EUserCreditsErrorCode.POOL_CONFIRM_FAILED,
      message: '',
    };
  }
}

/**
 * 取消预扣（生成失败后调用）
 */
export async function cancelCreditReservation(
  userUuid: string,
  predictionId: string
): Promise<CreditPoolOperationResult> {
  try {
    const { service, key } = await getUserCreditsService(userUuid);
    const state = await service.get(key) as UserCreditsPoolState | null;
    
    if (!state) {
      return {
        success: false,
        errorCode: EUserCreditsErrorCode.CREDIT_POOL_NOT_INITIALIZED,
        message: '',
      };
    }

    const reservation = state.pendingReservations[predictionId];
    if (!reservation) {
      return {
        success: false,
        errorCode: EUserCreditsErrorCode.RESERVATION_NOT_FOUND,
        message: '',
      };
    }

    // 移除预扣记录
    const { [predictionId]: removedReservation, ...remainingReservations } = state.pendingReservations;
    
    const updatedState: UserCreditsPoolState = {
      ...state,
      pendingReservations: remainingReservations,
      lastUpdatedAt: Date.now(),
    };

    await service.set(key, updatedState);

    return {
      success: true,
      data: {
        state: updatedState,
        cancelledReservation: reservation,
      },
    };
  } catch (error) {
    return {
      success: false,
      errorCode: EUserCreditsErrorCode.POOL_CANCEL_FAILED,
      message: '',
    };
  }
}

/**
 * 刷新积分池（订阅更新时调用）
 */
export async function refreshCreditPool(
  userUuid: string,
  newTotalCredits: number,
  newCycleStartTime: number,
  newCycleEndTime: number
): Promise<CreditPoolOperationResult> {
  try {
    const { service, key } = await getUserCreditsService(userUuid);
    const state = await service.get(key) as UserCreditsPoolState | null;

    if (!state) {
      return {
        success: false,
        errorCode: EUserCreditsErrorCode.CREDIT_POOL_NOT_INITIALIZED,
        message: '',
      };
    }

    // 刷新订阅周期积分，保持永久积分不变
    const updatedState: UserCreditsPoolState = {
      ...state,
      totalCreditsInCurrentCycle: newTotalCredits,
      usedCreditsInCurrentCycle: 0,
      currentCycleStartTime: newCycleStartTime,
      currentCycleEndTime: newCycleEndTime,
      // 永久积分保持不变
      totalPermanentCredits: state.totalPermanentCredits,
      usedPermanentCredits: state.usedPermanentCredits,
      pendingReservations: {}, // 清空预扣记录（新周期开始）
      lastUpdatedAt: Date.now(),
    };

    await service.set(key, updatedState);

    return {
      success: true,
      data: updatedState,
    };
  } catch (error) {
    return {
      success: false,
      errorCode: EUserCreditsErrorCode.POOL_REFRESH_FAILED,
      message: '',
    };
  }
}

/**
 * 检查是否有足够的积分
 */
export async function checkSufficientCredits(
  userUuid: string,
  requiredCredits: number
): Promise<CreditPoolOperationResult> {
  try {
    const { service, key } = await getUserCreditsService(userUuid);
    const state = await service.get(key) as UserCreditsPoolState | null;

    if (!state) {
      return {
        success: false,
        errorCode: EUserCreditsErrorCode.CREDIT_POOL_NOT_INITIALIZED,
        message: '',
      };
    }

    // 计算订阅积分中预扣的量
    const pendingFromCycle = Object.values(state.pendingReservations).reduce(
      (sum, r) => sum + (r.deductionSource?.fromCycleCredits || 0),
      0,
    );

    // 计算永久积分中预扣的量
    const pendingFromPermanent = Object.values(state.pendingReservations).reduce(
      (sum, r) => sum + (r.deductionSource?.fromPermanentCredits || 0),
      0,
    );

    // 计算订阅积分可用量
    const availableCycleCredits =
      state.totalCreditsInCurrentCycle - state.usedCreditsInCurrentCycle - pendingFromCycle;

    // 计算永久积分可用量
    const availablePermanentCredits = state.totalPermanentCredits - state.usedPermanentCredits - pendingFromPermanent;

    // 总可用积分
    const totalAvailableCredits = availableCycleCredits + availablePermanentCredits;

    const sufficient = totalAvailableCredits >= requiredCredits;

    return {
      success: true,
      data: {
        sufficient,
        availableCredits: totalAvailableCredits,
        requiredCredits,
        totalCredits: state.totalCreditsInCurrentCycle + state.totalPermanentCredits,
        usedCredits: state.usedCreditsInCurrentCycle + state.usedPermanentCredits,
        pendingCredits: pendingFromCycle + pendingFromPermanent,
      },
    };
  } catch (error) {
    return {
      success: false,
      errorCode: EUserCreditsErrorCode.POOL_CHECK_FAILED,
      message: '',
    };
  }
}

/**
 * 清理过期的预扣记录
 */
export async function cleanupExpiredReservations(
  userUuid: string,
  currentState?: UserCreditsPoolState
): Promise<CreditPoolOperationResult> {
  try {
    let state = currentState;
    let service: any, key: string;
    
    if (!state) {
      const serviceData = await getUserCreditsService(userUuid);
      service = serviceData.service;
      key = serviceData.key;
      const retrievedState = await service.get(key) as UserCreditsPoolState | null;
      state = retrievedState || undefined;
    } else {
      // 如果提供了 currentState，仍需要获取 service 和 key 用于后续更新
      const serviceData = await getUserCreditsService(userUuid);
      service = serviceData.service;
      key = serviceData.key;
    }
    
    if (!state) {
      return {
        success: false,
        errorCode: EUserCreditsErrorCode.CREDIT_POOL_NOT_INITIALIZED,
        message: '',
      };
    }

    const currentTime = Date.now();
    const validReservations: Record<string, PendingCreditReservation> = {};
    let expiredCount = 0;

    // 过滤出未过期的预扣记录
    for (const [predictionId, reservation] of Object.entries(state.pendingReservations)) {
      if (currentTime - reservation.reservedAt < RESERVATION_TIMEOUT_MS) {
        validReservations[predictionId] = reservation;
      } else {
        expiredCount++;
      }
    }

    // 如果有过期记录，更新状态
    if (expiredCount > 0) {
      const updatedState: UserCreditsPoolState = {
        ...state,
        pendingReservations: validReservations,
        lastUpdatedAt: Date.now(),
      };

      await service.set(key, updatedState);

      return {
        success: true,
        data: updatedState,
      };
    }

    return {
      success: true,
      data: state,
    };
  } catch (error) {
    return {
      success: false,
      errorCode: EUserCreditsErrorCode.POOL_CLEANUP_FAILED,
      message: '',
    };
  }
}

/**
 * 增加永久积分
 * （用于一次性购买后增加永久积分）
 */
export async function addPermanentCredits(
  userUuid: string,
  creditsToAdd: number
): Promise<CreditPoolOperationResult> {
  try {
    const { service, key } = await getUserCreditsService(userUuid);
    const state = await service.get(key) as UserCreditsPoolState | null;

    if (!state) {
      return {
        success: false,
        errorCode: EUserCreditsErrorCode.CREDIT_POOL_NOT_INITIALIZED,
        message: '',
      };
    }

    // 更新永久积分总量
    const updatedState: UserCreditsPoolState = {
      ...state,
      totalPermanentCredits: state.totalPermanentCredits + creditsToAdd,
      lastUpdatedAt: Date.now(),
    };

    await service.set(key, updatedState);

    return {
      success: true,
      data: updatedState,
    };
  } catch (error) {
    return {
      success: false,
      errorCode: EUserCreditsErrorCode.POOL_UPDATE_FAILED,
      message: '',
    };
  }
}

/**
 * 修正数据
 */
export interface CreditFixDetails {
  /** 修正前的状态快照 */
  beforeState: UserCreditsPoolState;
  /** 修正后的状态 */
  afterState: UserCreditsPoolState;
  /** 修正的具体操作 */
  fixedIssues: string[];
  /** 是否有修正 */
  hasChanges: boolean;
}

/**
 * 校正用户积分池数据
 * 检查并修正积分池中的逻辑问题
 */
export async function fixCreditPool(userUuid: string): Promise<CreditPoolOperationResult> {
  try {
    const { service, key } = await getUserCreditsService(userUuid);
    const state = await service.get(key) as UserCreditsPoolState | null;

    if (!state) {
      return {
        success: false,
        errorCode: EUserCreditsErrorCode.CREDIT_POOL_NOT_INITIALIZED,
        message: 'Credit pool not initialized',
      };
    }

    // 记录修正前的状态
    const beforeState = { ...state };
    const updatedState = { ...state };
    const fixedIssues: string[] = [];

    // 1. 清理过期的预扣记录
    const currentTime = Date.now();
    const validReservations: Record<string, PendingCreditReservation> = {};
    let expiredCount = 0;

    for (const [predictionId, reservation] of Object.entries(state.pendingReservations)) {
      if (currentTime - reservation.reservedAt < RESERVATION_TIMEOUT_MS) {
        validReservations[predictionId] = reservation;
      } else {
        expiredCount++;
        debug(`清理过期预扣记录: predictionId=${predictionId}, age=${Math.floor((currentTime - reservation.reservedAt) / 1000)}s`);
      }
    }

    if (expiredCount > 0) {
      updatedState.pendingReservations = validReservations;
      fixedIssues.push(`清理了 ${expiredCount} 条超时的预扣记录`);
    }

    // 2. 修正空值（null/undefined）情况
    if (updatedState.totalCreditsInCurrentCycle == null ||
        typeof updatedState.totalCreditsInCurrentCycle !== 'number' ||
        isNaN(updatedState.totalCreditsInCurrentCycle)) {
      fixedIssues.push(
        `修正订阅积分总量为空或非数字: ${updatedState.totalCreditsInCurrentCycle} -> 0`
      );
      updatedState.totalCreditsInCurrentCycle = 0;
    }

    if (updatedState.usedCreditsInCurrentCycle == null ||
        typeof updatedState.usedCreditsInCurrentCycle !== 'number' ||
        isNaN(updatedState.usedCreditsInCurrentCycle)) {
      fixedIssues.push(
        `修正订阅积分已使用量为空或非数字: ${updatedState.usedCreditsInCurrentCycle} -> 0`
      );
      updatedState.usedCreditsInCurrentCycle = 0;
    }

    if (updatedState.totalPermanentCredits == null ||
        typeof updatedState.totalPermanentCredits !== 'number' ||
        isNaN(updatedState.totalPermanentCredits)) {
      fixedIssues.push(
        `修正永久积分总量为空或非数字: ${updatedState.totalPermanentCredits} -> 0`
      );
      updatedState.totalPermanentCredits = 0;
    }

    if (updatedState.usedPermanentCredits == null ||
        typeof updatedState.usedPermanentCredits !== 'number' ||
        isNaN(updatedState.usedPermanentCredits)) {
      fixedIssues.push(
        `修正永久积分已使用量为空或非数字: ${updatedState.usedPermanentCredits} -> 0`
      );
      updatedState.usedPermanentCredits = 0;
    }

    // 3. 验证并修正订阅积分的逻辑性
    if (updatedState.usedCreditsInCurrentCycle < 0) {
      fixedIssues.push(
        `修正订阅积分已使用量: ${updatedState.usedCreditsInCurrentCycle} -> 0`
      );
      updatedState.usedCreditsInCurrentCycle = 0;
    }

    if (updatedState.usedCreditsInCurrentCycle > updatedState.totalCreditsInCurrentCycle) {
      fixedIssues.push(
        `修正订阅积分已使用量超出总量: ${updatedState.usedCreditsInCurrentCycle} -> ${updatedState.totalCreditsInCurrentCycle}`
      );
      updatedState.usedCreditsInCurrentCycle = updatedState.totalCreditsInCurrentCycle;
    }

    if (updatedState.totalCreditsInCurrentCycle < 0) {
      fixedIssues.push(
        `修正订阅积分总量为负数: ${updatedState.totalCreditsInCurrentCycle} -> 0`
      );
      updatedState.totalCreditsInCurrentCycle = 0;
      updatedState.usedCreditsInCurrentCycle = 0;
    }

    // 4. 验证并修正永久积分的逻辑性
    if (updatedState.usedPermanentCredits < 0) {
      fixedIssues.push(
        `修正永久积分已使用量: ${updatedState.usedPermanentCredits} -> 0`
      );
      updatedState.usedPermanentCredits = 0;
    }

    if (updatedState.usedPermanentCredits > updatedState.totalPermanentCredits) {
      fixedIssues.push(
        `修正永久积分已使用量超出总量: ${updatedState.usedPermanentCredits} -> ${updatedState.totalPermanentCredits}`
      );
      updatedState.usedPermanentCredits = updatedState.totalPermanentCredits;
    }

    if (updatedState.totalPermanentCredits < 0) {
      fixedIssues.push(
        `修正永久积分总量为负数: ${updatedState.totalPermanentCredits} -> 0`
      );
      updatedState.totalPermanentCredits = 0;
      updatedState.usedPermanentCredits = 0;
    }

    // 5. 验证预扣记录的分配数量
    for (const [predictionId, reservation] of Object.entries(updatedState.pendingReservations)) {
      const source = reservation.deductionSource;
      if (!source) {
        // 如果没有分配来源信息，尝试重新计算
        const allocation = allocateCredits(reservation.creditsAmount, updatedState);
        if (allocation.success && allocation.allocation) {
          reservation.deductionSource = allocation.allocation;
          fixedIssues.push(
            `补充预扣记录 ${predictionId} 的分配来源信息`
          );
        }
      } else {
        // 验证分配来源的合理性
        const totalAllocated = source.fromCycleCredits + source.fromPermanentCredits;
        if (Math.abs(totalAllocated - reservation.creditsAmount) > 0.01) {
          fixedIssues.push(
            `预扣记录 ${predictionId} 分配总量不匹配: ${totalAllocated} vs ${reservation.creditsAmount}`
          );
        }
      }
    }

    // 6. 验证周期时间的合理性
    if (updatedState.currentCycleStartTime > updatedState.currentCycleEndTime) {
      fixedIssues.push(
        `订阅周期时间异常: 开始时间 ${updatedState.currentCycleStartTime} 晚于结束时间 ${updatedState.currentCycleEndTime}`
      );
      // 不自动修正时间，只记录问题
    }

    // 7. 如果有任何修正，更新状态
    const hasChanges = fixedIssues.length > 0;

    if (hasChanges) {
      updatedState.lastUpdatedAt = Date.now();
      await service.set(key, updatedState);

      debug(`积分池校正完成: 用户=${userUuid}, 修正项数=${fixedIssues.length}`);
      fixedIssues.forEach((issue) => debug(`  - ${issue}`));

      const fixDetails: CreditFixDetails = {
        beforeState,
        afterState: updatedState,
        fixedIssues,
        hasChanges: true,
      };

      return {
        success: true,
        data: fixDetails,
        message: `成功修正 ${fixedIssues.length} 个问题`,
      };
    }

    // 没有问题需要修正
    const fixDetails: CreditFixDetails = {
      beforeState,
      afterState: updatedState,
      fixedIssues: [],
      hasChanges: false,
    };

    return {
      success: true,
      data: fixDetails,
      message: '积分池状态正常，无需修正',
    };
  } catch (error) {
    debug('校正积分池失败:', error);
    return {
      success: false,
      errorCode: EUserCreditsErrorCode.POOL_UPDATE_FAILED,
      message: error instanceof Error ? error.message : '未知错误',
    };
  }
} 