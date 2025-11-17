/**
 * Stripe Webhook 处理器
 * 处理 Stripe 发送的各种支付事件
 */

import { IWebhookHandler } from '../../base/webhook-handler';
import { WebhookEvent, PaymentProvider, WebhookEventType } from '../../types';
import { convertStripeEventToWebhookEvent } from './utils';
import { createDrizzleClient } from '@/db/client';
import { orders, userCreditIncome } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  initializeUserCreditPool,
  refreshUserCreditPool,
  getUserCreditsInfo,
  addUserPermanentCredits,
} from '@/services/user/credits';
import Stripe from 'stripe';
import { EUserOrderStatus } from '@/types/user';

/**
 * Stripe Webhook 处理器实现
 */
export class StripeWebhookHandler implements IWebhookHandler {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(stripe: Stripe, webhookSecret: string) {
    this.stripe = stripe;
    this.webhookSecret = webhookSecret;
  }

  /**
   * 检查是否能处理指定的支付提供商
   */
  canHandle(provider: PaymentProvider): boolean {
    return provider === PaymentProvider.STRIPE;
  }

  /**
   * 验证 webhook 签名
   */
  async verifySignature(rawBody: string, signature: string): Promise<boolean> {
    // console.log('Stripe webhook signature verification:', {
    //   rawBody,
    //   signature,
    //   webhookSecret: this.webhookSecret,
    // });
    try {
      this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
      return true;
    } catch (error) {
      console.error('Stripe webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * 解析 webhook 事件
   */
  async parseEvent(rawBody: string, signature: string): Promise<WebhookEvent> {
    const stripeEvent = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    // console.log('Stripe raw event:', stripeEvent);

    return convertStripeEventToWebhookEvent(stripeEvent);
  }

  /**
   * 处理 webhook 事件
   */
  async handleEvent(event: WebhookEvent, db: D1Database): Promise<void> {
    console.log(`Processing Stripe webhook event: ${JSON.stringify({id: event.id, type: event.type})}`);

    const drizzle = createDrizzleClient(db);

    switch (event.type) {
      // 首次支付成功，包括一次性支付和订阅支付
      case WebhookEventType.PAYMENT_SUCCESS:
        await this.handlePaymentSuccess(event, drizzle);
        break;

      case WebhookEventType.SUBSCRIPTION_CREATED:
        await this.handleSubscriptionCreated(event, drizzle);
        break;

      // 订阅续费成功
      case WebhookEventType.SUBSCRIPTION_UPDATED:
        await this.handleSubscriptionUpdated(event, drizzle);
        break;

      case WebhookEventType.SUBSCRIPTION_DELETED:
        await this.handleSubscriptionDeleted(event, drizzle);
        break;

      case WebhookEventType.PAYMENT_FAILED:
        await this.handlePaymentFailed(event, drizzle);
        break;

      case WebhookEventType.SESSION_EXPIRED:
        await this.handleSessionExpired(event, drizzle);
        break;

      default:
        console.log(`No need to handle Stripe event type: ${event.type}`);
    }
  }

  /**
   * 获取支持的事件类型列表
   */
  getSupportedEvents(): string[] {
    return [
      'checkout.session.completed', // 首次支付成功
      'checkout.session.expired', // 支付会话过期
      'customer.subscription.created', // 订阅创建
      'customer.subscription.updated', // 订阅更新（含续费）
      'customer.subscription.deleted', // 订阅删除/取消
      'invoice.payment_failed', // 发票支付失败（订阅续费失败）
    ];
  }

  /**
   * 处理支付成功事件
   */
  private async handlePaymentSuccess(event: WebhookEvent, db: any): Promise<void> {
    const session = event.data as Stripe.Checkout.Session;

    // 从 metadata 中获取必要信息
    const userId = session.metadata?.userId;
    const productId = session.metadata?.productId;
    const credits = parseInt(session.metadata?.credits || '0');
    const validMonths = parseInt(session.metadata?.validMonths || '0');

    if (!userId || !productId) {
      const message = `Missing required metadata in payment success event: ${JSON.stringify({
        sessionId: session.id,
        metadata: session.metadata,
      })}`;
      throw new Error(message);
    }

    console.log(`Processing payment success: ${JSON.stringify({
      sessionId: session.id,
      userId,
      productId,
      credits,
      validMonths,
      mode: session.mode,
    })}`);

    // 检查订单是否已存在
    const existingOrder = await db.select().from(orders).where(eq(orders.paymentPlatformOrderId, session.id)).limit(1);

    if (existingOrder.length > 0) {
      const message = `Order already exists for session: ${session.id}`;
      console.error(message);
      return;
    }

    // 执行数据库事务
    // - 由于 D1 不支持事务，所以需要使用 batch 批量插入，其背后就是事务机制
    const dbBatchTask: any[] = [];
    const nowMs = Date.now();
    const nowSec = Math.floor(nowMs / 1000);
    const isSessionSubscription = session.mode === 'subscription';
    const subscriptionStartTime = isSessionSubscription ? nowSec : null;
    const subscriptionEndTime = isSessionSubscription && validMonths > 0 ? nowSec + validMonths * 30 * 24 * 60 * 60 : null

    // 创建订单记录
    const orderUuid = nanoid();
    const orderNumber = `ORD${nowMs}${nanoid(6)}`;
    const amountTotal = session.amount_total || 0;
    const currency = session.currency || 'usd';
    const orderAmount = amountTotal / 100;
    const orderData = {
      uuid: orderUuid,
      orderNumber,
      userUuid: userId,
      orderAmount,
      productUuid: productId,
      productName: session.metadata?.productName || productId,
      productPriceSnapshot: orderAmount,
      creditsAmountSnapshot: credits,
      paymentTime: nowSec,
      orderStatus: EUserOrderStatus.Paid,
      paymentMethod: 'stripe',
      paymentPlatformOrderId: session.id,
      customerId: session.customer as string | null,
      subscriptionId: session.subscription as string | null,
      subscriptionCycle: isSessionSubscription
        ? ((session.metadata?.interval === 'year' ? 'yearly' : 'monthly') as 'yearly' | 'monthly')
        : null,
      subscriptionStartTime,
      subscriptionEndTime,
      remarks: `Currency: ${currency}, Payment Mode: ${session.mode}`,
    };
    dbBatchTask.push(db.insert(orders).values(orderData));

    // 添加积分收入记录
    const creditValidStartTime = nowSec;
    // 订阅的积分有有效期，一次性付费的积分有效期是无限期
    const creditValidEndTime = isSessionSubscription 
      ? creditValidStartTime + (validMonths > 0 ? validMonths : 1) * 30 * 24 * 60 * 60 // 兜底 1 个月有效期
      : null;

    if (credits > 0) {
      const incomeUuid = nanoid();
      const incomeType = isSessionSubscription
        ? session.metadata?.interval === 'year'
          ? 'purchase_yearly'
          : 'purchase_monthly'
        : 'purchase_one_time';

      const incomeData = {
        uuid: incomeUuid,
        userUuid: userId,
        creditsAmount: credits,
        incomeType: incomeType as any,
        sourceRelationUuid: orderUuid,
        validStartTime: creditValidStartTime,
        validEndTime: creditValidEndTime,
        remarks: `Product: ${productId}, Session: ${session.id}`,
      };

      dbBatchTask.push(db.insert(userCreditIncome).values(incomeData));
    }
    await db.batch(dbBatchTask);

    // 初始化或刷新用户积分池
    if (credits > 0) {
      try {
        if (isSessionSubscription) {
          // ========================================
          // 订阅购买：处理订阅周期积分
          // ========================================
          let creditPoolResult;
          const existingCreditsResult = await getUserCreditsInfo(userId);

          if (existingCreditsResult.success) {
            // 积分池已存在，刷新订阅周期
            creditPoolResult = await refreshUserCreditPool({
              userUuid: userId,
              newCycleStartTime: creditValidStartTime,
              newCycleEndTime: creditValidEndTime!,  // 订阅时一定有值
              newTotalCredits: credits,
            });
            console.log('✅ 订阅用户积分池刷新成功:', { userId, credits, validEndTime: creditValidEndTime });
          } else {
            // 积分池不存在，初始化（首次订阅）
            creditPoolResult = await initializeUserCreditPool(
              userId,
              credits,                // 订阅周期积分
              creditValidStartTime,
              creditValidEndTime!,    // 订阅时一定有值
              0                       // permanentCredits = 0
            );
            console.log('✅ 订阅用户积分池初始化成功:', { userId, credits, validEndTime: creditValidEndTime });
          }

          if (!creditPoolResult.success) {
            console.error(`❌ 订阅积分池操作失败: ${JSON.stringify({
              userId,
              credits,
              errorCode: creditPoolResult.errorCode,
              message: creditPoolResult.message,
            })}`);
          }
        } else {
          // ========================================
          // 一次性购买：处理永久积分
          // ========================================
          const existingCreditsResult = await getUserCreditsInfo(userId);

          if (!existingCreditsResult.success) {
            // 积分池未初始化，需要先初始化一个零长度的订阅周期
            // 设置起始时间 = 结束时间，表示零长度的虚拟订阅周期
            const initResult = await initializeUserCreditPool(
              userId,
              0,                      // 订阅积分为 0
              creditValidStartTime,
              creditValidStartTime,   // 结束时间 = 起始时间（零长度周期）
              credits                 // 永久积分
            );

            if (initResult.success) {
              console.log('✅ 一次性购买用户积分池初始化成功:', {
                userId,
                permanentCredits: credits,
                subscriptionCredits: 0,
              });
            } else {
              console.error(`❌ 一次性购买积分池初始化失败: ${JSON.stringify({
                userId,
                credits,
                errorCode: initResult.errorCode,
                message: initResult.message,
              })}`);
            }
          } else {
            // 积分池已存在，直接增加永久积分
            const addResult = await addUserPermanentCredits(userId, credits);

            if (addResult.success) {
              console.log('✅ 一次性购买永久积分增加成功:', { userId, permanentCredits: credits });
            } else {
              console.error(`❌ 一次性购买永久积分增加失败: ${JSON.stringify({
                userId,
                credits,
                errorCode: addResult.errorCode,
                message: addResult.message,
              })}`);
            }
          }
        }
      } catch (error) {
        console.error(`❌ 积分池操作异常: ${JSON.stringify({
          userId,
          credits,
          isSubscription: isSessionSubscription,
          error,
        })}`);
      }
    }

    console.log('Payment success processed successfully:', {
      userId,
      credits,
      validMonths,
    });
  }

  /**
   * 处理订阅创建事件
   */
  private async handleSubscriptionCreated(event: WebhookEvent, _db: any): Promise<void> {
    const subscription = event.data as Stripe.Subscription;

    console.log('Subscription created:', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      metadata: subscription.metadata,
    });

    // 订阅创建通常在 checkout.session.completed 时已处理
    // 这里可以做额外的验证或通知
  }

  /**
   * 处理订阅更新事件
   */
  private async handleSubscriptionUpdated(event: WebhookEvent, db: any): Promise<void> {
    const subscription = event.data as Stripe.Subscription;
    const userId = subscription.metadata?.userId;

    if (!userId) {
      const message = `Missing userId in subscription metadata: ${subscription.id}`;
      throw new Error(message);
    }

    console.log('Subscription updated:', {
      subscriptionId: subscription.id,
      status: subscription.status,
      userId,
    });

    const nowMs = Date.now();
    const nowSec = Math.floor(nowMs / 1000);

    // 更新订单表中的订阅状态
    if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      await db
        .update(orders)
        .set({
          orderStatus: subscription.status === 'canceled' ? EUserOrderStatus.Cancelled : EUserOrderStatus.Failed,
          orderUpdatedAt: nowSec,
          remarks: `Subscription ${subscription.status} at ${new Date().toISOString()}`,
        })
        .where(eq(orders.subscriptionId, subscription.id));

      console.log('Order status updated for subscription:', {
        subscriptionId: subscription.id,
        newStatus: subscription.status,
      });
    }

    // 处理订阅续费成功
    if (subscription.status === 'active' && (subscription as any).current_period_start) {
      const validMonths = parseInt(subscription.metadata?.validMonths || '0');
      const currentPeriodStart = (subscription as any).current_period_start;
      const currentPeriodEnd = currentPeriodStart + (validMonths > 0 ? validMonths : 1) * 30 * 24 * 60 * 60;

      // 检查是否是续费（不是首次支付）
      const existingOrders = await db
        .select()
        .from(orders)
        .where(and(eq(orders.subscriptionId, subscription.id), eq(orders.orderStatus, EUserOrderStatus.Paid)));

      if (existingOrders.length > 1) {
        // 这是续费，添加新的积分
        const credits = parseInt(subscription.metadata?.credits || '0');

        if (credits > 0) {
          const incomeUuid = nanoid();
          const incomeData = {
            uuid: incomeUuid,
            userUuid: userId,
            creditsAmount: credits,
            incomeType: 'purchase_monthly' as const,
            sourceRelationUuid: existingOrders[0].uuid,
            validStartTime: currentPeriodStart,
            validEndTime: currentPeriodEnd,
            remarks: `Subscription renewal: ${subscription.id}`,
          };

          await db.insert(userCreditIncome).values(incomeData);

          console.log('Subscription renewal credits added:', {
            subscriptionId: subscription.id,
            userId,
            credits,
          });

          // 刷新用户积分池（续费情况）
          try {
            const refreshResult = await refreshUserCreditPool({
              userUuid: userId,
              newCycleStartTime: currentPeriodStart,
              newCycleEndTime: currentPeriodEnd,
              newTotalCredits: credits,
            });

            if (refreshResult.success) {
              console.log('✅ 续费用户积分池刷新成功:', { userId, credits });
            } else {
              console.error('❌ 续费用户积分池刷新失败:', {
                userId,
                credits,
                errorCode: refreshResult.errorCode,
                message: refreshResult.message,
              });
            }
          } catch (error) {
            console.error('❌ 续费用户积分池刷新异常:', { userId, credits, error });
          }
        }
      }
    }
  }

  /**
   * 处理订阅删除事件
   */
  private async handleSubscriptionDeleted(event: WebhookEvent, db: any): Promise<void> {
    const subscription = event.data as Stripe.Subscription;
    const userId = subscription.metadata?.userId;

    if (!userId) {
      const message = `Missing userId in subscription metadata: ${subscription.id}`;
      throw new Error(message);
    }

    console.log('Subscription deleted:', {
      subscriptionId: subscription.id,
      userId,
    });

    // 更新订单状态为已取消
    await db
      .update(orders)
      .set({
        orderStatus: EUserOrderStatus.Cancelled,
        subscriptionEndTime: Math.floor(Date.now() / 1000),
        orderUpdatedAt: Math.floor(Date.now() / 1000),
        remarks: `Subscription cancelled at ${new Date().toISOString()}`,
      })
      .where(eq(orders.subscriptionId, subscription.id));

    console.log('Subscription cancellation recorded:', {
      subscriptionId: subscription.id,
      userId,
    });
  }

  /**
   * 处理支付失败事件
   * 只处理 invoice.payment_failed（订阅续费失败）
   */
  private async handlePaymentFailed(event: WebhookEvent, db: any): Promise<void> {
    const invoice = event.data as Stripe.Invoice;
    const subscriptionId = (invoice as any).subscription as string;
    const attemptCount = invoice.attempt_count || 0;
    const nextPaymentAttempt = invoice.next_payment_attempt;

    console.log('Invoice payment failed:', {
      invoiceId: invoice.id,
      subscriptionId,
      attemptCount,
      nextPaymentAttempt,
    });

    // 如果还有重试机会，只记录日志
    if (nextPaymentAttempt) {
      const message = `Payment will be retried at: ${new Date(nextPaymentAttempt * 1000)}`;
      throw new Error(message);
    }

    // 没有更多重试，标记订单为失败
    if (subscriptionId) {
      await db
        .update(orders)
        .set({
          orderStatus: EUserOrderStatus.Failed,
          orderUpdatedAt: Math.floor(Date.now() / 1000),
          remarks: `Payment failed after ${attemptCount} attempts`,
        })
        .where(eq(orders.subscriptionId, subscriptionId));

      console.log('Order marked as failed for subscription:', subscriptionId);
    }
  }

  /**
   * 处理会话过期事件
   */
  private async handleSessionExpired(event: WebhookEvent, _db: any): Promise<void> {
    console.log('Session expired:', {
      sessionId: event.sessionId,
    });

    // 会话过期通常不需要特殊处理
    // 可以用于清理临时数据或发送提醒
  }
}
