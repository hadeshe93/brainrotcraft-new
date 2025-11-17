/**
 * Rate Limiting Utilities
 * Provides IP-based rate limiting using Cloudflare KV
 */

import { getCloudflareEnv } from '@/services/base';

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed
   */
  maxRequests: number;
  /**
   * Time window in seconds
   */
  windowSeconds: number;
  /**
   * Rate limit key prefix
   */
  keyPrefix: string;
}

export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;
  /**
   * Current request count
   */
  currentCount: number;
  /**
   * Maximum requests allowed
   */
  maxRequests: number;
  /**
   * Time until reset (seconds)
   */
  resetIn: number;
}

/**
 * Check rate limit for an IP address
 * @param ip Client IP address
 * @param config Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(ip: string, config: RateLimitConfig): Promise<RateLimitResult> {
  try {
    const env = await getCloudflareEnv();
    const kv = (env as any).RATE_LIMIT_KV;

    // If KV is not configured, allow the request (dev mode)
    if (!kv) {
      console.warn('RATE_LIMIT_KV not configured, skipping rate limit');
      return {
        allowed: true,
        currentCount: 0,
        maxRequests: config.maxRequests,
        resetIn: config.windowSeconds,
      };
    }

    const key = `${config.keyPrefix}:${ip}`;
    const now = Math.floor(Date.now() / 1000);

    // Get current rate limit data
    const dataStr = await kv.get(key);
    let data: { count: number; expiresAt: number } | null = null;

    if (dataStr) {
      try {
        data = JSON.parse(dataStr);
      } catch (e) {
        console.error('Failed to parse rate limit data:', e);
      }
    }

    // Check if the window has expired
    if (!data || now >= data.expiresAt) {
      // Start new window
      const expiresAt = now + config.windowSeconds;
      const newData = { count: 1, expiresAt };

      await kv.put(key, JSON.stringify(newData), {
        expirationTtl: config.windowSeconds,
      });

      return {
        allowed: true,
        currentCount: 1,
        maxRequests: config.maxRequests,
        resetIn: config.windowSeconds,
      };
    }

    // Increment count in current window
    const newCount = data.count + 1;
    const allowed = newCount <= config.maxRequests;

    if (allowed) {
      // Update count
      const newData = { count: newCount, expiresAt: data.expiresAt };
      await kv.put(key, JSON.stringify(newData), {
        expirationTtl: data.expiresAt - now,
      });
    }

    return {
      allowed,
      currentCount: newCount,
      maxRequests: config.maxRequests,
      resetIn: data.expiresAt - now,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request to avoid blocking legitimate users
    return {
      allowed: true,
      currentCount: 0,
      maxRequests: config.maxRequests,
      resetIn: config.windowSeconds,
    };
  }
}

/**
 * Get client IP from request
 * @param request Request object
 * @returns Client IP address
 */
export function getClientIP(request: Request): string {
  // Cloudflare provides the real IP in CF-Connecting-IP header
  const cfConnectingIP = request.headers.get('CF-Connecting-IP');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to X-Forwarded-For
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  // Fallback to X-Real-IP
  const xRealIP = request.headers.get('X-Real-IP');
  if (xRealIP) {
    return xRealIP;
  }

  return 'unknown';
}

/**
 * Predefined rate limit configurations
 */
export const RateLimits = {
  /**
   * Comment submission: 3 comments per 5 minutes
   */
  COMMENT: {
    maxRequests: 3,
    windowSeconds: 300, // 5 minutes
    keyPrefix: 'rl:comment',
  } as RateLimitConfig,

  /**
   * Report submission: 5 reports per hour
   */
  REPORT: {
    maxRequests: 5,
    windowSeconds: 3600, // 1 hour
    keyPrefix: 'rl:report',
  } as RateLimitConfig,

  /**
   * Game interaction: 1 action per 10 seconds
   */
  INTERACT: {
    maxRequests: 1,
    windowSeconds: 10,
    keyPrefix: 'rl:interact',
  } as RateLimitConfig,

  /**
   * Search: 30 searches per minute
   */
  SEARCH: {
    maxRequests: 30,
    windowSeconds: 60,
    keyPrefix: 'rl:search',
  } as RateLimitConfig,
};
