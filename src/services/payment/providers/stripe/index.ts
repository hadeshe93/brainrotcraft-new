/**
 * Stripe 支付服务主类
 * 集成所有 Stripe 相关功能
 */

import { BasePaymentService } from '../../base/payment-service';
import {
  PaymentProvider,
  CreatePaymentSessionRequest,
  CreatePaymentSessionResponse,
  PaymentSession,
  PaymentServiceResponse,
  PaymentConfig,
  PaymentMode,
  PaymentStatus,
  CreateBillingPortalSessionRequest,
  CreateBillingPortalSessionResponse,
} from '../../types';
import { StripeWebhookHandler } from './webhook-handler';
import { StripeSubscriptionManager } from './subscription-manager';
import { STRIPE_SUPPORTED_CURRENCIES, StripeSessionParams } from './types';
import {
  formatAmountForStripe,
  parseAmountFromStripe,
  mapStripeStatusToPaymentStatus,
  validateStripeKey,
  isTestMode,
} from './utils';
import { EPaymentErrorCode } from '@/types/services/errors';
import Stripe from 'stripe';
import { DEVELOPER_EMAIL_WHITELIST, DEVELOPER_PRODUCT_AMOUNT_USD } from '@/constants/config';

/**
 * Stripe 支付服务实现
 */
export class StripePaymentService extends BasePaymentService {
  private stripe!: Stripe;

  constructor(config: PaymentConfig) {
    super(config);
    this.initializeStripe();
    this.initializeHandlers();
  }

  /**
   * 初始化 Stripe 客户端
   */
  private initializeStripe() {
    try {
      this.stripe = new Stripe(this.config.apiKeys.secretKey, {
        apiVersion: this.config.options?.apiVersion,
        typescript: this.config.options?.typescript,
        httpClient: Stripe.createFetchHttpClient(),
        maxNetworkRetries: 3,
      });
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      throw new Error(`Stripe initialization failed: ${error}`);
    }
  }

  /**
   * 初始化处理器
   */
  private initializeHandlers() {
    const webhookSecret = this.config.apiKeys.webhookSecret || '';
    this.webhookHandler = new StripeWebhookHandler(this.stripe, webhookSecret);
    this.subscriptionManager = new StripeSubscriptionManager();
  }

  /**
   * 创建账单会话
   */
  async createBillingPortalSession(
    request: CreateBillingPortalSessionRequest,
  ): Promise<PaymentServiceResponse<CreateBillingPortalSessionResponse>> {
    try {
      let customerId = request.customerId || '';
      const subscriptionId = request.subscriptionId || '';
      const sessionId = request.sessionId || '';
      try {
        if (!customerId && subscriptionId) {
          const session = await this.stripe.subscriptions.retrieve(subscriptionId);
          customerId = session.customer as string;
        } else if (!customerId && sessionId) {
          const session = await this.stripe.checkout.sessions.retrieve(sessionId);
          customerId = session.customer as string;
        }
      } catch (error: any) {
        console.error('Failed to retrieve Stripe customer ID:', error);
        return {
          success: false,
          errorCode: EPaymentErrorCode.GET_PLATFORM_CUSTOMER_ID_FAILED,
          message: error.message || 'Failed to retrieve Stripe customer ID',
        };
      }

      const portalSession = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: request.returnUrl,
      });
      return {
        success: true,
        data: {
          redirectUrl: portalSession.url,
        },
      };
    } catch (error: any) {
      console.error('❌ Stripe billing portal session creation failed:', error);
      return {
        success: false,
        errorCode: EPaymentErrorCode.PORTAL_SESSION_CREATE_FAILED,
        message: error.message || 'Failed to create Stripe payment session',
      };
    }
  }

  /**
   * 创建支付会话
   */
  async createPaymentSession(
    request: CreatePaymentSessionRequest,
  ): Promise<PaymentServiceResponse<CreatePaymentSessionResponse>> {
    try {
      // 根据产品配置判断支付模式：一次性支付模式还是订阅支付模式
      const paymentMode = this.determinePaymentMode(request.product);

      // 格式化金额
      const userEmail = request.user.email;
      const isDeveloper = DEVELOPER_EMAIL_WHITELIST.includes(userEmail);
      const amountRaw = isDeveloper ? DEVELOPER_PRODUCT_AMOUNT_USD : request.payment.amount;
      const amount = this.formatAmount(amountRaw, request.payment.currency);

      // 构建基础会话参数
      const baseSessionParams = {
        payment_method_types: ['card'],
        success_url: request.urls.success,
        cancel_url: request.urls.cancel,
        customer_email: userEmail,
        metadata: {
          userId: request.user.id,
          productId: request.product.id,
          credits: request.product.credits.toString(),
          validMonths: request.product.validMonths.toString(),
          paymentMode,
          ...request.metadata,
        },
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30分钟过期
      };

      // 根据支付模式构建不同的会话参数
      const sessionParams: StripeSessionParams =
        paymentMode === PaymentMode.SUBSCRIPTION
          ? this.buildSubscriptionSessionParams(baseSessionParams, request, amount)
          : this.buildPaymentSessionParams(baseSessionParams, request, amount);

      const session = await this.stripe.checkout.sessions.create({
        ...sessionParams,
      });

      return {
        success: true,
        data: {
          sessionId: session.id,
          redirectUrl: session.url!,
          expiresAt: session.expires_at! * 1000,
          platformData: {
            stripeSessionId: session.id,
            paymentMode,
          },
        },
      };
    } catch (error: any) {
      console.error('Stripe session creation failed:', error);
      return {
        success: false,
        errorCode: EPaymentErrorCode.STRIPE_SESSION_CREATE_FAILED,
        message: error.message || 'Failed to create Stripe payment session',
      };
    }
  }

  /**
   * 获取支付会话状态
   */
  async getPaymentSession(sessionId: string): Promise<PaymentServiceResponse<PaymentSession>> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      return {
        success: true,
        data: {
          id: session.id,
          provider: PaymentProvider.STRIPE,
          status: mapStripeStatusToPaymentStatus(session.status!),
          amount: this.parseAmount(session.amount_total!, session.currency!),
          currency: session.currency!,
          productId: session.metadata?.productId || '',
          userId: session.metadata?.userId || '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt: session.expires_at! * 1000,
          metadata: session.metadata || {},
          platformData: {
            stripeSessionId: session.id,
          },
        },
      };
    } catch (error: any) {
      console.error('Failed to retrieve Stripe session:', error);
      return {
        success: false,
        errorCode: EPaymentErrorCode.STRIPE_API_ERROR,
        message: error.message || 'Failed to retrieve payment session',
      };
    }
  }

  /**
   * 取消支付会话
   */
  async cancelPaymentSession(sessionId: string): Promise<PaymentServiceResponse<void>> {
    try {
      await this.stripe.checkout.sessions.expire(sessionId);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to cancel Stripe session:', error);
      return {
        success: false,
        errorCode: EPaymentErrorCode.STRIPE_API_ERROR,
        message: error.message || 'Failed to cancel payment session',
      };
    }
  }

  /**
   * 验证配置
   */
  validateConfig(): PaymentServiceResponse<boolean> {
    const { secretKey } = this.config.apiKeys;

    if (!secretKey) {
      return {
        success: false,
        errorCode: EPaymentErrorCode.PAYMENT_KEYS_MISSING,
        message: 'Stripe secret key is required',
      };
    }

    if (!validateStripeKey(secretKey, 'secret')) {
      return {
        success: false,
        errorCode: EPaymentErrorCode.PAYMENT_KEYS_MISSING,
        message: 'Invalid Stripe secret key format',
      };
    }

    return { success: true, data: true };
  }

  /**
   * 获取支持的货币列表
   */
  getSupportedCurrencies(): string[] {
    return [...STRIPE_SUPPORTED_CURRENCIES];
  }

  /**
   * 格式化金额
   */
  formatAmount(amount: number, currency: string): number {
    return formatAmountForStripe(amount, currency);
  }

  /**
   * 解析金额
   */
  parseAmount(amount: number, currency: string): number {
    return parseAmountFromStripe(amount, currency);
  }

  /**
   * 检查是否为测试模式
   */
  isTestMode(): boolean {
    return isTestMode(this.config.apiKeys.secretKey);
  }

  /**
   * 根据产品配置判断支付模式
   */
  private determinePaymentMode(product: any): PaymentMode {
    if (product.interval && ['month', 'year'].includes(product.interval)) {
      return PaymentMode.SUBSCRIPTION;
    }
    return PaymentMode.PAYMENT;
  }

  /**
   * 构建一次性付款会话参数
   */
  private buildPaymentSessionParams(
    baseParams: any,
    request: CreatePaymentSessionRequest,
    amount: number,
  ): StripeSessionParams {
    return {
      ...baseParams,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: request.payment.currency,
            product_data: {
              name: request.product.name,
              description: request.product.description,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
    };
  }

  /**
   * 构建订阅付款会话参数
   */
  private buildSubscriptionSessionParams(
    baseParams: any,
    request: CreatePaymentSessionRequest,
    amount: number,
  ): StripeSessionParams {
    const intervalRaw = request.product.interval;
    const interval = ['month', 'year'].includes(intervalRaw) ? intervalRaw : 'month';

    return {
      ...baseParams,
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: request.payment.currency,
            product_data: {
              name: request.product.name,
              description: request.product.description,
            },
            unit_amount: amount,
            recurring: {
              interval,
            },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          productId: request.product.id,
          credits: request.product.credits.toString(),
          validMonths: request.product.validMonths.toString(),
        },
      },
    };
  }
}

// 导出便于使用
export { StripeWebhookHandler, StripeSubscriptionManager };
export * from './types';
export * from './utils';
export * from './config';
