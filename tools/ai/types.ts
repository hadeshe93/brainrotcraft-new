/**
 * AI 模块类型定义
 */

/**
 * 聊天消息角色
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * 聊天消息
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * 聊天请求参数
 */
export interface ChatOptions {
  /**
   * 聊天消息列表
   */
  messages: ChatMessage[];

  /**
   * 模型名称，默认为 gemini-2.0-flash-exp
   */
  model?: string;

  /**
   * 温度参数，控制输出的随机性，范围 0-1
   */
  temperature?: number;

  /**
   * 最大输出 token 数
   */
  maxTokens?: number;

  /**
   * Top P 采样参数
   */
  topP?: number;
}

/**
 * 聊天响应结果
 */
export interface ChatResponse {
  /**
   * 生成的文本内容
   */
  content: string;

  /**
   * 使用的模型
   */
  model: string;

  /**
   * Token 使用统计
   */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  /**
   * 完成原因
   */
  finishReason?: string;
}

/**
 * 流式聊天响应
 */
export interface ChatStreamChunk {
  /**
   * 增量文本内容
   */
  delta: string;

  /**
   * 是否是最后一个块
   */
  isDone: boolean;
}
