/**
 * 浏览器指纹识别工具
 * 使用 FingerprintJS 生成匿名用户 ID
 */
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { loadScript } from './script';
import { saveAnonymousUserId as saveToStorage, getAnonymousUserId as getFromStorage } from './storage';

// FingerprintJS CDN URL
const FINGERPRINTJS_CDN_URL = 'https://openfpcdn.io/fingerprintjs/v4';

// 全局缓存
let fpPromise: Promise<any> | null = null;
let cachedVisitorId: string | null = null;

/**
 * 动态加载 FingerprintJS 脚本
 */
async function loadFingerprintJS(): Promise<any> {
  // 检查是否已经加载
  if (typeof window !== 'undefined' && (window as any).FingerprintJS) {
    return (window as any).FingerprintJS;
  }

  try {
    // 使用公共的 loadScript 函数
    await loadScript({ 
      src: FINGERPRINTJS_CDN_URL,
      async: true,
      defer: false, // FingerprintJS 需要立即执行
      crossOrigin: 'anonymous'
    });

    // 检查是否成功加载
    if ((window as any).FingerprintJS) {
      return (window as any).FingerprintJS;
    } else {
      throw new Error('FingerprintJS global object not found after loading');
    }
  } catch (error) {
    throw new Error(`Failed to load FingerprintJS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 初始化 FingerprintJS 实例
 */
async function initFingerprintJS() {
  if (fpPromise) {
    return fpPromise;
  }
  fpPromise = (async () => {
    try {
      // const FpJS = await loadFingerprintJS();
      // 创建 FingerprintJS 实例
      const fp = await FingerprintJS.load({});
      
      return fp;
    } catch (error) {
      console.error('Failed to initialize FingerprintJS:', error);
      fpPromise = null; // 重置缓存以便重试
      throw error;
    }
  })();

  return fpPromise;
}

/**
 * 获取匿名用户指纹 ID
 * @returns Promise<string> 返回唯一的匿名用户 ID
 */
export async function getAnonymousUserId(): Promise<string> {
  try {
    // 1. 如果内存中有缓存的 ID，直接返回
    if (cachedVisitorId) {
      return cachedVisitorId;
    }

    // 2. 服务端渲染时返回临时 ID
    if (typeof window === 'undefined') {
      return 'ssr-temp-id';
    }

    // 3. 尝试从浏览器存储中获取已缓存的 ID
    const storedUserId = await getFromStorage();
    if (storedUserId) {
      cachedVisitorId = storedUserId;
      console.log('🔄 Retrieved anonymous user ID from storage:', cachedVisitorId);
      return cachedVisitorId;
    }

    // 4. 浏览器存储中没有，使用 FingerprintJS 生成新的 ID
    const fp = await initFingerprintJS();
    
    // 获取访客识别结果
    const result = await fp.get();
    
    // 缓存到内存
    cachedVisitorId = result.visitorId;
    
    // 持久化到浏览器存储 
    await saveToStorage(cachedVisitorId!);
    
    console.log('🔍 Generated new anonymous user ID:', cachedVisitorId);
    
    return cachedVisitorId!;
  } catch (error) {
    console.error('❌ Failed to get anonymous user ID:', error);
    
    // 降级方案：生成基于浏览器特征的简单 ID
    const fallbackId = await generateFallbackIdWithStorage();
    cachedVisitorId = fallbackId;
    
    return fallbackId;
  }
}

/**
 * 降级方案：生成基于浏览器基础信息的简单指纹
 */
function generateFallbackId(): string {
  if (typeof window === 'undefined') {
    return 'ssr-fallback-id';
  }

  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.platform,
    navigator.cookieEnabled ? '1' : '0',
  ];

  // 简单的哈希函数
  let hash = 0;
  const str = components.join('|');
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  return 'fallback_' + Math.abs(hash).toString(36);
}

/**
 * 带存储功能的降级方案：先尝试从存储获取，否则生成新的并保存
 */
async function generateFallbackIdWithStorage(): Promise<string> {
  try {
    // 先尝试从存储中获取已有的降级 ID
    const storedFallbackId = await getFromStorage();
    if (storedFallbackId && storedFallbackId.startsWith('fallback_')) {
      console.log('🔄 Retrieved fallback ID from storage:', storedFallbackId);
      return storedFallbackId;
    }
  } catch (error) {
    console.warn('⚠️ Failed to retrieve fallback ID from storage:', error);
  }

  // 生成新的降级 ID
  const fallbackId = generateFallbackId();
  
  try {
    // 保存到存储
    await saveToStorage(fallbackId);
    console.log('💾 Saved new fallback ID to storage:', fallbackId);
  } catch (error) {
    console.warn('⚠️ Failed to save fallback ID to storage:', error);
  }
  
  return fallbackId;
}

/**
 * 重置缓存的用户 ID（用于测试或特殊场景）
 */
export async function resetAnonymousUserId(): Promise<void> {
  cachedVisitorId = null;
  fpPromise = null;
  
  // 清理浏览器存储
  try {
    if (typeof window !== 'undefined') {
      const { store } = await import('./storage');
      await store.removeItem('anonymousUserId');
      console.log('🗑️ Cleared anonymous user ID from storage');
    }
  } catch (error) {
    console.warn('⚠️ Failed to clear anonymous user ID from storage:', error);
  }
}

/**
 * 检查 FingerprintJS 是否可用
 */
export function isFingerprintJSAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as any).FingerprintJS;
}

/* 
使用示例：

import { getAnonymousUserId, resetAnonymousUserId } from '@/lib/fingerprint';

// 基础用法
async function example() {
  try {
    const userId = await getAnonymousUserId();
    console.log('匿名用户 ID:', userId);
    // 输出类似: 匿名用户 ID: abc123def456...
  } catch (error) {
    console.error('获取用户 ID 失败:', error);
  }
}

// 在 React 组件中使用
function MyComponent() {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    getAnonymousUserId().then(setUserId);
  }, []);
  
  return <div>用户 ID: {userId}</div>;
}

// 重置缓存（用于测试）
await resetAnonymousUserId();

注意：
- 此函数使用了 @/lib/script 中的公共 loadScript 函数来加载 FingerprintJS
- 自动处理脚本加载、错误处理和降级方案
- 支持缓存机制，避免重复加载和计算
*/
