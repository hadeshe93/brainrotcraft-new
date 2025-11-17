/**
 * Cloudflare KV 状态存储服务
 * 用于管理预测任务的临时状态
 */
import { getCloudflareEnv } from '@/services/base';
import { ECommonErrorCode } from '@/types/services/errors';
import { EAppEnv } from '@/types/base/env';
import { APIResponse } from '@/types/services/response';
import { DOMAIN } from '@/constants/config';

/**
 * KV 存储选项
 */
export interface KVPutOptions {
  /** 过期时间 (秒) */
  expirationTtl?: number;
  /** 过期时间戳 */
  expiration?: number;
  /** 元数据 */
  metadata?: Record<string, any>;
}

interface KVStorageOptions {
  bizName: string;
}

export class KVStorage {
  bizName: string;

  constructor(options: KVStorageOptions) {
    this.bizName = options.bizName;
  }

  private getKey(rawKey: string) {
    return `${this.bizName}:${rawKey}`;
  }

  // 存储
  async set<T = any>(
    key: string,
    value: T,
    options: KVPutOptions = {}
  ): Promise<APIResponse<void>> {
    return await putKV<T>(this.getKey(key), value, options);
  }

  // 读取
  async get<T = any>(
    key: string,
    options: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' } = {}
  ): Promise<APIResponse<T>> {
    return await getKV<T>(this.getKey(key), options);
  }

  // 删除
  async delete(key: string): Promise<APIResponse<void>> {
    return await deleteKV(this.getKey(key));
  }

  // 列表
  async list(options: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  } = {}): Promise<APIResponse<{
    keys: Array<{ name: string; expiration?: number; metadata?: any }>;
    list_complete: boolean;
    cursor?: string;
  }>> {
    return await listKV({
      ...options,
      prefix: this.getKey(options.prefix || ''),
    });
  }
}

export const kvStorage = new KVStorage({
  bizName: DOMAIN,
});

/**
 * 存储数据到 KV
 */
export async function putKV<T = any>(
  key: string,
  value: T,
  options: KVPutOptions = {}
): Promise<APIResponse<void>> {
  try {
    // 获取 KV 环境变量 (Cloudflare Workers 环境)
    const kv = await getKVNamespace();
    if (!kv) {
      return {
        success: false,
        message: '',
        errorCode: ECommonErrorCode.SERVICE_UNAVAILABLE,
      };
    }

    // 序列化数据
    const serializedValue = JSON.stringify(value);

    // 构建 KV 存储选项
    const kvOptions: any = {};
    if (options.expirationTtl) {
      kvOptions.expirationTtl = options.expirationTtl;
    }
    if (options.expiration) {
      kvOptions.expiration = options.expiration;
    }
    if (options.metadata) {
      kvOptions.metadata = options.metadata;
    }

    // 存储到 KV
    await kv.put(key, serializedValue, kvOptions);

    return {
      success: true,
      message: '',
      data: undefined,
    };
  } catch (error) {
    console.error('KV put error:', error);
    return {
      success: false,
      message: '',
      errorCode: ECommonErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}

/**
 * 从 KV 读取数据
 */
export async function getKV<T = any>(
  key: string,
  options: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' } = {}
): Promise<APIResponse<T>> {
  try {
    const kv = await getKVNamespace();
    if (!kv) {
      return {
        success: false,
        message: '',
        errorCode: ECommonErrorCode.SERVICE_UNAVAILABLE,
      };
    }

    // 从 KV 读取数据
    const value = await kv.get(key);
    
    if (value === null) {
      return {
        success: false,
        message: '',
        errorCode: ECommonErrorCode.SERVICE_UNAVAILABLE, // 使用现有的错误代码
      };
    }

    // 解析 JSON 数据
    let parsedValue: T;
    if (options.type === 'json' || !options.type) {
      try {
        parsedValue = JSON.parse(value as string);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return {
          success: false,
          message: '',
          errorCode: ECommonErrorCode.INTERNAL_SERVER_ERROR,
        };
      }
    } else {
      parsedValue = value as T;
    }

    return {
      success: true,
      message: '',
      data: parsedValue,
    };
  } catch (error) {
    console.error('KV get error:', error);
    return {
      success: false,
      message: '',
      errorCode: ECommonErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}

/**
 * 删除 KV 中的数据
 */
export async function deleteKV(key: string): Promise<APIResponse<void>> {
  try {
    const kv = await getKVNamespace();
    if (!kv) {
      return {
        success: false,
        message: '',
        errorCode: ECommonErrorCode.SERVICE_UNAVAILABLE,
      };
    }

    await kv.delete(key);

    return {
      success: true,
      message: '',
      data: undefined,
    };
  } catch (error) {
    console.error('KV delete error:', error);
    return {
      success: false,
      message: '',
      errorCode: ECommonErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}

/**
 * 批量获取 KV 数据
 */
export async function listKV(options: {
  prefix?: string;
  limit?: number;
  cursor?: string;
} = {}): Promise<APIResponse<{
  keys: Array<{ name: string; expiration?: number; metadata?: any }>;
  list_complete: boolean;
  cursor?: string;
}>> {
  try {
    const kv = await getKVNamespace();
    if (!kv) {
      return {
        success: false,
        message: '',
        errorCode: ECommonErrorCode.SERVICE_UNAVAILABLE,
      };
    }

    const result = await kv.list(options);

    return {
      success: true,
      message: '',
      data: result,
    };
  } catch (error) {
    console.error('KV list error:', error);
    return {
      success: false,
      message: '',
      errorCode: ECommonErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}

/**
 * 获取 KV Namespace
 * 使用 getCloudflareEnv 获取 Cloudflare 环境
 */
async function getKVNamespace(): Promise<KVNamespace | null> {
  try {
    const env = await getCloudflareEnv();
    return env.KV || null;
  } catch (error) {
    console.warn('Failed to get KV Namespace:', error);
    
    // 如果 Cloudflare Context 不可用，在开发环境中回退到模拟 KV
    if (process.env.NEXT_PUBLIC_RUNTIME_ENV === EAppEnv.development) {
      console.log('Falling back to mock KV in development environment');
      return getMockKV();
    }
    
    return null;
  }
}

/**
 * 开发环境的模拟 KV 实现
 */
function getMockKV(): KVNamespace {
  const mockStorage = new Map<string, { value: string; expiration?: number; metadata?: any }>();

  return {
    async get(key: string, options?: any) {
      const item = mockStorage.get(key);
      if (!item) return null;
      
      // 检查过期时间
      if (item.expiration && Date.now() / 1000 > item.expiration) {
        mockStorage.delete(key);
        return null;
      }
      
      return item.value;
    },

    async put(key: string, value: string, options?: any) {
      const item: any = { value };
      
      if (options?.expiration) {
        item.expiration = options.expiration;
      } else if (options?.expirationTtl) {
        item.expiration = Math.floor(Date.now() / 1000) + options.expirationTtl;
      }
      
      if (options?.metadata) {
        item.metadata = options.metadata;
      }
      
      mockStorage.set(key, item);
    },

    async delete(key: string) {
      mockStorage.delete(key);
    },

    async list(options?: any) {
      const keys = Array.from(mockStorage.keys())
        .filter(key => !options?.prefix || key.startsWith(options.prefix))
        .slice(0, options?.limit || 1000)
        .map(name => {
          const item = mockStorage.get(name);
          return {
            name,
            expiration: item?.expiration,
            metadata: item?.metadata,
          };
        });

      return {
        keys,
        list_complete: true,
      };
    },
  } as KVNamespace;
}