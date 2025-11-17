/**
 * 支付平台服务工厂
 * 根据配置创建对应的支付服务实例
 */

import { BasePaymentService } from './base/payment-service';
import {
  PaymentProvider,
  PaymentConfig,
  PaymentServiceResponse,
} from './types';
import { EPaymentErrorCode } from '@/types/services/errors';
import { getPaymentConfig as getConfig, getSupportedProviders, getDefaultProvider } from './config';

// 导入支付服务实现
import { StripePaymentService } from './providers/stripe';

/**
 * 支付服务工厂实现
 */
export class DefaultPaymentServiceFactory {
  /**
   * 创建支付服务实例
   * @param config 支付配置
   * @returns 支付服务实例
   */
  createPaymentService(config: PaymentConfig): BasePaymentService {
    switch (config.provider) {
      case PaymentProvider.STRIPE:
        return new StripePaymentService(config);
      
      case PaymentProvider.PAYPAL:
        throw new Error(`Payment provider ${config.provider} is not implemented yet`);
      
      case PaymentProvider.ALIPAY:
        throw new Error(`Payment provider ${config.provider} is not implemented yet`);
      
      default:
        throw new Error(`Unsupported payment provider: ${config.provider}`);
    }
  }

  /**
   * 获取支持的支付平台列表
   * @returns 支持的平台列表
   */
  getSupportedProviders(): PaymentProvider[] {
    return [
      PaymentProvider.STRIPE,
      // PaymentProvider.PAYPAL,  // 预留
      // PaymentProvider.ALIPAY,  // 预留
    ];
  }
}

// 全局工厂实例
const paymentServiceFactory = new DefaultPaymentServiceFactory();

/**
 * 创建支付服务实例的便捷函数
 * @param provider 支付平台类型
 * @returns 支付服务创建结果
 */
export function createPaymentService(
  provider: PaymentProvider
): PaymentServiceResponse<BasePaymentService> {
  try {
    // 验证是否支持该平台
    if (!paymentServiceFactory.getSupportedProviders().includes(provider)) {
      return {
        success: false,
        errorCode: EPaymentErrorCode.PAYMENT_PROVIDER_NOT_CONFIGURED,
        message: `Unsupported payment provider: ${provider}`,
      };
    }

    // 根据平台类型获取配置
    const configResult = getPaymentConfig(provider);
    if (!configResult.success) {
      return {
        success: false,
        errorCode: configResult.errorCode,
        message: configResult.message,
      };
    }

    // 创建服务实例
    const service = paymentServiceFactory.createPaymentService(configResult.data!);
    
    // 验证配置
    const validation = service.validateConfig();
    if (!validation.success) {
      return {
        success: false,
        errorCode: validation.errorCode,
        message: validation.message,
      };
    }

    return {
      success: true,
      data: service,
    };
  } catch (error) {
    console.error('Error creating payment service:', error);
    return {
      success: false,
      errorCode: EPaymentErrorCode.PAYMENT_PROVIDER_NOT_CONFIGURED,
      message: `Failed to create payment service for ${provider}`,
    };
  }
}

/**
 * 根据支付平台类型获取配置
 * @param provider 支付平台类型
 * @returns 支付配置
 */
function getPaymentConfig(
  provider: PaymentProvider
): PaymentServiceResponse<PaymentConfig> {
  return getConfig(provider);
}

/**
 * 获取默认支付平台
 * 目前默认使用Stripe
 */
export function getDefaultPaymentProvider(): PaymentProvider {
  return getDefaultProvider();
}

/**
 * 获取支持的支付平台列表
 */
export function getSupportedPaymentProviders(): PaymentProvider[] {
  return getSupportedProviders();
}

// 导出工厂实例
export default paymentServiceFactory;