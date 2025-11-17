import { DOMAIN } from '@/constants/config';
import { EAppEnv } from '@/types/base/env';
/**
 * 请求图片 url 拿到资源之后转成 base64 uri
 * 支持浏览器和 Node.js 环境
 */
export async function getBase64FromUrl(urlRaw: string): Promise<string> {
  const url = urlRaw.startsWith('http')
    ? urlRaw
    : process.env.NEXT_PUBLIC_RUNTIME_ENV === EAppEnv.development
      ? `http://localhost:4004${urlRaw}`
      : `https://${DOMAIN}${urlRaw}`;
  try {
    // 发起网络请求获取图片资源
    const response = await fetch(url);

    // 检查响应是否成功
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    // 检测运行环境
    if (typeof window !== 'undefined' && typeof FileReader !== 'undefined') {
      // 浏览器环境：使用 FileReader
      return getBase64FromUrlBrowser(response);
    } else {
      // 服务端环境：使用 Buffer
      return getBase64FromUrlServer(response);
    }
  } catch (error) {
    // 重新抛出错误，便于调用方处理
    throw new Error(`getBlobFromUrl failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 浏览器环境实现
 */
async function getBase64FromUrlBrowser(response: Response): Promise<string> {
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to base64 string'));
      }
    };

    reader.onerror = () => {
      reject(new Error('FileReader error occurred'));
    };

    // 读取 blob 并转换为 data URL (base64)
    reader.readAsDataURL(blob);
  });
}

/**
 * 服务端环境实现
 */
async function getBase64FromUrlServer(response: Response): Promise<string> {
  // 获取响应的 ArrayBuffer
  const arrayBuffer = await response.arrayBuffer();

  // 转换为 Buffer (Node.js)
  const buffer = Buffer.from(arrayBuffer);

  // 获取 MIME 类型
  const contentType = response.headers.get('content-type') || 'application/octet-stream';

  // 转换为 base64 并构造 data URI
  const base64 = buffer.toString('base64');

  return `data:${contentType};base64,${base64}`;
}
