/**
 * 支付服务相关类型定义
 */

import { EPaymentErrorCode } from '@/types/services/errors';
import { PortalSessionRequest } from '@/types/services/payment';
import { ProductInfo } from '@/types/product';

// 支付平台类型
export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal', // 预留，暂未实现
  ALIPAY = 'alipay', // 预留，暂未实现
}

// 支付会话创建请求参数
export interface CreatePaymentSessionRequest {
  // 产品信息
  product: ProductInfo;
  
  // 用户信息
  user: {
    id: string;
    email: string;
    name?: string;
  };
  
  // 支付信息
  payment: {
    amount: number;
    currency: string;
  };
  
  // 回调URLs
  urls: {
    success: string;
    cancel: string;
  };
  
  // 额外元数据
  metadata?: Record<string, string>;
}

export interface CreateBillingPortalSessionRequest extends PortalSessionRequest {
  returnUrl: string;
}

// 账单管理会话创建请求
export interface CreateBillingPortalSessionResponse {
  // 重定向URL（用户需要跳转到的支付页面）
  redirectUrl: string;
}

// 支付会话创建响应
export interface CreatePaymentSessionResponse {
  // 会话ID
  sessionId: string;
  
  // 重定向URL（用户需要跳转到的支付页面）
  redirectUrl: string;
  
  // 会话过期时间
  expiresAt: number;
  
  // 平台特定的额外信息
  platformData?: Record<string, any>;
}

// 支付模式
export enum PaymentMode {
  PAYMENT = 'payment',           // 一次性付款
  SUBSCRIPTION = 'subscription', // 订阅付款
}

// 支付结果状态
export enum PaymentStatus {
  PENDING = 'pending',           // 等待支付
  PROCESSING = 'processing',     // 处理中
  SUCCESS = 'success',          // 支付成功
  FAILED = 'failed',            // 支付失败
  CANCELLED = 'cancelled',      // 用户取消
  REFUNDED = 'refunded',        // 已退款
  EXPIRED = 'expired',          // 已过期
}

// 支付会话信息
export interface PaymentSession {
  id: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  currency: string;
  productId: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  metadata?: Record<string, string>;
  platformData?: Record<string, any>;
}

// 支付服务响应基础类型
export interface PaymentServiceResponse<T = any> {
  success: boolean;
  data?: T;
  errorCode?: EPaymentErrorCode;
  message?: string;
}

// Webhook事件类型
export enum WebhookEventType {
  IGNORE = 'ignore',
  PAYMENT_SUCCESS = 'payment.success',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_CANCELLED = 'payment.cancelled',
  SESSION_EXPIRED = 'session.expired',
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_DELETED = 'subscription.deleted',
}

// Webhook事件数据
export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  provider: PaymentProvider;
  sessionId: string | null;
  data: Record<string, any>;
  timestamp: number;
}

// 支付配置
export interface PaymentConfig {
  provider: PaymentProvider;
  apiKeys: {
    publicKey?: string;
    secretKey: string;
    webhookSecret?: string;
  };
  endpoints?: {
    webhook?: string;
    success?: string;
    cancel?: string;
  };
  options?: Record<string, any>;
}