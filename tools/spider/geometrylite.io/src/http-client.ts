import { IHttpClient, RequestConfig } from './types';

/**
 * HTTP 客户端实现
 * 遵循单一职责原则：仅负责 HTTP 请求
 */
export class HttpClient implements IHttpClient {
  private defaultHeaders: Record<string, string> = {
    accept: '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'x-requested-with': 'XMLHttpRequest',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  };

  /**
   * 发起 HTTP GET 请求
   * @param url 目标 URL
   * @param config 请求配置
   * @returns HTML 字符串
   */
  async fetch(url: string, config: RequestConfig = {}): Promise<string> {
    const headers = { ...this.defaultHeaders, ...config.headers };
    const timeout = config.timeout || 30000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      return html;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch ${url}: ${error.message}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 添加延迟，避免请求过快
   * @param ms 延迟毫秒数
   */
  async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
