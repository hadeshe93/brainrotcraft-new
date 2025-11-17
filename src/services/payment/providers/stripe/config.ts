import { PaymentProvider, PaymentConfig } from '../../types';
import { EPaymentErrorCode } from '@/types/services/errors';

/**
* 获取 Stripe 配置
*/
export function getStripeConfig(): {
 success: boolean;
 data?: PaymentConfig;
 errorCode?: EPaymentErrorCode;
 message?: string;
} {
 const secretKey = process.env.STRIPE_SECRET_KEY;
 const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
 const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

 if (!secretKey) {
   return {
     success: false,
     errorCode: EPaymentErrorCode.PAYMENT_KEYS_MISSING,
     message: 'STRIPE_SECRET_KEY environment variable is not set',
   };
 }

 // 验证密钥格式
 if (!secretKey.startsWith('sk_')) {
   return {
     success: false,
     errorCode: EPaymentErrorCode.PAYMENT_KEYS_MISSING,
     message: 'Invalid STRIPE_SECRET_KEY format',
   };
 }

 // Webhook secret 是可选的，但在生产环境强烈建议配置
 if (!webhookSecret && process.env.NEXT_PUBLIC_RUNTIME_ENV === 'production') {
   console.warn('⚠️  STRIPE_WEBHOOK_SECRET is not configured. Webhook signature verification will be disabled.');
 }

 return {
   success: true,
   data: {
     provider: PaymentProvider.STRIPE,
     apiKeys: {
       publicKey,
       secretKey,
       webhookSecret,
     },
     endpoints: {
       webhook: '/api/payment/webhook',
       success: '/payment/success',
       cancel: '/payment/cancel',
     },
     options: {
       // Stripe 特定配置
       apiVersion: '2025-09-30.clover',
      //  apiVersion: '2025-08-27.basil',
       typescript: true,
       // 测试模式检测
       testMode: secretKey.startsWith('sk_test_'),
     },
   },
 };
}