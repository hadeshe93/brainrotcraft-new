/**
 * 支付服务配置管理
 */

import { PaymentProvider, PaymentConfig } from './types';
import { EPaymentErrorCode } from '@/types/services/errors';
import { getStripeConfig } from './providers/stripe';
import { EAppEnv } from '@/types/base/env';

/**
 * 获取支付配置
 */
export function getPaymentConfig(provider: PaymentProvider): {
  success: boolean;
  data?: PaymentConfig;
  errorCode?: EPaymentErrorCode;
  message?: string;
} {
  switch (provider) {
    case PaymentProvider.STRIPE:
      return getStripeConfig();
    
    case PaymentProvider.PAYPAL:
      return {
        success: false,
        errorCode: EPaymentErrorCode.PAYMENT_PROVIDER_NOT_CONFIGURED,
        message: 'PayPal payment provider is not yet implemented',
      };
    
    case PaymentProvider.ALIPAY:
      return {
        success: false,
        errorCode: EPaymentErrorCode.PAYMENT_PROVIDER_NOT_CONFIGURED,
        message: 'Alipay payment provider is not yet implemented',
      };
    
    default:
      return {
        success: false,
        errorCode: EPaymentErrorCode.PAYMENT_PROVIDER_NOT_CONFIGURED,
        message: `Unknown payment provider: ${provider}`,
      };
  }
}

/**
 * 获取支持的支付平台列表
 */
export function getSupportedProviders(): PaymentProvider[] {
  const providers: PaymentProvider[] = [];
  
  // 检查 Stripe 配置
  if (process.env.STRIPE_SECRET_KEY) {
    providers.push(PaymentProvider.STRIPE);
  }
  
  // 未来可以添加其他支付平台的检查
  // if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
  //   providers.push(PaymentProvider.PAYPAL);
  // }
  
  return providers;
}

/**
 * 获取默认支付平台
 */
export function getDefaultProvider(): PaymentProvider {
  const supportedProviders = getSupportedProviders();
  
  if (supportedProviders.length === 0) {
    throw new Error('No payment providers configured');
  }
  
  // 优先级：Stripe > PayPal > Alipay
  if (supportedProviders.includes(PaymentProvider.STRIPE)) {
    return PaymentProvider.STRIPE;
  }
  
  return supportedProviders[0];
}

/**
 * 验证 Webhook 配置
 */
export function validateWebhookConfig(provider: PaymentProvider): boolean {
  const configResult = getPaymentConfig(provider);
  
  if (!configResult.success || !configResult.data) {
    return false;
  }
  
  const config = configResult.data;
  
  // 检查 webhook secret 是否配置
  if (!config.apiKeys.webhookSecret) {
    console.warn(`⚠️  Webhook secret not configured for ${provider}`);
    return false;
  }
  
  return true;
}

/**
 * 获取环境信息（用于调试）
 */
export function getPaymentEnvironmentInfo(): {
  environment: string;
  providers: PaymentProvider[];
  testMode: boolean;
  webhookConfigured: Record<PaymentProvider, boolean>;
} {
  const providers = getSupportedProviders();
  const webhookConfigured: Record<PaymentProvider, boolean> = {} as any;
  
  for (const provider of providers) {
    webhookConfigured[provider] = validateWebhookConfig(provider);
  }
  
  const stripeConfig = getPaymentConfig(PaymentProvider.STRIPE);
  const testMode = stripeConfig.success && 
    stripeConfig.data?.options?.testMode === true;
  
  return {
    environment: process.env.NEXT_PUBLIC_RUNTIME_ENV || EAppEnv.development,
    providers,
    testMode,
    webhookConfigured,
  };
}