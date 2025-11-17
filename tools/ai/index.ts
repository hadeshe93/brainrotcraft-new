/**
 * Google AI 工具模块
 *
 * 提供 Google AI (Gemini) 模型的 Chat 功能
 *
 * @module tools/ai
 *
 * @example
 * ```ts
 * import { googleChat, quickChat } from '@/tools/ai';
 *
 * // 基础用法
 * const response = await googleChat({
 *   messages: [
 *     { role: 'user', content: 'Hello!' }
 *   ]
 * });
 *
 * // 快速对话
 * const quickResponse = await quickChat('What is AI?');
 *
 * // 流式响应
 * await googleChatStream(
 *   {
 *     messages: [{ role: 'user', content: 'Tell me a story' }]
 *   },
 *   (chunk) => {
 *     if (!chunk.isDone) {
 *       process.stdout.write(chunk.delta);
 *     }
 *   }
 * );
 * ```
 */

// 导出类型定义
export type { MessageRole, ChatMessage, ChatOptions, ChatResponse, ChatStreamChunk } from './types';

// 导出配置
export { DEFAULT_CONFIG, getGoogleApiKey, getOpenRouterApiKey, getAIProvider, AIProvider } from './config';

// 导出核心功能
export {
  googleChat,
  googleChatStream,
  googleChatWithOpenRouter,
  googleChatStreamWithOpenRouter,
  smartChat,
  smartChatStream,
  quickChat,
} from './google-chat';
