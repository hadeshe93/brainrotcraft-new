/**
 * Content Rewriter Service
 * 使用 LLM 对内容进行 SEO 优化改写
 */

import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { RewritePromptBuilder, type SEOContent, type EntityType } from './rewrite-prompts';
import { getCloudflareEnv } from '@/services/base';
import { checkIsDevEnv } from '@/lib/env';

export interface RewriteOptions {
  entity: EntityType;
  originalName: string;
  seoOptimize?: boolean;
  targetKeywords?: string[];
  temperature?: number;
}

export interface RewriteMetrics {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  averageLatency: number;
}

/**
 * 内容改写器
 */
export class ContentRewriter {
  // private model = checkIsDevEnv() ? 'google/gemini-2.0-flash-exp:free' : 'google/gemini-2.5-pro'; // 使用免费的 Gemini 模型
  private model = checkIsDevEnv() ? 'google/gemini-2.5-flash' : 'google/gemini-2.5-pro'; // 使用免费的 Gemini 模型
  private temperature = 0.5; // 平衡创造性和一致性
  private maxRetries = 2;
  private retryDelay = 2000;
  private promptBuilder = new RewritePromptBuilder();

  // 性能指标
  private metrics: RewriteMetrics = {
    totalRequests: 0,
    successCount: 0,
    failureCount: 0,
    averageLatency: 0,
  };

  /**
   * 获取 OpenRouter API Key
   */
  private async getOpenRouterKey(): Promise<string> {
    const env = await getCloudflareEnv();
    // Try Cloudflare env first (production)
    if (env?.OPENROUTER_API_KEY) {
      return env.OPENROUTER_API_KEY;
    }

    // Fallback to process.env (development)
    if (process.env.OPENROUTER_API_KEY) {
      return process.env.OPENROUTER_API_KEY;
    }

    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  /**
   * 核心改写函数
   */
  async rewriteSEOContent(originalContent: SEOContent, options: RewriteOptions): Promise<SEOContent> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      const prompt = this.promptBuilder.buildRewritePrompt(options.entity, options.originalName, originalContent);

      const temperature = options.temperature !== undefined ? options.temperature : this.temperature;
      const apiKey = await this.getOpenRouterKey();
      const openrouter = createOpenRouter({ apiKey });
      const model = openrouter(this.model);

      const { text } = await generateText({
        model,
        prompt,
        temperature,
      });

      // 解析 JSON 响应（参考现有模式）
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;

      try {
        const parsed = JSON.parse(jsonStr.trim());

        // 验证返回的数据结构
        if (!parsed.metadataTitle || !parsed.metadataDescription || !parsed.content) {
          throw new Error('Invalid response structure: missing required fields');
        }

        this.metrics.successCount++;
        this.updateLatency(startTime);

        return {
          metadataTitle: parsed.metadataTitle,
          metadataDescription: parsed.metadataDescription,
          content: parsed.content,
        };
      } catch (parseError) {
        console.error('[Rewriter] Parse error, falling back to original:', parseError);
        this.metrics.failureCount++;
        return originalContent; // 降级策略
      }
    } catch (error) {
      console.error('[Rewriter] Rewrite error:', error);
      this.metrics.failureCount++;
      this.updateLatency(startTime);
      return originalContent; // 降级策略
    }
  }

  /**
   * 带重试的改写函数
   */
  async rewriteWithRetry(content: SEOContent, options: RewriteOptions, attempt = 1): Promise<SEOContent> {
    try {
      return await this.rewriteSEOContent(content, options);
    } catch (error) {
      if (attempt < this.maxRetries) {
        console.log(`[Rewriter] Retry ${attempt}/${this.maxRetries}`);
        await new Promise((r) => setTimeout(r, this.retryDelay));
        return this.rewriteWithRetry(content, options, attempt + 1);
      }
      console.error('[Rewriter] Max retries exceeded:', error);
      return content; // 降级策略
    }
  }

  /**
   * 批量改写（参考 tools/rewrite/geometrylite.io/rewrite-games.ts）
   */
  async batchRewriteContent<T extends SEOContent>(
    items: T[],
    options: RewriteOptions,
    onProgress?: (current: number, total: number) => void,
  ): Promise<T[]> {
    const pLimit = (await import('p-limit')).default;
    const limit = pLimit(4); // 并发限制

    const results: T[] = [];
    let processed = 0;

    const tasks = items.map((item, index) =>
      limit(async () => {
        try {
          const rewritten = await this.rewriteSEOContent(item, options);
          results[index] = { ...item, ...rewritten };
        } catch (error) {
          console.error(`[Rewriter] Failed for item ${index}:`, error);
          results[index] = item; // 失败时保留原始内容
        }
        processed++;
        onProgress?.(processed, items.length);
      }),
    );

    await Promise.all(tasks);
    return results;
  }

  /**
   * 更新延迟指标
   */
  private updateLatency(startTime: number) {
    const latency = Date.now() - startTime;
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (this.metrics.totalRequests - 1) + latency) / this.metrics.totalRequests;
  }

  /**
   * 获取性能指标
   */
  getMetrics(): RewriteMetrics {
    return { ...this.metrics };
  }

  /**
   * 重置性能指标
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      averageLatency: 0,
    };
  }
}

/**
 * 单例实例
 */
export const contentRewriter = new ContentRewriter();
