/**
 * 用户订阅状态检查服务
 * 用于判断用户是否为付费订阅用户
 */

import { createDrizzleClient } from '@/db/client';
import { orders } from '@/db/schema';
import { and, eq, gte, or, isNull } from 'drizzle-orm';
import { getCloudflareEnv } from '@/services/base';
import { EPaymentErrorCode } from '@/types/services/errors';
import { createAPIErrorResult, APIErrorResponse, APISuccessResponse } from '@/lib/api-response';
import { EUserOrderStatus } from '@/types/user';
import { baseDoStorage } from '../do-storage/base';
import { NEED_PAID_SYSTEM } from '@/constants/config';

/** 缓存过期时间 - 1 分钟 */
const CACHE_TTL_MS = 60 * 1000;

/**
 * 获取缓存服务
 */
async function getSubscriptionCacheService() {
  return baseDoStorage;
}

/**
 * 生成用户订阅状态的缓存键
 */
function getSubscriptionCacheKey(userUuid: string): string {
  return `user-paid-status-${userUuid}`;
}

/**
 * 从数据库查询用户是否已经有相关产品的订阅
 */
export async function getEffectiveSubscriptionsFromDB(userUuid: string): Promise<APISuccessResponse<any[]> | APIErrorResponse> {
  try {
    // 获取 Cloudflare 环境上下文
    const env = await getCloudflareEnv();

    if (!env?.DB) {
      console.error('数据库环境未配置，默认为免费用户');
      return createAPIErrorResult({
        errorCode: EPaymentErrorCode.SUBSCRIPTION_QUERY_FAILED,
      });
    }

    const db = createDrizzleClient(env.DB);

    // 查询用户的有效订单
    const validOrders = await db
      .select({
        uuid: orders.uuid,
        orderNumber: orders.orderNumber,
        userUuid: orders.userUuid,
        orderAmount: orders.orderAmount,
        orderCurrency: orders.orderCurrency,
        productUuid: orders.productUuid,
        productName: orders.productName,
        productPriceSnapshot: orders.productPriceSnapshot,
        creditsAmountSnapshot: orders.creditsAmountSnapshot,
        paymentTime: orders.paymentTime,
        orderStatus: orders.orderStatus,
        paymentMethod: orders.paymentMethod,
        paymentPlatformOrderId: orders.paymentPlatformOrderId,
        subscriptionId: orders.subscriptionId,
        subscriptionCycle: orders.subscriptionCycle,
        subscriptionStartTime: orders.subscriptionStartTime,
        subscriptionEndTime: orders.subscriptionEndTime,
        refundAmount: orders.refundAmount,
        refundTime: orders.refundTime,
        remarks: orders.remarks,
        orderCreatedAt: orders.orderCreatedAt,
        orderUpdatedAt: orders.orderUpdatedAt,
      })
      .from(orders)
      .where(
        and(
          eq(orders.userUuid, userUuid),
          eq(orders.orderStatus, EUserOrderStatus.Paid),
          gte(orders.subscriptionEndTime, Math.floor(Date.now() / 1000)), // 订阅未过期
        ),
      )
      .limit(10);

    return {
      success: true,
      data: validOrders,
      message: '',
    };
  } catch (error) {
    console.error('从数据库检查用户有效订阅列表失败:', error);
    return createAPIErrorResult({
      errorCode: EPaymentErrorCode.SUBSCRIPTION_QUERY_FAILED,
    });
  }
}

interface CheckPaidRecordsFromDBResult {
  // 当前是否还有有效订阅
  hasEffectiveSubscription: boolean;
  // 是否有过一次性支付
  hasOneTimePayment: boolean;
}
/**
 * 从数据库查询用户一次性支付或订阅状态
 */
async function checkPaidRecordsFromDB(userUuid: string): Promise<CheckPaidRecordsFromDBResult> {
  try {
    // 获取 Cloudflare 环境上下文
    const env = await getCloudflareEnv();

    if (!env?.DB) {
      console.error('数据库环境未配置，默认为免费用户');
      return {
        hasEffectiveSubscription: false,
        hasOneTimePayment: false,
      };
    }

    const db = createDrizzleClient(env.DB);

    // 查询用户的有效订阅
    const effectiveSubscriptionsPromise = db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userUuid, userUuid),
          eq(orders.orderStatus, EUserOrderStatus.Paid),
          gte(orders.subscriptionEndTime, Math.floor(Date.now() / 1000)), // 订阅未过期
        ),
      )
      .limit(1);
    const oneTimePaymentsPromise = db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userUuid, userUuid),
          eq(orders.orderStatus, EUserOrderStatus.Paid),
          isNull(orders.subscriptionCycle), // 没有订阅，说明是一次性支付
        ),
      )
      .limit(1);
    const [effectiveSubscriptions, oneTimePayments] = await Promise.all([effectiveSubscriptionsPromise, oneTimePaymentsPromise]);
    
    const hasEffectiveSubscription = effectiveSubscriptions.length > 0;
    const hasOneTimePayment = oneTimePayments.length > 0;

    // console.log(
    //   '🔍 从数据库检查用户订阅状态:',
    //   JSON.stringify(
    //     {
    //       userUuid,
    //       hasEffectiveSubscription,
    //       hasOneTimePayment,
    //     },
    //     null,
    //     2,
    //   ),
    // );

    return {
      hasEffectiveSubscription,
      hasOneTimePayment,
    };
  } catch (error) {
    console.error('从数据库检查用户订阅状态失败:', error);
    return {
      hasEffectiveSubscription: false,
      hasOneTimePayment: false,
    };
  }
}

interface CheckUsePaidRecordsResult {
  hasEffectiveSubscription: boolean;
  hasOneTimePayment: boolean;
  timestamp: number;
}
/**
 * 检查用户是否有支付订单
 * 使用缓存机制优化性能，缓存有效期 1 分钟
 *
 * @param userUuid - 用户 UUID
 * @returns Promise<boolean> - 是否有有效订阅
 */
export async function checkUsePaidRecords(userUuid?: string): Promise<CheckUsePaidRecordsResult> {
  if (!userUuid || !NEED_PAID_SYSTEM) {
    return {
      hasEffectiveSubscription: false,
      hasOneTimePayment: false,
      timestamp: Date.now(),
    };
  }

  try {
    // 尝试从缓存获取结果
    const cacheService = await getSubscriptionCacheService();
    if (cacheService) {
      const cacheKey = getSubscriptionCacheKey(userUuid);

      try {
        const cachedResult = (await cacheService.get(cacheKey)) as CheckUsePaidRecordsResult | null;

        if (cachedResult) {
          // console.log(
          //   '🚀 从缓存获取用户订阅状态:',
          //   JSON.stringify(
          //     {
          //       userUuid,
          //       cacheAge: Date.now() - cachedResult.timestamp,
          //       ...cachedResult,
          //     },
          //     null,
          //     2,
          //   ),
          // );
          return cachedResult;
        }
      } catch (cacheError) {
        console.warn('读取订阅状态缓存失败，将查询数据库:', cacheError);
      }
    }

    // 缓存未命中，从数据库查询
    const { hasEffectiveSubscription, hasOneTimePayment } = await checkPaidRecordsFromDB(userUuid);
    const cacheData = {
      hasEffectiveSubscription,
      hasOneTimePayment,
      timestamp: Date.now(),
    };

    // 将结果写入缓存
    if (cacheService) {
      try {
        const cacheKey = getSubscriptionCacheKey(userUuid);
        await cacheService.set(cacheKey, cacheData, CACHE_TTL_MS);
        // console.log('📝 已缓存用户订阅状态:', JSON.stringify({ userUuid, ...cacheData }, null, 2));
      } catch (cacheError) {
        console.warn('写入订阅状态缓存失败:', cacheError);
      }
    }

    return cacheData;
  } catch (error) {
    console.error('检查用户订阅状态失败:', error);
    return {
      hasEffectiveSubscription: false,
      hasOneTimePayment: false,
      timestamp: Date.now(),
    };
  }
}
