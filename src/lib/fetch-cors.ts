/**
 * Fetch API CORS 处理工具
 * 用于母站点为子站点提供数据时的跨域处理
 */

import { NextRequest, NextResponse } from 'next/server';
import { CHILD_SITE_WHITELIST } from '@/constants/config';

/**
 * 检查请求来源是否在白名单中
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  // 检查是否在白名单中
  return CHILD_SITE_WHITELIST.some((allowedOrigin) => {
    // 精确匹配
    if (origin === allowedOrigin) return true;

    // 支持通配符子域名（例如：*.example.com）
    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }

    return false;
  });
}

/**
 * 为响应添加 CORS 头
 */
export function addCorsHeaders(response: NextResponse, origin: string | null): NextResponse {
  if (origin && isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }

  return response;
}
