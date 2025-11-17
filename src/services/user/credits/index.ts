/**
 * 登录且付费用户积分系统设计
 *
 * 系统机制设计：
 * 1. 积分池：使用 BaseDO 存储用户积分情况，包括订阅周期内总积分、当前周期已消耗积分、预扣信息缓存列表
 * 2. 预扣：触发生成预测时在 BaseDO 中预扣积分，并缓存本次的预测元信息，起码包括：预测 ID 和预扣积分
 * 3. 确定划扣：生成预测成功后，将预扣信息从缓存列表中删除，并将积分划扣信息写进「用户积分消耗流水表」
 * 4. 取消预扣：生成预测失败后，将预扣信息从缓存列表中删除，并补回当前周期内的预扣积分
 * 5. 积分池更新：订阅到期之后，需要更新订阅周期内总积分，以及已消耗积分
 */

// 引入依赖
import { ECommonErrorCode, EUserCreditsErrorCode as UserCreditsErrorCode } from '@/types/services/errors';
import { UserCreditsPoolState, UserCreditsInfo, CreditTaskType, EUserType } from '@/types/user';
import { uuid } from '@/lib/uuid';
import { debug } from '@/lib/debug';
import { getCloudflareEnv } from '@/services/base';
import { createDrizzleClient } from '@/db/client';
import { userCreditExpense } from '@/db/schema';
import { eq, and, gte, lte, count, desc, sql } from 'drizzle-orm';
import * as CreditPool from './pool';
import { APICreditsInfoResponse, CreditsInfoResponse } from '@/types/services/credits';
import { checkUsePaidRecords } from '@/services/user/subscription';
import { userCreditIncome, orders } from '@/db/schema';
import { ErrorCodeUtils } from '@/types/services/errors';

// ========================================
// 类型定义
// ========================================

/**
 * 积分操作结果（泛型版本）
 */
export interface CreditOperationResult<T = UserCreditsPoolState> {
  /** 操作是否成功 */
  success: boolean;
  /** 错误码 */
  errorCode?: UserCreditsErrorCode;
  /** 错误信息 */
  message?: string;
  /** 返回的数据 */
  data?: T;
}

/**
 * 积分预扣参数
 */
export interface ReserveCreditParams {
  /** 用户 UUID */
  userUuid: string;
  /** 预测任务 ID */
  predictionId: string;
  /** 预扣积分数量 */
  creditsAmount: number;
  /** 任务类型 */
  taskType: CreditTaskType;
  /** 任务描述 */
  taskDescription?: string;
}

/**
 * 积分确认扣除参数
 */
export interface ConfirmCreditDeductionParams {
  /** 用户 UUID */
  userUuid: string;
  /** 预测任务 ID */
  predictionId: string;
  /** 实际消耗积分（可能与预扣不同） */
  actualCreditsUsed?: number;
  /** 工作结果信息 */
  workInfo: {
    workUuid: string;
    workType: CreditTaskType;
    inputContent: string;
    workResult: string;
    generationDuration?: number;
  };
}

/**
 * 积分取消预扣参数
 */
export interface CancelCreditReservationParams {
  /** 用户 UUID */
  userUuid: string;
  /** 预测任务 ID */
  predictionId: string;
  /** 取消原因 */
  reason?: string;
}

/**
 * 积分池刷新参数
 */
export interface RefreshCreditPoolParams {
  /** 用户 UUID */
  userUuid: string;
  /** 新的订阅周期开始时间 */
  newCycleStartTime: number;
  /** 新的订阅周期结束时间 */
  newCycleEndTime: number;
  /** 新周期的总积分 */
  newTotalCredits: number;
}

// ========================================
// 常量定义
// ========================================

// ========================================
// 工具函数
// ========================================

// 移除了 getUserCreditsDO 函数，现在直接使用 CreditPool 模块

/**
 * 获取数据库客户端
 */
async function getDbClient() {
  try {
    const env = await getCloudflareEnv();
    if (!env.DB) {
      throw new Error('Database binding not found');
    }
    return createDrizzleClient(env.DB);
  } catch (error) {
    debug('获取数据库客户端失败:', error);
    throw error;
  }
}

/**
 * 验证用户 UUID 格式
 */
function validateUserUuid(userUuid: string): boolean {
  return typeof userUuid === 'string' && userUuid.length > 0;
}

/**
 * 验证积分数量
 */
function validateCreditsAmount(credits: number): boolean {
  return typeof credits === 'number' && credits > 0 && Number.isInteger(credits);
}

/**
 * 验证预测 ID 格式
 */
function validatePredictionId(predictionId: string): boolean {
  return typeof predictionId === 'string' && predictionId.length > 0;
}

/**
 * 创建错误结果
 */
function createErrorResult<T = UserCreditsPoolState>(
  errorCode: UserCreditsErrorCode,
  message: string,
): CreditOperationResult<T> {
  return {
    success: false,
    errorCode,
    message,
  };
}

/**
 * 创建成功结果
 */
function createSuccessResult<T = UserCreditsPoolState>(data?: T): CreditOperationResult<T> {
  return {
    success: true,
    data,
    message: '',
  };
}

// ========================================
// 核心服务函数
// ========================================

/**
 * 获取用户积分信息
 */
export async function getUserCreditsInfo(userUuid: string): Promise<CreditOperationResult<UserCreditsInfo>> {
  try {
    // 参数验证
    if (!validateUserUuid(userUuid)) {
      debug('获取用户积分信息失败: 用户 UUID 格式无效');
      return createErrorResult<UserCreditsInfo>(UserCreditsErrorCode.INVALID_USER_UUID, 'Invalid user UUID');
    }

    // 获取积分池状态
    const result = await CreditPool.getCreditPoolState(userUuid);

    if (!result.success) {
      debug('获取积分池状态失败:', result.message, result.errorCode);
      const errorCode = result.errorCode || UserCreditsErrorCode.DURABLE_OBJECT_ERROR;
      const message = result.message || 'Failed to get pool state';
      return createErrorResult<UserCreditsInfo>(errorCode, message);
    }

    const state = result.data as UserCreditsPoolState;

    // 计算订阅积分相关
    const pendingFromCycle = Object.values(state.pendingReservations).reduce(
      (sum, r) => sum + (r.deductionSource?.fromCycleCredits || 0),
      0,
    );
    const availableCycleCredits =
      state.totalCreditsInCurrentCycle - state.usedCreditsInCurrentCycle - pendingFromCycle;

    // 计算永久积分相关
    const pendingFromPermanent = Object.values(state.pendingReservations).reduce(
      (sum, r) => sum + (r.deductionSource?.fromPermanentCredits || 0),
      0,
    );
    const availablePermanentCredits = state.totalPermanentCredits - state.usedPermanentCredits - pendingFromPermanent;

    // 构建返回信息
    const creditsInfo: UserCreditsInfo = {
      availableCredits: availableCycleCredits + availablePermanentCredits,
      totalCreditsInCurrentCycle: state.totalCreditsInCurrentCycle,
      usedCreditsInCurrentCycle: state.usedCreditsInCurrentCycle,
      subscriptionCycle: {
        startTime: state.currentCycleStartTime,
        endTime: state.currentCycleEndTime,
      },
      totalPermanentCredits: state.totalPermanentCredits,
      usedPermanentCredits: state.usedPermanentCredits,
      availablePermanentCredits: availablePermanentCredits,
      pendingCredits: pendingFromCycle + pendingFromPermanent,
      pendingReservations: Object.values(state.pendingReservations),
    };

    return createSuccessResult<UserCreditsInfo>(creditsInfo);
  } catch (error) {
    debug('获取用户积分信息异常:', error);
    return createErrorResult<UserCreditsInfo>(
      UserCreditsErrorCode.CREDIT_SYSTEM_UNAVAILABLE,
      'System temporarily unavailable',
    );
  }
}

/**
 * 预扣用户积分
 */
export async function reserveUserCredits(
  params: ReserveCreditParams,
): Promise<CreditOperationResult<UserCreditsPoolState>> {
  try {
    const { userUuid, predictionId, creditsAmount, taskType, taskDescription } = params;

    // 参数验证
    if (!validateUserUuid(userUuid)) {
      return createErrorResult(UserCreditsErrorCode.INVALID_USER_UUID, '');
    }
    if (!validatePredictionId(predictionId)) {
      return createErrorResult(UserCreditsErrorCode.INVALID_PREDICTION_ID, '');
    }
    if (!validateCreditsAmount(creditsAmount)) {
      return createErrorResult(UserCreditsErrorCode.INVALID_CREDITS_AMOUNT, '');
    }

    // 调用积分池预扣逻辑
    const result = await CreditPool.reserveCredits(userUuid, predictionId, creditsAmount, taskType, taskDescription);

    if (!result.success) {
      // 直接使用 pool 返回的错误码，因为现在已经是标准的 UserCreditsErrorCode
      const errorCode = result.errorCode || UserCreditsErrorCode.DURABLE_OBJECT_ERROR;
      return createErrorResult(errorCode, '');
    }

    return createSuccessResult();
  } catch (error) {
    debug('预扣用户积分失败:', error);
    return createErrorResult(UserCreditsErrorCode.CREDIT_SYSTEM_UNAVAILABLE, '');
  }
}

/**
 * 确认扣除积分（生成成功后调用）
 */
export async function confirmCreditDeduction(
  params: ConfirmCreditDeductionParams,
): Promise<CreditOperationResult<UserCreditsPoolState>> {
  try {
    const { userUuid, predictionId, actualCreditsUsed, workInfo } = params;

    // 参数验证
    if (!validateUserUuid(userUuid)) {
      return createErrorResult(UserCreditsErrorCode.INVALID_USER_UUID, '');
    }
    if (!validatePredictionId(predictionId)) {
      return createErrorResult(UserCreditsErrorCode.INVALID_PREDICTION_ID, '');
    }

    // 调用积分池确认扣除逻辑
    const result = await CreditPool.confirmCreditDeduction(userUuid, predictionId, actualCreditsUsed);

    if (!result.success) {
      const errorCode = result.errorCode || UserCreditsErrorCode.DURABLE_OBJECT_ERROR;
      return createErrorResult(errorCode, '');
    }

    // 写入积分消耗流水记录
    try {
      const db = await getDbClient();
      const deductedCredits = result.data?.deductedCredits || actualCreditsUsed || 0;
      const taskType = result.data?.reservation?.taskType || workInfo.workType;
      const reservation = result.data?.reservation;

      // 构建 remarks，包含积分来源信息
      const remarksData = {
        description: `${taskType}: ${workInfo.inputContent.substring(0, 100)}`,
        deductionSource: reservation?.deductionSource || {
          fromCycleCredits: 0,
          fromPermanentCredits: 0,
        },
      };

      await db.insert(userCreditExpense).values({
        uuid: uuid(),
        userUuid,
        creditsAmount: deductedCredits,
        expenseType: 'generate_work',
        sourceRelationUuid: workInfo.workUuid,
        businessScenario: taskType,
        remarks: JSON.stringify(remarksData),
      });

      debug(`积分消耗流水记录已创建: 用户=${userUuid}, 积分=${deductedCredits}, 工作=${workInfo.workUuid}`);
    } catch (dbError) {
      debug('写入积分消耗流水失败:', dbError);
      // 流水记录失败不影响主流程，但需要记录日志
    }

    return createSuccessResult();
  } catch (error) {
    debug('确认扣除积分失败:', error);
    return createErrorResult(UserCreditsErrorCode.CREDIT_SYSTEM_UNAVAILABLE, '');
  }
}

/**
 * 取消积分预扣（生成失败后调用）
 */
export async function cancelCreditReservation(
  params: CancelCreditReservationParams,
): Promise<CreditOperationResult<UserCreditsPoolState>> {
  try {
    const { userUuid, predictionId, reason } = params;

    // 参数验证
    if (!validateUserUuid(userUuid)) {
      return createErrorResult(UserCreditsErrorCode.INVALID_USER_UUID, '');
    }
    if (!validatePredictionId(predictionId)) {
      return createErrorResult(UserCreditsErrorCode.INVALID_PREDICTION_ID, '');
    }

    // 调用积分池取消预扣逻辑
    const result = await CreditPool.cancelCreditReservation(userUuid, predictionId);

    if (!result.success) {
      const errorCode = result.errorCode || UserCreditsErrorCode.DURABLE_OBJECT_ERROR;
      return createErrorResult(errorCode, '');
    }

    debug(`积分预扣已取消: 用户=${userUuid}, 预测=${predictionId}, 原因=${reason || '未指定'}`);
    return createSuccessResult();
  } catch (error) {
    debug('取消积分预扣失败:', error);
    return createErrorResult(UserCreditsErrorCode.CREDIT_SYSTEM_UNAVAILABLE, '');
  }
}

/**
 * 刷新用户积分池（订阅更新时调用）
 */
export async function refreshUserCreditPool(
  params: RefreshCreditPoolParams,
): Promise<CreditOperationResult<UserCreditsPoolState>> {
  try {
    const { userUuid, newCycleStartTime, newCycleEndTime, newTotalCredits } = params;

    // 参数验证
    if (!validateUserUuid(userUuid)) {
      return createErrorResult(UserCreditsErrorCode.INVALID_USER_UUID, '');
    }
    if (!validateCreditsAmount(newTotalCredits)) {
      return createErrorResult(UserCreditsErrorCode.INVALID_CREDITS_AMOUNT, '');
    }
    if (newCycleStartTime >= newCycleEndTime) {
      return createErrorResult(UserCreditsErrorCode.CREDIT_POOL_STATE_INVALID, '');
    }

    // 调用积分池刷新逻辑
    const result = await CreditPool.refreshCreditPool(userUuid, newTotalCredits, newCycleStartTime, newCycleEndTime);

    if (!result.success) {
      const errorCode = result.errorCode || UserCreditsErrorCode.DURABLE_OBJECT_ERROR;
      return createErrorResult(errorCode, '');
    }

    debug(
      `积分池刷新成功: 用户=${userUuid}, 新积分=${newTotalCredits}, 新周期=${newCycleStartTime}-${newCycleEndTime}`,
    );
    return createSuccessResult();
  } catch (error) {
    debug('刷新用户积分池失败:', error);
    return createErrorResult(UserCreditsErrorCode.CREDIT_SYSTEM_UNAVAILABLE, '');
  }
}

/**
 * 初始化用户积分池
 */
export async function initializeUserCreditPool(
  userUuid: string,
  totalCredits: number,
  cycleStartTime: number,
  cycleEndTime: number,
  permanentCredits: number = 0,
): Promise<CreditOperationResult<UserCreditsPoolState>> {
  try {
    // 参数验证
    if (!validateUserUuid(userUuid)) {
      return createErrorResult(UserCreditsErrorCode.INVALID_USER_UUID, '');
    }
    // 允许 totalCredits = 0（场景 2：仅永久积分），但至少需要有一种积分
    if (totalCredits < 0 || !Number.isInteger(totalCredits)) {
      return createErrorResult(UserCreditsErrorCode.INVALID_CREDITS_AMOUNT, '');
    }
    if (totalCredits === 0 && permanentCredits === 0) {
      return createErrorResult(UserCreditsErrorCode.INSUFFICIENT_CREDITS, '');
    }
    // 允许零长度周期（startTime = endTime），但不允许时间倒流
    if (cycleStartTime > cycleEndTime) {
      return createErrorResult(UserCreditsErrorCode.CREDIT_POOL_STATE_INVALID, '');
    }

    // 调用积分池初始化逻辑
    const result = await CreditPool.initializeUserCreditPool(
      userUuid,
      totalCredits,
      cycleStartTime,
      cycleEndTime,
      permanentCredits,
    );

    if (!result.success) {
      const errorCode = result.errorCode || UserCreditsErrorCode.DURABLE_OBJECT_ERROR;
      return createErrorResult(errorCode, '');
    }

    debug(`积分池初始化成功: 用户=${userUuid}, 积分=${totalCredits}, 周期=${cycleStartTime}-${cycleEndTime}`);
    return createSuccessResult();
  } catch (error) {
    debug('初始化用户积分池失败:', error);
    return createErrorResult(UserCreditsErrorCode.CREDIT_SYSTEM_UNAVAILABLE, '');
  }
}

/**
 * 检查用户是否有足够积分
 */
export async function checkSufficientCredits(userUuid: string, requiredCredits: number): Promise<boolean> {
  try {
    // 参数验证
    if (!validateUserUuid(userUuid)) {
      debug('检查积分失败: 用户 UUID 格式无效');
      return false;
    }
    if (!validateCreditsAmount(requiredCredits)) {
      debug('检查积分失败: 所需积分数量无效');
      return false;
    }

    // 调用积分池检查逻辑
    const result = await CreditPool.checkSufficientCredits(userUuid, requiredCredits);

    if (!result.success) {
      debug('检查积分失败:', result.message);
      return false;
    }

    const sufficient = result.data?.sufficient || false;
    debug(`积分检查结果: 用户=${userUuid}, 需要=${requiredCredits}, 足够=${sufficient}`);

    return sufficient;
  } catch (error) {
    debug('检查用户积分失败:', error);
    return false;
  }
}

/**
 * 检查用户可用积分
 */
export async function checkAvailableCredits(userUuid: string, requiredCredits: number): Promise<number> {
  try {
    // 参数验证
    if (!validateUserUuid(userUuid)) {
      debug('检查积分失败: 用户 UUID 格式无效');
      return 0;
    }
    if (!validateCreditsAmount(requiredCredits)) {
      debug('检查积分失败: 所需积分数量无效');
      return 0;
    }

    // 调用积分池检查逻辑
    const result = await CreditPool.checkSufficientCredits(userUuid, requiredCredits);

    if (!result.success) {
      debug('检查积分失败:', result.message);
      return 0;
    }

    const availableCredits = result.data?.availableCredits || 0;
    return availableCredits;
  } catch (error) {
    debug('检查用户积分失败:', error);
    return 0;
  }
}

/**
 * 获取用户积分历史记录
 */
export async function getUserCreditHistory(
  userUuid: string,
  options?: {
    limit?: number;
    offset?: number;
    startTime?: number;
    endTime?: number;
    expenseType?: string;
  },
): Promise<{
  records: Array<{
    uuid: string;
    creditsAmount: number;
    expenseType: string;
    workRelationUuid?: string;
    remarks?: string;
    createdAt: number;
  }>;
  total: number;
}> {
  try {
    // 参数验证
    if (!validateUserUuid(userUuid)) {
      throw new Error('Invalid user UUID');
    }

    const db = await getDbClient();
    const { limit = 20, offset = 0, startTime, endTime, expenseType } = options || {};

    // 构建查询条件
    const conditions = [eq(userCreditExpense.userUuid, userUuid)];

    if (startTime) {
      conditions.push(gte(userCreditExpense.createdAt, startTime));
    }
    if (endTime) {
      conditions.push(lte(userCreditExpense.createdAt, endTime));
    }
    if (expenseType) {
      conditions.push(eq(userCreditExpense.expenseType, expenseType as any));
    }

    const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

    // 并行查询记录和总数
    const [recordsResult, totalResult] = await Promise.all([
      db
        .select({
          uuid: userCreditExpense.uuid,
          creditsAmount: userCreditExpense.creditsAmount,
          expenseType: userCreditExpense.expenseType,
          workRelationUuid: userCreditExpense.sourceRelationUuid,
          remarks: userCreditExpense.remarks,
          createdAt: userCreditExpense.createdAt,
        })
        .from(userCreditExpense)
        .where(whereCondition)
        .orderBy(desc(userCreditExpense.createdAt))
        .limit(limit)
        .offset(offset),

      db.select({ count: count() }).from(userCreditExpense).where(whereCondition),
    ]);

    // 转换记录格式，处理 null 值
    const records = recordsResult.map((row) => ({
      uuid: row.uuid,
      creditsAmount: row.creditsAmount,
      expenseType: row.expenseType,
      workRelationUuid: row.workRelationUuid || undefined,
      remarks: row.remarks || undefined,
      createdAt: row.createdAt,
    }));

    const total = totalResult[0]?.count || 0;

    debug(`获取积分历史记录: 用户=${userUuid}, 记录数=${records.length}, 总数=${total}`);

    return {
      records,
      total: Number(total),
    };
  } catch (error) {
    debug('获取用户积分历史记录失败:', error);
    throw error;
  }
}

/**
 * 清理过期的预扣记录
 */
export async function cleanupExpiredReservations(
  userUuid: string,
): Promise<CreditOperationResult<UserCreditsPoolState>> {
  try {
    // 参数验证
    if (!validateUserUuid(userUuid)) {
      return createErrorResult(UserCreditsErrorCode.INVALID_USER_UUID, '');
    }

    // 调用积分池清理逻辑
    const result = await CreditPool.cleanupExpiredReservations(userUuid);

    if (!result.success) {
      const errorCode = result.errorCode || UserCreditsErrorCode.DURABLE_OBJECT_ERROR;
      return createErrorResult(errorCode, '');
    }

    debug(`过期预扣记录清理完成: 用户=${userUuid}`);
    return createSuccessResult();
  } catch (error) {
    debug('清理过期预扣记录失败:', error);
    return createErrorResult(UserCreditsErrorCode.CREDIT_SYSTEM_UNAVAILABLE, '');
  }
}

/**
 * 处理获取积分信息请求
 */
export async function getUserCreditsInfoSafely(userUuid: string): Promise<APICreditsInfoResponse> {
  try {
    // console.log('💰 获取用户积分信息:', { userUuid });

    // 检查用户是否为付费用户
    const { hasEffectiveSubscription, hasOneTimePayment } = await checkUsePaidRecords(userUuid);
    const hasPaid = hasEffectiveSubscription || hasOneTimePayment;

    if (hasPaid) {
      // 订阅用户：返回真实积分信息
      // - 内含自动清理超时的预扣记录
      const creditsResult = await getUserCreditsInfo(userUuid);

      if (creditsResult.success && creditsResult.data) {
        const {
          availableCredits,
          totalCreditsInCurrentCycle,
          usedCreditsInCurrentCycle,
          pendingCredits,
          subscriptionCycle,
          pendingReservations,
          totalPermanentCredits,
          usedPermanentCredits,
          availablePermanentCredits,
        } = creditsResult.data;
        // console.log('✅ 付费用户积分信息获取成功:', {
        //   userUuid,
        //   availableCredits,
        //   totalCreditsInCurrentCycle,
        // });
        const response: CreditsInfoResponse = {
          success: true,
          data: {
            availableCredits,
            totalCreditsInCurrentCycle,
            usedCreditsInCurrentCycle,
            pendingCredits,
            subscriptionCycle,
            pendingReservations,
            totalPermanentCredits,
            usedPermanentCredits,
            availablePermanentCredits,
          },
          userType: EUserType.PAID,
        };

        return response;
      } else {
        console.error('❌ 付费用户积分信息获取失败:', {
          userUuid,
          errorCode: creditsResult.errorCode,
          message: creditsResult.message,
        });

        // 付费用户但积分池未初始化，尝试自动初始化
        if (creditsResult.errorCode === UserCreditsErrorCode.CREDIT_POOL_NOT_INITIALIZED) {
          console.log('🔄 检测到积分池未初始化，开始自动初始化:', userUuid);

          // 获取用户积分配置
          const configResult = await getUserCreditConfiguration(userUuid);

          if (!configResult.success) {
            console.error('❌ 获取积分配置失败:', configResult.error);
            const response: CreditsInfoResponse = {
              success: true,
              data: null,
              userType: EUserType.PAID,
              requiresInitialization: true,
            };
            return response;
          }

          // 执行积分池初始化
          const initResult = await initializeUserCreditPool(
            userUuid,
            configResult.totalCredits!,
            configResult.cycleStartTime!,
            configResult.cycleEndTime!,
            configResult.permanentCredits || 0,
          );

          if (!initResult.success) {
            console.error('❌ 积分池初始化失败:', {
              userUuid,
              errorCode: initResult.errorCode,
              message: initResult.message,
            });

            const response: CreditsInfoResponse = {
              success: true,
              data: null,
              userType: EUserType.PAID,
              requiresInitialization: true,
            };
            return response;
          }

          // 初始化成功，重新获取积分信息
          console.log('✅ 积分池初始化成功，重新获取积分信息:', userUuid);
          const retryResult = await getUserCreditsInfo(userUuid);

          if (retryResult.success && retryResult.data) {
            const {
              availableCredits,
              totalCreditsInCurrentCycle,
              usedCreditsInCurrentCycle,
              pendingCredits,
              subscriptionCycle,
              pendingReservations,
              totalPermanentCredits,
              usedPermanentCredits,
              availablePermanentCredits,
            } = retryResult.data;
            const response: CreditsInfoResponse = {
              success: true,
              data: {
                availableCredits,
                totalCreditsInCurrentCycle,
                usedCreditsInCurrentCycle,
                pendingCredits,
                subscriptionCycle,
                pendingReservations,
                totalPermanentCredits,
                usedPermanentCredits,
                availablePermanentCredits,
              },
              userType: EUserType.PAID,
            };

            return response;
          } else {
            console.error('❌ 重新获取积分信息失败:', {
              userUuid,
              errorCode: retryResult.errorCode,
              message: retryResult.message,
            });

            const response: CreditsInfoResponse = {
              success: true,
              data: null,
              userType: EUserType.PAID,
              requiresInitialization: true,
            };
            return response;
          }
        }

        const errorCode = ECommonErrorCode.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message: 'Failed to get credit information for subscribed user',
          errorCode,
          category: ErrorCodeUtils.getErrorCategory(errorCode),
        };
      }
    } else {
      // 免费用户：返回特殊状态，不查询积分池
      console.log('⏩ 免费用户，返回空积分信息');

      const response: CreditsInfoResponse = {
        success: true,
        data: null,
        userType: EUserType.FREE,
      };

      return response;
    }
  } catch (error) {
    console.error('❌ 处理积分信息请求失败:', error);

    const errorCode = ECommonErrorCode.INTERNAL_SERVER_ERROR;
    return {
      success: false,
      message: 'Failed to process credit information request',
      errorCode,
      category: ErrorCodeUtils.getErrorCategory(errorCode),
    };
  }
}

/**
 * 从数据库查询用户永久积分总量
 * @param userUuid 用户 UUID
 * @returns 永久积分总量
 */
async function getUserPermanentCreditsFromDB(userUuid: string): Promise<number> {
  try {
    const db = await getDbClient();

    // 查询 validEndTime 为 NULL 的积分收入记录
    const records = await db
      .select({
        amount: userCreditIncome.creditsAmount,
      })
      .from(userCreditIncome)
      .where(and(eq(userCreditIncome.userUuid, userUuid), sql`${userCreditIncome.validEndTime} IS NULL`));

    const total = records.reduce((sum, r) => sum + r.amount, 0);
    debug(`从数据库查询永久积分: 用户=${userUuid}, 总量=${total}`);

    return total;
  } catch (error) {
    debug('查询永久积分失败:', error);
    return 0;
  }
}

/**
 * 获取用户最新的积分配置信息（用于初始化积分池）
 *
 * 支持场景：
 * 1. 有有效订阅订单 → 返回订阅周期积分 + 永久积分
 * 2. 无订阅但有永久积分（一次性购买）→ 返回 0 周期积分 + 永久积分 + 零长度周期
 * 3. 既无订阅也无永久积分 → 返回失败
 * 4. 有有效订阅但无永久积分 → 返回订阅周期积分 + 0 永久积分（纯订阅用户）
 */
async function getUserCreditConfiguration(userUuid: string): Promise<{
  success: boolean;
  totalCredits?: number;
  permanentCredits?: number;
  cycleStartTime?: number;
  cycleEndTime?: number;
  error?: string;
}> {
  try {
    const env = await getCloudflareEnv();
    if (!env?.DB) {
      return { success: false, error: 'Database not available' };
    }

    const db = createDrizzleClient(env.DB);

    // ========================================
    // 步骤 1：查找用户最新的有效订阅订单
    // ========================================
    const latestOrder = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userUuid, userUuid),
          eq(orders.orderStatus, 'paid'),
          // 订阅未过期
          gte(orders.subscriptionEndTime, Math.floor(Date.now() / 1000)),
        ),
      )
      .orderBy(desc(orders.paymentTime))
      .limit(1);

    // ========================================
    // 步骤 2：查询永久积分（包括一次性购买）
    // ========================================
    const permanentCredits = await getUserPermanentCreditsFromDB(userUuid);

    // ========================================
    // 步骤 3：根据不同场景返回配置
    // ========================================

    // 场景 1 & 4：有有效订阅订单
    if (latestOrder.length > 0) {
      const order = latestOrder[0];
      const totalCredits = order.creditsAmountSnapshot || 0;
      const cycleStartTime = order.subscriptionStartTime || Math.floor(Date.now() / 1000);
      const cycleEndTime = order.subscriptionEndTime || cycleStartTime + 30 * 24 * 60 * 60;

      debug(`✅ 场景1/4: 用户有有效订阅, 订阅积分=${totalCredits}, 永久积分=${permanentCredits}`);

      return {
        success: true,
        totalCredits,
        permanentCredits,
        cycleStartTime,
        cycleEndTime,
      };
    }

    // 场景 2：无订阅但有永久积分（一次性购买）
    if (permanentCredits > 0) {
      const now = Math.floor(Date.now() / 1000);
      const cycleStartTime = now;
      const cycleEndTime = now; // 零长度周期，表示无订阅周期

      debug(`✅ 场景2: 用户无订阅但有永久积分, 永久积分=${permanentCredits}`);

      return {
        success: true,
        totalCredits: 0,  // 无订阅周期积分
        permanentCredits,
        cycleStartTime,
        cycleEndTime,
      };
    }

    // 场景 3：既无订阅也无永久积分
    debug(`❌ 场景3: 用户既无订阅也无永久积分`);
    return {
      success: false,
      error: 'No valid subscription or permanent credits found'
    };

  } catch (error) {
    console.error('❌ 获取用户积分配置失败:', error);
    return { success: false, error: 'Failed to get credit configuration' };
  }
}

/**
 * 增加用户永久积分
 * （供支付成功后调用）
 */
export async function addUserPermanentCredits(
  userUuid: string,
  creditsAmount: number,
): Promise<CreditOperationResult<UserCreditsPoolState>> {
  try {
    // 参数验证
    if (!validateUserUuid(userUuid)) {
      return createErrorResult(UserCreditsErrorCode.INVALID_USER_UUID, '');
    }
    if (!validateCreditsAmount(creditsAmount)) {
      return createErrorResult(UserCreditsErrorCode.INVALID_CREDITS_AMOUNT, '');
    }

    // 调用积分池增加逻辑
    const result = await CreditPool.addPermanentCredits(userUuid, creditsAmount);

    if (!result.success) {
      const errorCode = result.errorCode || UserCreditsErrorCode.DURABLE_OBJECT_ERROR;
      return createErrorResult(errorCode, '');
    }

    debug(`永久积分增加成功: 用户=${userUuid}, 积分=${creditsAmount}`);
    return createSuccessResult();
  } catch (error) {
    debug('增加永久积分失败:', error);
    return createErrorResult(UserCreditsErrorCode.CREDIT_SYSTEM_UNAVAILABLE, '');
  }
}

/**
 * 校正结果详情
 */
export interface FixCreditPoolResult {
  /** 积分池修正详情 */
  poolFixDetails: CreditPool.CreditFixDetails;
  /** 数据库对齐信息 */
  dbAlignmentInfo?: {
    /** 数据库中查询到的已消耗周期积分 */
    dbUsedCycleCredits: number;
    /** 数据库中查询到的已消耗永久积分 */
    dbUsedPermanentCredits: number;
    /** 是否存在差异 */
    hasDifference: boolean;
    /** 差异说明 */
    differenceNotes: string[];
  };
}

/**
 * 校正用户积分池
 * 包括积分池逻辑验证、过期预扣清理、数据库对齐等
 */
export async function fixUserCreditPool(
  userUuid: string,
): Promise<CreditOperationResult<FixCreditPoolResult>> {
  try {
    // 参数验证
    if (!validateUserUuid(userUuid)) {
      return createErrorResult<FixCreditPoolResult>(
        UserCreditsErrorCode.INVALID_USER_UUID,
        'Invalid user UUID'
      );
    }

    // 1. 执行积分池逻辑校正
    const poolFixResult = await CreditPool.fixCreditPool(userUuid);

    if (!poolFixResult.success) {
      const errorCode = poolFixResult.errorCode || UserCreditsErrorCode.DURABLE_OBJECT_ERROR;
      return createErrorResult<FixCreditPoolResult>(
        errorCode,
        poolFixResult.message || 'Failed to fix credit pool'
      );
    }

    const poolFixDetails = poolFixResult.data as CreditPool.CreditFixDetails;

    // 2. 查询数据库中的实际消耗记录
    try {
      const db = await getDbClient();
      const afterState = poolFixDetails.afterState;

      // 2.1 查询当前周期内的积分消耗
      // 检测是否为零长度周期（仅永久积分用户）
      const isZeroLengthCycle = afterState.currentCycleStartTime === afterState.currentCycleEndTime;

      const cycleExpenseRecords = await db
        .select({
          creditsAmount: userCreditExpense.creditsAmount,
          remarks: userCreditExpense.remarks,
        })
        .from(userCreditExpense)
        .where(
          isZeroLengthCycle
            ? // 零长度周期：查询所有历史消耗记录
              eq(userCreditExpense.userUuid, userUuid)
            : // 正常订阅周期：查询周期内消耗记录
              and(
                eq(userCreditExpense.userUuid, userUuid),
                gte(userCreditExpense.createdAt, afterState.currentCycleStartTime),
                lte(userCreditExpense.createdAt, afterState.currentCycleEndTime)
              )
        );

      // 2.2 统计数据库中的周期积分和永久积分消耗
      let dbUsedCycleCredits = 0;
      let dbUsedPermanentCredits = 0;

      for (const record of cycleExpenseRecords) {
        try {
          if (record.remarks) {
            const remarksData = JSON.parse(record.remarks);
            const source = remarksData.deductionSource;
            if (source) {
              dbUsedCycleCredits += source.fromCycleCredits || 0;
              dbUsedPermanentCredits += source.fromPermanentCredits || 0;
            } else {
              // 旧记录没有分配来源信息，默认算作周期积分
              dbUsedCycleCredits += record.creditsAmount;
            }
          } else {
            // 没有 remarks，默认算作周期积分
            dbUsedCycleCredits += record.creditsAmount;
          }
        } catch (parseError) {
          // remarks 解析失败，默认算作周期积分
          dbUsedCycleCredits += record.creditsAmount;
        }
      }

      // 2.3 对比积分池和数据库的差异
      const differenceNotes: string[] = [];
      let hasDifference = false;

      const cycleDiff = Math.abs(dbUsedCycleCredits - afterState.usedCreditsInCurrentCycle);
      const permanentDiff = Math.abs(dbUsedPermanentCredits - afterState.usedPermanentCredits);

      if (cycleDiff > 0.01) {
        hasDifference = true;
        differenceNotes.push(
          `周期积分差异: 积分池=${afterState.usedCreditsInCurrentCycle}, 数据库=${dbUsedCycleCredits}, 差值=${cycleDiff}`
        );
      }

      if (permanentDiff > 0.01) {
        hasDifference = true;
        differenceNotes.push(
          `永久积分差异: 积分池=${afterState.usedPermanentCredits}, 数据库=${dbUsedPermanentCredits}, 差值=${permanentDiff}`
        );
      }

      if (hasDifference) {
        differenceNotes.push(
          '说明: 积分池数据为实时状态，数据库为历史流水记录。积分池数据更准确，差异可能由于预扣未确认或历史数据不一致导致。'
        );
      } else {
        differenceNotes.push('积分池与数据库数据一致');
      }

      const result: FixCreditPoolResult = {
        poolFixDetails,
        dbAlignmentInfo: {
          dbUsedCycleCredits,
          dbUsedPermanentCredits,
          hasDifference,
          differenceNotes,
        },
      };

      debug(`积分池校正完成: 用户=${userUuid}`);
      debug(`  - 积分池修正项数: ${poolFixDetails.fixedIssues.length}`);
      debug(`  - 数据库差异: ${hasDifference ? '存在' : '不存在'}`);

      return createSuccessResult<FixCreditPoolResult>(result);
    } catch (dbError) {
      // 数据库查询失败，只返回积分池修正结果
      debug('查询数据库失败，跳过数据库对齐检查:', dbError);

      const result: FixCreditPoolResult = {
        poolFixDetails,
        dbAlignmentInfo: {
          dbUsedCycleCredits: 0,
          dbUsedPermanentCredits: 0,
          hasDifference: false,
          differenceNotes: ['数据库查询失败，无法进行对齐检查'],
        },
      };

      return createSuccessResult<FixCreditPoolResult>(result);
    }
  } catch (error) {
    debug('校正用户积分池失败:', error);
    return createErrorResult<FixCreditPoolResult>(
      UserCreditsErrorCode.CREDIT_SYSTEM_UNAVAILABLE,
      error instanceof Error ? error.message : 'System temporarily unavailable'
    );
  }
}
