/**
 * Stripe 特定的类型定义
 */

import Stripe from 'stripe';
import { WebhookEventType } from '../../types';
/**
 * Stripe 配置类型
 */
export interface StripeConfig {
  secretKey: string;
  publicKey?: string;
  webhookSecret?: string;
  apiVersion?: string;
}

/**
 * Stripe 事件映射
 * 
 * 简化后的核心事件：
 * - checkout.session.completed: 处理首次支付（一次性购买 + 订阅首次）
 * - customer.subscription.updated: 处理续费和订阅状态变更
 * - invoice.payment_failed: 处理订阅续费失败
 * - 其他事件: 用于状态管理和错误处理
 */
export const STRIPE_EVENT_MAPPING = {
  'checkout.session.completed': WebhookEventType.PAYMENT_SUCCESS,
  'checkout.session.expired': WebhookEventType.SESSION_EXPIRED,
  'customer.subscription.created': WebhookEventType.SUBSCRIPTION_CREATED,
  'customer.subscription.updated': WebhookEventType.SUBSCRIPTION_UPDATED,
  'customer.subscription.deleted': WebhookEventType.SUBSCRIPTION_DELETED,
  'invoice.payment_failed': WebhookEventType.PAYMENT_FAILED,
} as const;

/**
 * Stripe 支持的货币列表
 */
export const STRIPE_SUPPORTED_CURRENCIES = [
  'usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 'cny', 'hkd'
] as const;

/**
 * 零小数位货币列表
 */
export const STRIPE_ZERO_DECIMAL_CURRENCIES = [
  'jpy', 'krw', 'pyg', 'vnd'
] as const;

/**
 * Stripe 会话创建参数类型
 */
export interface StripeSessionParams extends Stripe.Checkout.SessionCreateParams {
  metadata: {
    userId: string;
    productId: string;
    credits: string;
    validMonths: string;
    paymentMode: string;
    [key: string]: string;
  };
}