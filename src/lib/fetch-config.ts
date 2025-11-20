import { checkIsDevEnv } from './env';
import { ORIGIN } from '@/constants/config';

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
 * 从环境变量获取配置（fallback）
 */
function getConfigFromEnv(): ParentSiteConfig {
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
 * 从 API 获取配置
 */
async function fetchConfigFromApi(): Promise<ParentSiteConfig | null> {
  const isInBrowser = typeof window !== 'undefined';
  // 服务端
  if (!isInBrowser) {
    const { getCloudflareEnv } = await import('@/services/base');
    const { getSiteConfigByScope } = await import('@/services/content/site-config');
    const env = await getCloudflareEnv();
    const config = await getSiteConfigByScope('admin', env.DB);
    return {
      parentSiteUrl: config?.config.parentSiteUrl || 'http://localhost:4004',
      apiKey: config?.config.parentApiKey || '',
      useMock: false,
    };
  }
  // 客户端
  try {
    const response = await fetch(`/api/admin/site-config?scopes=admin`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json() as any;

    if (json.success && json.data && json.data.length > 0) {
      const adminConfig = json.data[0].config;
      const { parentSiteUrl, parentApiKey } = adminConfig;
      return {
        parentSiteUrl: parentSiteUrl || 'http://localhost:4004',
        apiKey: parentApiKey || '',
        useMock: false,
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch config from API:', error);
    return null;
  }
}

/**
 * 获取母站点配置（异步版本）
 * 优先从 API 获取，失败则 fallback 到环境变量
 * 首次成功后缓存，浏览器刷新后失效
 */
export async function getParentSiteConfig(): Promise<ParentSiteConfig> {
  // 尝试从 API 获取
  const apiConfig = await fetchConfigFromApi();

  if (apiConfig) {
    return apiConfig;
  }

  // Fallback 到环境变量
  const envConfig = getConfigFromEnv();
  return envConfig;
}

/**
 * 构建母站点 API 完整 URL（异步版本）
 * @param endpoint - API 端点路径（如 'categories', 'games/uuids'）
 * @param useMock - 是否使用 Mock 数据（可选，默认从环境变量读取）
 */
export async function buildParentApiUrl(endpoint: string, useMock?: boolean): Promise<string> {
  const config = await getParentSiteConfig();
  const shouldUseMock = useMock ?? config.useMock;

  const basePath = shouldUseMock ? '/api/fetch/mock' : '/api/fetch';
  return `${config.parentSiteUrl}${basePath}/${endpoint}`;
}

/**
 * 获取父站点 API 请求头（异步版本）
 * @param additionalHeaders - 额外的请求头
 */
export async function getParentApiHeaders(additionalHeaders?: HeadersInit): Promise<HeadersInit> {
  const config = await getParentSiteConfig();
  const headers: HeadersInit & {
    'X-API-Key'?: string;
  } = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };

  // 非 Mock 模式需要 API Key
  if (!config.useMock && config.apiKey) {
    headers['X-API-Key'] = config.apiKey;
  }

  return headers;
}
