import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * 创建登录重定向响应
 */
export function createLoginRedirect(request: NextRequest): NextResponse {
  const refererUrl = request.headers.get('referer') || '/';
  const redirectUrl = new URL(refererUrl);
  
  // 添加需要登录的查询参数
  redirectUrl.searchParams.set('needLogin', '1');
  
  console.log('Redirecting to login:', redirectUrl.toString());
  return NextResponse.redirect(redirectUrl.toString(), { status: 302 });
}

/**
 * 创建错误重定向响应
 */
export function createErrorRedirect<TErrorCode extends string | number>(request: NextRequest, errorCode: TErrorCode): NextResponse {
  const refererUrl = request.headers.get('referer') || '/';
  const redirectUrl = new URL(refererUrl);
  
  // 添加错误码查询参数
  redirectUrl.searchParams.set('errorCode', errorCode.toString());
  
  console.log('Redirecting with error:', {
    errorCode,
    redirectUrl: redirectUrl.toString(),
  });
  
  return NextResponse.redirect(redirectUrl.toString(), { status: 302 });
}

let cachedEnv: CloudflareEnv;
export function setCachedEnv(env: CloudflareEnv) {
  cachedEnv = env;
}
export async function getCloudflareEnv() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env;
  } catch (error) {
    console.error('getCloudflareEnv 异常，改用 cloudflare:workers 来引入 env');
    return cachedEnv!;
  }
}
