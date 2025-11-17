/**
 * Stripe 工具函数
 */

import { PaymentStatus, WebhookEventType, PaymentProvider, WebhookEvent } from '../../types';
import { STRIPE_EVENT_MAPPING, STRIPE_ZERO_DECIMAL_CURRENCIES } from './types';
import Stripe from 'stripe';

/**
 * 将 Stripe 状态映射为通用支付状态
 */
export function mapStripeStatusToPaymentStatus(stripeStatus: string): PaymentStatus {
  switch (stripeStatus) {
    case 'open':
      return PaymentStatus.PENDING;
    case 'complete':
      return PaymentStatus.SUCCESS;
    case 'expired':
      return PaymentStatus.EXPIRED;
    default:
      return PaymentStatus.FAILED;
  }
}

/**
 * 将 Stripe 事件映射为通用 Webhook 事件类型
 */
export function mapStripeEventType(stripeEventType: string): WebhookEventType {
  return STRIPE_EVENT_MAPPING[stripeEventType as keyof typeof STRIPE_EVENT_MAPPING] || WebhookEventType.IGNORE;
}

/**
 * 将 Stripe 事件转换为通用 Webhook 事件
 */
export function convertStripeEventToWebhookEvent(stripeEvent: Stripe.Event): WebhookEvent {
  return {
    id: stripeEvent.id,
    type: mapStripeEventType(stripeEvent.type),
    provider: PaymentProvider.STRIPE,
    sessionId: extractSessionIdFromStripeEvent(stripeEvent),
    data: stripeEvent.data.object,
    timestamp: stripeEvent.created * 1000,
  };
}

/**
 * 从 Stripe 事件中提取真正的 sessionId
 * 
 * 简化逻辑：只有 checkout.session 事件才有真正的 sessionId
 */
function extractSessionIdFromStripeEvent(stripeEvent: Stripe.Event): string | null {
  const eventType = stripeEvent.type;
  const dataObject = stripeEvent.data.object as unknown as Record<string, unknown>;

  // 只有 Session 相关事件才有真正的 sessionId
  if (eventType.startsWith('checkout.session.')) {
    return (dataObject.id as string) || null;
  }

  // 其他所有事件都没有 sessionId（订阅、发票等有自己的 ID）
  return null;
}

/**
 * 格式化金额（转换为 Stripe 最小单位）
 */
export function formatAmountForStripe(amount: number, currency: string): number {
  if (STRIPE_ZERO_DECIMAL_CURRENCIES.includes(currency.toLowerCase() as (typeof STRIPE_ZERO_DECIMAL_CURRENCIES)[number])) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

/**
 * 解析金额（从 Stripe 最小单位转换为标准单位）
 */
export function parseAmountFromStripe(amount: number, currency: string): number {
  if (STRIPE_ZERO_DECIMAL_CURRENCIES.includes(currency.toLowerCase() as (typeof STRIPE_ZERO_DECIMAL_CURRENCIES)[number])) {
    return amount;
  }
  return amount / 100;
}

/**
 * 验证 Stripe 密钥格式
 */
export function validateStripeKey(key: string, keyType: 'secret' | 'public' | 'webhook'): boolean {
  const patterns = {
    secret: /^sk_(test_|live_)?[a-zA-Z0-9]{24,}$/,
    public: /^pk_(test_|live_)?[a-zA-Z0-9]{24,}$/,
    webhook: /^whsec_[a-zA-Z0-9]{32,}$/,
  };
  
  return patterns[keyType].test(key);
}

/**
 * 检查是否为测试模式
 */
export function isTestMode(secretKey: string): boolean {
  return secretKey.includes('test');
}

/**
 * 生成订单号
 */
export function generateOrderNumber(): string {
  return `ORD${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}