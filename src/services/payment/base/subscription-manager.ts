/**
 * 订阅管理器抽象接口
 * 定义所有支付平台订阅管理器必须实现的接口
 */

import { PaymentProvider } from '../types';

export interface SubscriptionInfo {
  subscriptionId: string;
  userId: string;
  productId: string;
  status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing';
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
}

/**
 * 订阅管理器接口
 */
export interface ISubscriptionManager {
  /**
   * 检查是否能处理指定的支付提供商
   */
  canHandle(provider: PaymentProvider): boolean;

  /**
   * 获取用户的当前订阅状态
   */
  getUserSubscription(userId: string, db: D1Database): Promise<SubscriptionInfo | null>;

  /**
   * 检查用户是否有有效订阅
   */
  hasActiveSubscription(userId: string, db: D1Database): Promise<boolean>;

  /**
   * 获取用户的可用积分
   */
  getUserCredits(userId: string, db: D1Database): Promise<number>;

  /**
   * 为订阅续费添加积分
   */
  addSubscriptionCredits(
    userId: string,
    credits: number,
    subscriptionId: string,
    validMonths: number,
    db: D1Database,
    sourceOrderId?: string
  ): Promise<void>;

  /**
   * 处理订阅取消
   */
  handleSubscriptionCancellation(
    subscriptionId: string,
    db: D1Database,
    cancelImmediately?: boolean
  ): Promise<void>;

  /**
   * 处理支付失败的宽限期
   */
  handlePaymentFailureGracePeriod(
    subscriptionId: string,
    db: D1Database,
    gracePeriodDays?: number
  ): Promise<void>;

  /**
   * 获取订阅的产品信息
   */
  getSubscriptionProduct(subscriptionId: string, db: D1Database): Promise<{
    productId: string;
    productName: string;
    credits: number;
    price: number;
    cycle: 'monthly' | 'yearly' | null;
  } | null>;

  /**
   * 检查并处理过期的订阅
   */
  checkAndHandleExpiredSubscriptions(db: D1Database): Promise<void>;
}