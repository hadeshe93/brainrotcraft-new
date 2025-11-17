/**
 * Stripe 订阅管理器
 * 处理 Stripe 订阅相关的业务逻辑
 */

import { ISubscriptionManager, SubscriptionInfo } from '../../base/subscription-manager';
import { PaymentProvider } from '../../types';
import { createDrizzleClient } from '@/db/client';
import { orders, userCreditIncome } from '@/db/schema';
import { eq, and, desc, gte, or, isNull, not, lt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { EUserOrderStatus } from '@/types/user';

/**
 * Stripe 订阅管理器实现
 */
export class StripeSubscriptionManager implements ISubscriptionManager {
  /**
   * 检查是否能处理指定的支付提供商
   */
  canHandle(provider: PaymentProvider): boolean {
    return provider === PaymentProvider.STRIPE;
  }

  /**
   * 获取用户的当前订阅状态
   */
  async getUserSubscription(userId: string, d1Database: D1Database): Promise<SubscriptionInfo | null> {
    const db = createDrizzleClient(d1Database);
    
    const userOrders = await db.select()
      .from(orders)
      .where(
        and(
          eq(orders.userUuid, userId),
          eq(orders.orderStatus, EUserOrderStatus.Paid),
          not(isNull(orders.subscriptionId))
        )
      )
      .orderBy(desc(orders.orderCreatedAt))
      .limit(1);

    if (userOrders.length === 0) {
      return null;
    }

    const order = userOrders[0];
    
    // 检查订阅是否仍然有效
    if (order.subscriptionEndTime && order.subscriptionEndTime < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      subscriptionId: order.subscriptionId!,
      userId: order.userUuid,
      productId: order.productUuid,
      status: 'active',
      currentPeriodStart: order.subscriptionStartTime || order.orderCreatedAt,
      currentPeriodEnd: order.subscriptionEndTime || 
        (order.subscriptionStartTime || order.orderCreatedAt) + (30 * 24 * 60 * 60),
      cancelAtPeriodEnd: false,
    };
  }

  /**
   * 检查用户是否有有效订阅
   */
  async hasActiveSubscription(userId: string, d1Database: D1Database): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId, d1Database);
    return subscription !== null && subscription.status === 'active';
  }

  /**
   * 获取用户的可用积分
   */
  async getUserCredits(userId: string, d1Database: D1Database): Promise<number> {
    const db = createDrizzleClient(d1Database);
    const currentTime = Math.floor(Date.now() / 1000);
    
    // 获取所有未过期的积分收入
    const incomes = await db.select()
      .from(userCreditIncome)
      .where(
        and(
          eq(userCreditIncome.userUuid, userId),
          or(
            isNull(userCreditIncome.validEndTime),
            gte(userCreditIncome.validEndTime, currentTime)
          )
        )
      );

    // 计算总积分
    const totalCredits = incomes.reduce((sum: number, income: any) => sum + income.creditsAmount, 0);
    
    // TODO: 减去已使用的积分（需要从 userCreditExpense 表查询）
    
    return totalCredits;
  }

  /**
   * 为订阅续费添加积分
   */
  async addSubscriptionCredits(
    userId: string,
    credits: number,
    subscriptionId: string,
    validMonths: number,
    d1Database: D1Database,
    sourceOrderId?: string
  ): Promise<void> {
    const db = createDrizzleClient(d1Database);
    const incomeUuid = nanoid();
    const validStartTime = Math.floor(Date.now() / 1000);
    const validEndTime = validMonths > 0 ? 
      validStartTime + (validMonths * 30 * 24 * 60 * 60) : 
      null;

    await db.insert(userCreditIncome).values({
      uuid: incomeUuid,
      userUuid: userId,
      creditsAmount: credits,
      incomeType: validMonths === 12 ? 'purchase_yearly' : 'purchase_monthly',
      sourceRelationUuid: sourceOrderId || null,
      validStartTime,
      validEndTime,
      remarks: `Subscription renewal: ${subscriptionId}`,
    });

    console.log('Credits added for subscription renewal:', {
      userId,
      credits,
      subscriptionId,
      validMonths,
    });
  }

  /**
   * 处理订阅取消
   */
  async handleSubscriptionCancellation(
    subscriptionId: string,
    d1Database: D1Database,
    cancelImmediately: boolean = false
  ): Promise<void> {
    const db = createDrizzleClient(d1Database);
    const currentTime = Math.floor(Date.now() / 1000);
    
    // 更新订单状态
    await db.update(orders)
      .set({
        orderStatus: EUserOrderStatus.Cancelled,
        subscriptionEndTime: cancelImmediately ? currentTime : undefined,
        orderUpdatedAt: currentTime,
        remarks: `Subscription cancelled at ${new Date().toISOString()}, immediate: ${cancelImmediately}`,
      })
      .where(eq(orders.subscriptionId, subscriptionId));

    console.log('Subscription cancellation processed:', {
      subscriptionId,
      cancelImmediately,
    });
  }

  /**
   * 处理支付失败的宽限期
   */
  async handlePaymentFailureGracePeriod(
    subscriptionId: string,
    d1Database: D1Database,
    gracePeriodDays: number = 5
  ): Promise<void> {
    const db = createDrizzleClient(d1Database);
    const gracePeriodEnd = Math.floor(Date.now() / 1000) + (gracePeriodDays * 24 * 60 * 60);
    
    // 更新订单，添加宽限期信息
    await db.update(orders)
      .set({
        orderStatus: EUserOrderStatus.Failed,
        orderUpdatedAt: Math.floor(Date.now() / 1000),
        remarks: `Payment failed, grace period until ${new Date(gracePeriodEnd * 1000).toISOString()}`,
      })
      .where(eq(orders.subscriptionId, subscriptionId));

    console.log('Grace period set for subscription:', {
      subscriptionId,
      gracePeriodDays,
      gracePeriodEnd: new Date(gracePeriodEnd * 1000),
    });
  }

  /**
   * 获取订阅的产品信息
   */
  async getSubscriptionProduct(subscriptionId: string, d1Database: D1Database): Promise<{
    productId: string;
    productName: string;
    credits: number;
    price: number;
    cycle: 'monthly' | 'yearly' | null;
  } | null> {
    const db = createDrizzleClient(d1Database);
    const order = await db.select()
      .from(orders)
      .where(eq(orders.subscriptionId, subscriptionId))
      .limit(1);

    if (order.length === 0) {
      return null;
    }

    return {
      productId: order[0].productUuid,
      productName: order[0].productName,
      credits: order[0].creditsAmountSnapshot,
      price: order[0].productPriceSnapshot,
      cycle: order[0].subscriptionCycle,
    };
  }

  /**
   * 检查并处理过期的订阅
   */
  async checkAndHandleExpiredSubscriptions(d1Database: D1Database): Promise<void> {
    const db = createDrizzleClient(d1Database);
    const currentTime = Math.floor(Date.now() / 1000);
    
    // 查找所有已过期但状态仍为 'paid' 的订阅
    const expiredOrders = await db.select()
      .from(orders)
      .where(
        and(
          eq(orders.orderStatus, EUserOrderStatus.Paid),
          not(isNull(orders.subscriptionId)),
          not(isNull(orders.subscriptionEndTime)),
          lt(orders.subscriptionEndTime, currentTime)
        )
      );

    for (const order of expiredOrders) {
      await db.update(orders)
        .set({
          orderStatus: EUserOrderStatus.Cancelled,
          orderUpdatedAt: currentTime,
          remarks: `Subscription expired at ${new Date(order.subscriptionEndTime! * 1000).toISOString()}`,
        })
        .where(eq(orders.id, order.id));

      console.log('Expired subscription marked as cancelled:', {
        orderId: order.uuid,
        subscriptionId: order.subscriptionId,
        expiredAt: new Date(order.subscriptionEndTime! * 1000),
      });
    }
  }
}