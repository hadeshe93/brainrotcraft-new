/**
 * 支付订单创建 API
 * - 处理前端表单提交，正常情况下，创建支付订单成功后返回 303 重定向
 * - 目前本路由和具体支付平台无关，已经抽象出去了，具体在各个支付平台服务中实现
 */
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { getProductConfig, getPrimaryPrice, getPriceByCurrency } from '@/lib/product-config';
import { createPaymentService, getDefaultPaymentProvider } from '@/services/payment/factory';
import { EPaymentErrorCode, ECommonErrorCode } from '@/types/services/errors';
import { getServerLocale, checkIsDefaultLocale } from '@/i18n/utils';
import { createErrorRedirect, createLoginRedirect } from '@/services/base';
import { getEffectiveSubscriptionsFromDB } from '@/services/user/subscription';
import { EAppEnv } from '@/types/base/env';
import { NEXTAUTH_URL } from '@/constants/config';

// 请求参数验证Schema
const checkoutFormSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required'),
  price_id: z.string().optional(),
  // 是否使用人民币支付
  cn_pay: z.string().optional().transform(val => val === 'true'),
});

/**
 * 处理支付订单创建请求
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // 直接返回服务不可用错误
  // return createErrorRedirect(request, ECommonErrorCode.SERVICE_UNAVAILABLE);
  try {
    // 1. 解析表单数据
    const formData = await request.formData();
    const rawData = {
      product_id: formData.get('product_id') as string || '',
      price_id: formData.get('price_id') as string || '',
      cn_pay: formData.get('cn_pay') as string || '',
    };

    // 2. 参数验证
    const validationResult = checkoutFormSchema.safeParse(rawData);
    if (!validationResult.success) {
      console.error('参数验证失败:', validationResult.error);
      return createErrorRedirect(request, EPaymentErrorCode.INVALID_PRODUCT_ID);
    }
    const { product_id, price_id, cn_pay } = validationResult.data;

    // 3. 登录态检查
    const session = await auth();
    if (!session?.user) {
      console.log('登录态检查失败，重定向登录组件');
      return createLoginRedirect(request);
    }
    const user = session.user;
    if (!user.uuid || !user.email) {
      console.error(`用户信息不完整: ${JSON.stringify( { uuid: user.uuid, email: user.email })}`);
      return createErrorRedirect(request, EPaymentErrorCode.INSUFFICIENT_USER_INFO);
    }

    // 3.1 检查是否已有订阅
    const subscriptionsResult = await getEffectiveSubscriptionsFromDB(user.uuid);
    if (!subscriptionsResult.success) {
      console.error(`获取有效订阅失败: ${JSON.stringify(subscriptionsResult)}`);
      return createErrorRedirect(request, subscriptionsResult.errorCode);
    }
    const subscriptions = subscriptionsResult.data;
    const subscripedProductIds = subscriptions.map(subscription => subscription.productUuid);
    if (subscripedProductIds.includes(product_id)) {
      console.error(`用户已存在该产品的订阅: ${product_id}`);
      return createErrorRedirect(request, EPaymentErrorCode.TRY_SUBSCRIBE_SAME_PLAN);
    }
    if (subscripedProductIds.length > 0) {
      console.error(`用户已存在其他订阅`);
      return createErrorRedirect(request, EPaymentErrorCode.TRY_SUBSCRIBE_MULTIPLE_PLANS);
    }

    // 4. 获取产品配置
    const locale = await getServerLocale();
    const productResult = await getProductConfig({ productId: product_id, locale, priceId: price_id });
    if (!productResult.success) {
      console.error(`产品配置检查失败: ${JSON.stringify(productResult)}`);
      return createErrorRedirect(request, productResult.errorCode);
    }

    // 5. 确定支付货币和金额
    const product = productResult.data;
    let pricing;
    
    if (cn_pay) {
      // 用户明确选择中国支付，优先使用 cny
      pricing = getPriceByCurrency(product, 'cny');
      if (!pricing) {
        console.error(`选择了不支持CNY货币的产品: ${product_id}`);
        return createErrorRedirect(request, EPaymentErrorCode.CURRENCY_NOT_SUPPORTED);
      }
    } else {
      // 用户未选择中国支付，使用主要货币（i18n 配置中的首选货币）
      pricing = getPrimaryPrice(product);
      if (!pricing) {
        console.error(`选择了不支持主要货币的产品: ${product_id}`);
        return createErrorRedirect(request, EPaymentErrorCode.CURRENCY_NOT_SUPPORTED);
      }
    }
    

    // 6. 创建支付服务
    const currency = pricing.currency;
    const paymentProvider = getDefaultPaymentProvider();
    const paymentServiceResult = createPaymentService(paymentProvider);
    if (!paymentServiceResult.success) {
      console.error(`支付服务创建失败: ${JSON.stringify(paymentServiceResult)}`);
      return createErrorRedirect(request, paymentServiceResult.errorCode!);
    }

    // 7. 验证货币支持
    const paymentService = paymentServiceResult.data!;
    if (!paymentService.isCurrencySupported(currency)) {
      console.error(`选择了不支持${currency}货币的支付服务: ${paymentProvider}`);
      return createErrorRedirect(request, EPaymentErrorCode.CURRENCY_NOT_SUPPORTED);
    }

    // 8. 构建成功和取消回调URL
    const NEXT_AUTH_URL = NEXTAUTH_URL || 'http://localhost:4004';
    const successUrlObj = new URL(NEXT_AUTH_URL);
    const cancelUrlObj = new URL(NEXT_AUTH_URL);
    const successUrl = (() => {
      successUrlObj.pathname = path.join('/', checkIsDefaultLocale(locale) ? '' : locale, '/payment/success');
      return `${successUrlObj.toString()}?session_id={CHECKOUT_SESSION_ID}`;
    })();
    const cancelUrl = (() => {
      cancelUrlObj.pathname = path.join('/', checkIsDefaultLocale(locale) ? '' : locale, '/payment/cancel');
      return cancelUrlObj.toString();
    })();

    // 9. 创建支付会话
    const sessionResult = await paymentService.createPaymentSession({
      product,
      user: {
        id: user.uuid!,
        email: user.email!,
        name: user.name || '',
      },
      payment: {
        amount: pricing.amount,
        currency,
      },
      urls: {
        success: successUrl,
        cancel: cancelUrl,
      },
      metadata: {
        userId: user.uuid!,
        productId: product_id,
        productName: product.name,
        paymentMethod: currency,
        environment: process.env.NEXT_PUBLIC_RUNTIME_ENV || EAppEnv.development,
      },
    });

    if (!sessionResult.success) {
      console.error(`支付会话创建失败: ${JSON.stringify(sessionResult)}`);
      return createErrorRedirect(
        request, 
        sessionResult.errorCode || EPaymentErrorCode.PAYMENT_FAILED
      );
    }

    // 10. 成功创建会话，重定向到支付页面
    console.log(`支付会话创建成功: ${JSON.stringify({
      sessionId: sessionResult.data!.sessionId,
      userId: user.uuid,
      productId: product_id,
      amount: pricing.amount,
      currency: currency,
    })}`);

    return NextResponse.redirect(sessionResult.data!.redirectUrl, { status: 303 });

  } catch (error) {
    console.error(`支付订单创建异常: ${JSON.stringify(error)}`);
    return createErrorRedirect(request, EPaymentErrorCode.PAYMENT_FAILED);
  }
}


/**
 * 健康检查端点 (GET请求)
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    service: 'payment-checkout',
    timestamp: new Date().toISOString(),
  });
}