/**
 * Fetch API 认证工具
 * 用于验证子站点请求母站点数据时的 API Key
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkIsDevEnv } from './env';
import { addCorsHeaders } from './fetch-cors';

/**
 * 验证 API Key
 * 从请求头中获取 X-API-Key 并验证
 */
export async function validateApiKey(request: NextRequest): Promise<NextResponse | null> {
  const apiKey = request.headers.get('X-API-Key');
  const validKey = process.env.FETCH_API_KEY;
  const origin = request.headers.get('origin');

  // 开发环境可以跳过验证
  if (process.env.NODE_ENV === 'development' && !validKey) {
    console.warn('[Fetch API] Running in development mode without API key validation');
    return null;
  }

  if (!validKey) {
    const response = NextResponse.json(
      {
        success: false,
        error: 'API key not configured on server',
        code: 'SERVER_CONFIG_ERROR',
      },
      { status: 500 },
    );
    return addCorsHeaders(response, origin);
  }

  if (!apiKey || apiKey !== validKey) {
    const response = NextResponse.json(
      {
        success: false,
        error: 'Unauthorized: Invalid or missing API key',
        code: 'UNAUTHORIZED',
      },
      { status: 401 },
    );
    return addCorsHeaders(response, origin);
  }

  return null;
}

/**
 * 创建标准的 Fetch API 响应（带 CORS 头）
 */
export function createFetchResponse<T>(data: T[], total?: number, request?: NextRequest) {
  const response = NextResponse.json({
    success: true,
    data,
    total: total ?? data.length,
    timestamp: new Date().toISOString(),
  });

  if (request) {
    const origin = request.headers.get('origin');
    return addCorsHeaders(response, origin);
  }

  return response;
}

/**
 * 创建错误响应（带 CORS 头）
 */
export function createFetchError(message: string, status = 500, request?: NextRequest) {
  const response = NextResponse.json(
    {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    },
    { status },
  );

  if (request) {
    const origin = request.headers.get('origin');
    return addCorsHeaders(response, origin);
  }

  return response;
}
