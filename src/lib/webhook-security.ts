import crypto from 'crypto';
import { NextRequest } from 'next/server';

/**
 * Replicate Webhook 验证工具
 * 基于官方文档: https://replicate.com/docs/topics/webhooks/verify-webhook
 */
export class WebhookSecurity {
  /**
   * 验证 Replicate Webhook 签名
   * 按照官方规范实现签名验证
   */
  static async verifyReplicateSignature(
    request: NextRequest,
    body: string,
    secret?: string
  ): Promise<boolean> {
    try {
      // 如果没有配置 secret，跳过验证（开发环境）
      if (!secret) {
        console.warn('⚠️ Webhook secret 未配置，跳过签名验证');
        return true;
      }

      // 获取必需的头部信息
      const webhookId = request.headers.get('webhook-id');
      const webhookTimestamp = request.headers.get('webhook-timestamp');
      const webhookSignature = request.headers.get('webhook-signature');

      if (!webhookId || !webhookTimestamp || !webhookSignature) {
        console.error('❌ 缺少必需的 webhook 头部信息:', {
          webhookId: !!webhookId,
          webhookTimestamp: !!webhookTimestamp,
          webhookSignature: !!webhookSignature,
        });
        return false;
      }

      // 构造签名内容: webhook-id.webhook-timestamp.body
      const signedContent = `${webhookId}.${webhookTimestamp}.${body}`;

      // 提取 secret 的 base64 部分（去掉 whsec_ 前缀）
      const secretKey = secret.startsWith('whsec_') ? secret.slice(6) : secret;

      // 计算期望的签名
      const expectedSignature = crypto
        .createHmac('sha256', Buffer.from(secretKey, 'base64'))
        .update(signedContent, 'utf8')
        .digest('base64');

      // 解析 webhook-signature 头（格式: "v1,signature1 v1,signature2"）
      const signatures = webhookSignature.split(' ').map(sig => {
        const [version, signature] = sig.split(',');
        return { version, signature };
      });

      // 验证是否有匹配的签名
      const isValid = signatures.some(({ version, signature }) => {
        if (version !== 'v1') return false;
        
        try {
          return crypto.timingSafeEqual(
            Buffer.from(signature, 'base64'),
            Buffer.from(expectedSignature, 'base64')
          );
        } catch {
          return false;
        }
      });

      if (!isValid) {
        console.error('❌ Webhook 签名验证失败');
        console.error('期望签名:', expectedSignature);
        console.error('接收签名:', signatures.map(s => s.signature));
      }

      return isValid;
    } catch (error) {
      console.error('❌ Webhook 签名验证异常:', error);
      return false;
    }
  }

  /**
   * 验证 Webhook 时间戳，防止重放攻击
   * 基于官方文档推荐的时间戳验证
   */
  static verifyTimestamp(
    request: NextRequest,
    toleranceMs: number = 300000 // 5分钟容错
  ): boolean {
    try {
      // 获取 webhook-timestamp 头（官方规范）
      const timestampHeader = request.headers.get('webhook-timestamp');
      if (!timestampHeader) {
        console.warn('⚠️ 缺少 webhook-timestamp 头');
        return true; // 如果没有时间戳头，跳过验证
      }

      const timestamp = parseInt(timestampHeader, 10);
      if (isNaN(timestamp)) {
        console.error('❌ 无效的时间戳格式:', timestampHeader);
        return false;
      }

      const now = Date.now();
      const diff = Math.abs(now - timestamp * 1000); // Replicate 时间戳是秒

      if (diff > toleranceMs) {
        console.error('❌ 请求时间戳过期:', {
          timestamp,
          now: now / 1000,
          diffMs: diff,
          toleranceMs,
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ 时间戳验证异常:', error);
      return true; // 出错时允许通过
    }
  }

}

/**
 * 验证 Replicate Webhook 请求
 * 基于官方文档的简化验证方案
 */
export async function verifyWebhookRequest(
  request: NextRequest,
  body: string,
  options: {
    secret?: string;
    checkTimestamp?: boolean;
  } = {}
): Promise<{
  valid: boolean;
  error?: string;
  details?: Record<string, any>;
}> {
  const results: Record<string, boolean> = {};

  try {
    // 1. 签名验证（核心验证）
    const signatureValid = await WebhookSecurity.verifyReplicateSignature(
      request,
      body,
      options.secret
    );
    results.signature = signatureValid;

    // 2. 时间戳验证（防重放攻击）
    if (options.checkTimestamp !== false) {
      const timestampValid = WebhookSecurity.verifyTimestamp(request);
      results.timestamp = timestampValid;
    }

    // 检查所有验证是否通过
    const allValid = Object.values(results).every(valid => valid);

    return {
      valid: allValid,
      details: results,
      error: allValid ? undefined : 'Webhook verification failed',
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown verification error',
      details: results,
    };
  }
} 