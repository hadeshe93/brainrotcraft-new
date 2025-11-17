/**
 * Fetch API 客户端 - 用于子站点向母站点请求数据
 */

import { getParentSiteConfig } from '@/lib/fetch-config';
import type { CategoryData, TagData, FeaturedData, GameData, FetchResponse } from './validator';
import { validateCategory, validateTag, validateFeatured, validateGame, validateFetchResponse } from './validator';

// API 错误类型
export interface FetchError {
  type: 'network' | 'auth' | 'format' | 'database' | 'unknown';
  message: string;
  details?: any;
}

// 处理 fetch 错误
function handleFetchError(error: any): FetchError {
  if (error.status === 401 || error.status === 403) {
    return {
      type: 'auth',
      message: 'API认证失败，请检查API Key配置',
      details: error,
    };
  }

  if (error.name === 'TypeError' || error.message?.includes('fetch')) {
    return {
      type: 'network',
      message: '网络连接失败，请检查母站点URL配置',
      details: error,
    };
  }

  if (error.message?.includes('JSON')) {
    return {
      type: 'format',
      message: '数据格式错误，无法解析响应',
      details: error,
    };
  }

  return {
    type: 'unknown',
    message: error.message || '未知错误',
    details: error,
  };
}

// 通用请求函数
async function fetchFromParent<T>(
  endpoint: string,
  validator: (item: any) => item is T,
): Promise<{ data: T[]; error: FetchError | null }> {
  try {
    const config = getParentSiteConfig();

    // 如果启用 Mock，使用 mock 端点
    const url = config.useMock
      ? `${config.parentSiteUrl}/api/fetch/mock/${endpoint}`
      : `${config.parentSiteUrl}/api/fetch/${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // 非 Mock 模式需要 API Key
    if (!config.useMock && config.apiKey) {
      headers['X-API-Key'] = config.apiKey;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      (error as any).status = response.status;
      throw error;
    }

    const json = await response.json();

    // 验证响应格式
    const validatedResponse = validateFetchResponse(json, validator);

    if (!validatedResponse) {
      throw new Error('Invalid response format from parent site');
    }

    return {
      data: validatedResponse.data,
      error: null,
    };
  } catch (error: any) {
    return {
      data: [],
      error: handleFetchError(error),
    };
  }
}

/**
 * 从母站点拉取分类数据
 */
export async function fetchCategories(): Promise<{
  data: CategoryData[];
  error: FetchError | null;
}> {
  return fetchFromParent<CategoryData>('categories', validateCategory);
}

/**
 * 从母站点拉取标签数据
 */
export async function fetchTags(): Promise<{
  data: TagData[];
  error: FetchError | null;
}> {
  return fetchFromParent<TagData>('tags', validateTag);
}

/**
 * 从母站点拉取特性合集数据
 */
export async function fetchFeatured(): Promise<{
  data: FeaturedData[];
  error: FetchError | null;
}> {
  return fetchFromParent<FeaturedData>('featured', validateFeatured);
}

/**
 * 从母站点拉取游戏数据
 */
export async function fetchGames(): Promise<{
  data: GameData[];
  error: FetchError | null;
}> {
  return fetchFromParent<GameData>('games', validateGame);
}

/**
 * 从母站点拉取单个游戏数据（通过 UUID）
 */
export async function fetchGameByUuid(uuid: string): Promise<{
  data: GameData | null;
  error: FetchError | null;
}> {
  try {
    const config = getParentSiteConfig();

    // 使用 uuid 参数查询指定游戏
    const url = config.useMock
      ? `${config.parentSiteUrl}/api/fetch/mock/games?uuid=${encodeURIComponent(uuid)}`
      : `${config.parentSiteUrl}/api/fetch/games?uuid=${encodeURIComponent(uuid)}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (!config.useMock && config.apiKey) {
      headers['X-API-Key'] = config.apiKey;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      (error as any).status = response.status;
      throw error;
    }

    const json = await response.json();

    // 验证响应格式
    const validatedResponse = validateFetchResponse(json, validateGame);
    console.log('验证结果:', validatedResponse?.data.length);

    if (!validatedResponse) {
      throw new Error('Invalid response format from parent site');
    }

    // 返回第一个游戏（应该只有一个或零个）
    const game = validatedResponse.data[0] || null;

    if (!game) {
      return {
        data: null,
        error: {
          type: 'unknown',
          message: `Game with UUID ${uuid} not found`,
        },
      };
    }

    return { data: game, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: handleFetchError(error),
    };
  }
}

/**
 * 批量拉取指定 UUID 的分类数据
 */
export async function fetchCategoriesByUuids(uuids: string[]): Promise<{
  data: CategoryData[];
  error: FetchError | null;
}> {
  const { data, error } = await fetchCategories();

  if (error) {
    return { data: [], error };
  }

  const uuidSet = new Set(uuids);
  const filtered = data.filter((item) => uuidSet.has(item.uuid));

  return { data: filtered, error: null };
}

/**
 * 批量拉取指定 UUID 的标签数据
 */
export async function fetchTagsByUuids(uuids: string[]): Promise<{
  data: TagData[];
  error: FetchError | null;
}> {
  const { data, error } = await fetchTags();

  if (error) {
    return { data: [], error };
  }

  const uuidSet = new Set(uuids);
  const filtered = data.filter((item) => uuidSet.has(item.uuid));

  return { data: filtered, error: null };
}

/**
 * 批量拉取指定 UUID 的特性合集数据
 */
export async function fetchFeaturedByUuids(uuids: string[]): Promise<{
  data: FeaturedData[];
  error: FetchError | null;
}> {
  const { data, error } = await fetchFeatured();

  if (error) {
    return { data: [], error };
  }

  const uuidSet = new Set(uuids);
  const filtered = data.filter((item) => uuidSet.has(item.uuid));

  return { data: filtered, error: null };
}
