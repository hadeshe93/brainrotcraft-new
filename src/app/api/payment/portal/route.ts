/**
 * 创建门户会话 API
 * - 目前本路由和具体支付平台无关，已经抽象出去了，具体在各个支付平台服务中实现
 */

import { NextRequest, NextResponse } from 'next/server';
import { type PortalSessionRequest } from '@/types/services/payment';
import { createPaymentService, getDefaultPaymentProvider } from '@/services/payment/factory';
import { createLoginRedirect, createErrorRedirect } from '@/services/base';
import { auth } from '@/auth';
import { EPaymentErrorCode } from '@/types/services/errors';
import { DOMAIN, NEXTAUTH_URL } from '@/constants/config';

/**
 * 创建门户会话，让用户可以管理自己的订阅和支付方式
 * @param request
 * @returns
 */
export async function POST(request: NextRequest) {
  const refererUrl = request.headers.get('referer') || NEXTAUTH_URL || `https://${DOMAIN}/`;
  try {
    // 登录态检查
    const session = await auth();
    if (!session?.user) {
      console.log('User not authenticated, redirecting to login');
      return createLoginRedirect(request);
    }

    // 解析请求参数
    const queryText = await request.text();
    const query = parseQueryText(queryText) as PortalSessionRequest;

    // 创建支付服务
    const paymentProvider = getDefaultPaymentProvider();
    const paymentServiceResult = createPaymentService(paymentProvider);
    if (!paymentServiceResult.success) {
      console.error('Payment service creation failed:', paymentServiceResult);
      return createErrorRedirect(request, paymentServiceResult.errorCode!);
    }
    const paymentService = paymentServiceResult.data!;

    // 创建门户会话
    const result = await paymentService.createBillingPortalSession({
      ...query,
      returnUrl: refererUrl,
    });
    if (!result.success) {
      return createErrorRedirect(request, result.errorCode!);
    }

    return NextResponse.redirect(result.data?.redirectUrl || '', { status: 303 });
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    return createErrorRedirect(request, EPaymentErrorCode.PORTAL_SESSION_CREATE_FAILED);
  }
}

function parseQueryText(text: string): Record<string, string> {
  return text.split('&').reduce(
    (map, item) => {
      const [key, value] = item.split('=');
      map[key] = decodeURIComponent(value);
      return map;
    },
    {} as Record<string, string>,
  );
}
