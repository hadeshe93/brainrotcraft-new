/**
 * Google AI 配置
 */

/**
 * AI 提供商枚举
 */
export enum AIProvider {
  /** Google AI 直连 */
  GOOGLE = 'google',
  /** OpenRouter (支持多个模型提供商) */
  OPENROUTER = 'openrouter',
}

/**
 * Google AI API Key
 * 从环境变量中获取，如果未设置则抛出错误
 */
export function getGoogleApiKey(): string {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Google AI API Key is not configured. ' + 'Please set GOOGLE_AI_API_KEY or GOOGLE_API_KEY environment variable.',
    );
  }

  return apiKey;
}

/**
 * OpenRouter API Key
 * 从环境变量中获取，如果未设置则抛出错误
 */
export function getOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OpenRouter API Key is not configured. ' + 'Please set OPENROUTER_API_KEY environment variable.');
  }

  return apiKey;
}

/**
 * 获取当前配置的 AI 提供商
 */
export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();

  switch (provider) {
    case 'openrouter':
      return AIProvider.OPENROUTER;
    case 'google':
    default:
      return AIProvider.GOOGLE;
  }
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG = {
  /**
   * 默认模型
   */
  model: 'gemini-2.0-flash-exp',

  /**
   * 默认温度
   */
  temperature: 0.7,

  /**
   * 默认最大 token 数
   */
  maxTokens: 8192,

  /**
   * 默认 Top P
   */
  topP: 0.95,

  /**
   * AI 提供商
   */
  provider: getAIProvider(),
} as const;
