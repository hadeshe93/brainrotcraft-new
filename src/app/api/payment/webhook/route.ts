/**
 * 支付平台 Webhook 处理端点
 * - 处理 Stripe 支付平台发送的支付事件通知，包括订阅生命周期事件
 * - 路由逻辑中仅获取签名头的部分和 Stripe 相关
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getCloudflareEnv } from '@/services/base';
import { createPaymentService, getDefaultPaymentProvider } from '@/services/payment/factory';

/**
 * 处理 Stripe Webhook 请求
 *
 * 主要处理的事件类型：
 * - checkout.session.completed: 支付会话完成
 * - customer.subscription.created: 订阅创建
 * - customer.subscription.updated: 订阅更新
 * - customer.subscription.deleted: 订阅取消
 * - invoice.payment_succeeded: 订阅续费成功
 * - invoice.payment_failed: 订阅续费失败
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. 获取原始请求体和签名
    const rawBody = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('缺少 Stripe 签名头');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // 2. 创建支付服务
    const paymentProvider = getDefaultPaymentProvider();
    const paymentServiceResult = createPaymentService(paymentProvider);
    if (!paymentServiceResult.success) {
      console.error(`支付服务创建失败: ${JSON.stringify(paymentServiceResult)}`);
      return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 });
    }
    const paymentService = paymentServiceResult.data!;

    // 4. 验证和解析 webhook 事件
    const webhookHandler = paymentService.getWebhookHandler();
    const isValidSignature = await webhookHandler.verifySignature(rawBody, signature);
    if (!isValidSignature) {
      console.error('Webhook 签名验证失败');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }
    const webhookEvent = await webhookHandler.parseEvent(rawBody, signature);

    // 5. 记录事件信息
    console.log(
      `Webhook 事件接收: ${JSON.stringify({
        eventId: webhookEvent.id,
        eventType: webhookEvent.type,
        sessionId: webhookEvent.sessionId,
        provider: webhookEvent.provider,
      })}`,
    );

    // 6. 获取数据库实例
    const env = await getCloudflareEnv();
    const db = env.DB;

    // 7. 处理事件（异步处理，避免阻塞响应）
    try {
      await webhookHandler.handleEvent(webhookEvent, db);

      console.log(
        `Webhook 事件处理成功: ${JSON.stringify({
          eventId: webhookEvent.id,
          eventType: webhookEvent.type,
        })}`,
      );
    } catch (processingError: any) {
      const message = `Webhook 事件处理失败: ${JSON.stringify({
        eventId: webhookEvent.id,
        eventType: webhookEvent.type,
        error: processingError.message,
      })}`;
      console.error(message);

      // 对于关键事件，可以考虑返回错误状态码触发重试
      // 这里可以根据事件类型决定是否重试
      return NextResponse.json({ error: message }, { status: 500 });
    }

    // 8. 返回成功响应
    return NextResponse.json({ received: true, eventId: webhookEvent.id }, { status: 200 });
  } catch (error) {
    const message = `Webhook 处理异常: ${JSON.stringify(error)}`;
    console.error(message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 健康检查端点
 */
export async function GET(): Promise<NextResponse> {
  const paymentProvider = getDefaultPaymentProvider();
  const paymentServiceResult = createPaymentService(paymentProvider);

  const serviceAvailable = paymentServiceResult.success;
  const webhookConfigured = serviceAvailable && paymentServiceResult.data?.validateConfig().success;

  return NextResponse.json({
    status: serviceAvailable ? 'ok' : 'degraded',
    service: 'payment-webhook',
    provider: paymentProvider,
    webhookConfigured: webhookConfigured || false,
    timestamp: new Date().toISOString(),
  });
}
