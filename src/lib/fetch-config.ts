import { checkIsDevEnv } from './env';
import { DOMAIN } from '@/constants/config';

/**
 * 客户端 Fetch 配置工具
 * 用于前端组件获取母站点配置信息
 */

export interface ParentSiteConfig {
  parentSiteUrl: string;
  apiKey: string;
  useMock: boolean;
}

/**
 * 获取母站点配置（客户端版本）
 */
export function getParentSiteConfig(): ParentSiteConfig {
  const parentSiteUrl = process.env.NEXT_PUBLIC_PARENT_SITE_URL || process.env.PARENT_SITE_URL;
  const apiKey = process.env.NEXT_PUBLIC_PARENT_API_KEY || process.env.PARENT_API_KEY;
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

  return {
    parentSiteUrl: parentSiteUrl || 'http://localhost:4004',
    apiKey: apiKey || '',
    useMock,
  };
}

/**
 * 构建母站点 API 完整 URL
 * @param endpoint - API 端点路径（如 'categories', 'games/uuids'）
 * @param useMock - 是否使用 Mock 数据（可选，默认从环境变量读取）
 */
export function buildParentApiUrl(endpoint: string, useMock?: boolean): string {
  const config = getParentSiteConfig();
  const shouldUseMock = useMock ?? config.useMock;

  const basePath = shouldUseMock ? '/api/fetch/mock' : '/api/fetch';
  return `${config.parentSiteUrl}${basePath}/${endpoint}`;
}

/**
 * 获取父站点 API 请求头
 * @param additionalHeaders - 额外的请求头
 */
export function getParentApiHeaders(additionalHeaders?: HeadersInit): HeadersInit {
  const config = getParentSiteConfig();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };

  // 非 Mock 模式需要 API Key
  if (!config.useMock && config.apiKey) {
    headers['X-API-Key'] = config.apiKey;
  }

  return headers;
}
