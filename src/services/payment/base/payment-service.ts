/**
 * 支付服务抽象基类
 * 定义所有支付平台必须实现的接口
 */

import {
  PaymentProvider,
  CreatePaymentSessionRequest,
  CreatePaymentSessionResponse,
  PaymentSession,
  PaymentServiceResponse,
  PaymentConfig,
  CreateBillingPortalSessionRequest,
  CreateBillingPortalSessionResponse,
} from '../types';
import { IWebhookHandler } from './webhook-handler';
import { ISubscriptionManager } from './subscription-manager';

/**
 * 支付平台抽象基类
 */
export abstract class BasePaymentService {
  protected config: PaymentConfig;
  protected provider: PaymentProvider;
  protected webhookHandler!: IWebhookHandler;
  // 没有用到
  protected subscriptionManager!: ISubscriptionManager;

  constructor(config: PaymentConfig) {
    this.config = config;
    this.provider = config.provider;
  }

  /**
   * 获取支付平台类型
   */
  getProvider(): PaymentProvider {
    return this.provider;
  }

  /**
   * 获取 webhook 处理器
   */
  getWebhookHandler(): IWebhookHandler {
    return this.webhookHandler;
  }

  /**
   * 获取订阅管理器
   */
  getSubscriptionManager(): ISubscriptionManager {
    return this.subscriptionManager;
  }

  /**
   * 创建账单会话
   */
  abstract createBillingPortalSession(
    request: CreateBillingPortalSessionRequest
  ): Promise<PaymentServiceResponse<CreateBillingPortalSessionResponse>>;

  /**
   * 创建支付会话
   */
  abstract createPaymentSession(
    request: CreatePaymentSessionRequest
  ): Promise<PaymentServiceResponse<CreatePaymentSessionResponse>>;

  /**
   * 获取支付会话状态
   */
  abstract getPaymentSession(
    sessionId: string
  ): Promise<PaymentServiceResponse<PaymentSession>>;

  /**
   * 取消支付会话
   */
  abstract cancelPaymentSession(
    sessionId: string
  ): Promise<PaymentServiceResponse<void>>;

  /**
   * 验证配置是否正确
   */
  abstract validateConfig(): PaymentServiceResponse<boolean>;

  /**
   * 获取支付平台支持的货币列表
   */
  abstract getSupportedCurrencies(): string[];

  /**
   * 检查是否支持指定货币
   */
  isCurrencySupported(currency: string): boolean {
    return this.getSupportedCurrencies().includes(currency.toLowerCase());
  }

  /**
   * 格式化金额（转换为平台所需的格式）
   */
  abstract formatAmount(amount: number, currency: string): number;

  /**
   * 反向格式化金额（从平台格式转换为标准格式）
   */
  abstract parseAmount(amount: number, currency: string): number;
}