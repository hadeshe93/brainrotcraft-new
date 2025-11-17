/**
 * Webhook 处理器抽象接口
 * 定义所有支付平台 webhook 处理器必须实现的接口
 */

import { WebhookEvent, PaymentProvider } from '../types';

/**
 * Webhook 处理器接口
 */
export interface IWebhookHandler {
  /**
   * 检查是否能处理指定的支付提供商
   */
  canHandle(provider: PaymentProvider): boolean;

  /**
   * 验证 webhook 签名
   */
  verifySignature(
    rawBody: string,
    signature: string,
    headers?: Record<string, string>
  ): Promise<boolean>;

  /**
   * 解析 webhook 事件
   */
  parseEvent(
    rawBody: string,
    signature: string,
    headers?: Record<string, string>
  ): Promise<WebhookEvent>;

  /**
   * 处理 webhook 事件
   */
  handleEvent(event: WebhookEvent, db: D1Database): Promise<void>;

  /**
   * 获取支持的事件类型列表
   */
  getSupportedEvents(): string[];
}