/**
 * Google AI Chat 功能实现
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, streamText } from 'ai';
import type { ChatOptions, ChatResponse, ChatStreamChunk, ChatMessage } from './types';
import { getGoogleApiKey, getOpenRouterApiKey, getAIProvider, AIProvider, DEFAULT_CONFIG } from './config';

/**
 * 创建 Google AI 客户端实例
 */
function createGoogleClient() {
  const apiKey = getGoogleApiKey();
  return createGoogleGenerativeAI({
    apiKey,
  });
}

/**
 * 创建 OpenRouter 客户端实例
 */
function createOpenRouterClient() {
  const apiKey = getOpenRouterApiKey();
  return createOpenRouter({
    apiKey,
  });
}

/**
 * 转换消息格式以符合 AI SDK 要求
 */
function convertMessages(messages: ChatMessage[]) {
  return messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
  }));
}

/**
 * Google AI Chat 功能
 * 发送消息并获取响应
 *
 * @param options - 聊天选项
 * @returns 聊天响应
 *
 * @example
 * ```ts
 * const response = await googleChat({
 *   messages: [
 *     { role: 'user', content: 'Hello!' }
 *   ]
 * });
 * console.log(response.content);
 * ```
 */
export async function googleChat(options: ChatOptions): Promise<ChatResponse> {
  const google = createGoogleClient();

  const {
    messages,
    model = DEFAULT_CONFIG.model,
    temperature = DEFAULT_CONFIG.temperature,
    maxTokens = DEFAULT_CONFIG.maxTokens,
    topP = DEFAULT_CONFIG.topP,
  } = options;

  try {
    const result = await generateText({
      model: google(model),
      messages: convertMessages(messages),
      temperature,
      topP,
      ...(maxTokens && { maxTokens }),
    });

    return {
      content: result.text,
      model,
      usage: result.usage
        ? {
            promptTokens: (result.usage as any).inputTokens || 0,
            completionTokens: (result.usage as any).outputTokens || 0,
            totalTokens: result.usage.totalTokens || 0,
          }
        : undefined,
      finishReason: result.finishReason,
    };
  } catch (error) {
    throw new Error(`Google AI Chat Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Google AI 流式 Chat 功能
 * 发送消息并以流式方式获取响应
 *
 * @param options - 聊天选项
 * @param onChunk - 接收流式数据块的回调函数
 * @returns 完整的聊天响应
 *
 * @example
 * ```ts
 * const response = await googleChatStream(
 *   {
 *     messages: [
 *       { role: 'user', content: 'Tell me a story' }
 *     ]
 *   },
 *   (chunk) => {
 *     process.stdout.write(chunk.delta);
 *   }
 * );
 * console.log('\n', response.content);
 * ```
 */
export async function googleChatStream(
  options: ChatOptions,
  onChunk: (chunk: ChatStreamChunk) => void | Promise<void>,
): Promise<ChatResponse> {
  const google = createGoogleClient();

  const {
    messages,
    model = DEFAULT_CONFIG.model,
    temperature = DEFAULT_CONFIG.temperature,
    maxTokens = DEFAULT_CONFIG.maxTokens,
    topP = DEFAULT_CONFIG.topP,
  } = options;

  try {
    const result = await streamText({
      model: google(model),
      messages: convertMessages(messages),
      temperature,
      topP,
      ...(maxTokens && { maxTokens }),
    });

    let fullContent = '';

    // 处理流式响应
    for await (const chunk of result.textStream) {
      fullContent += chunk;

      await onChunk({
        delta: chunk,
        isDone: false,
      });
    }

    // 发送完成信号
    await onChunk({
      delta: '',
      isDone: true,
    });

    // 等待最终 usage 和 finishReason
    const [usageResult, finishReasonResult] = await Promise.all([result.usage, result.finishReason]);

    return {
      content: fullContent,
      model,
      usage: usageResult
        ? {
            promptTokens: (usageResult as any).inputTokens || 0,
            completionTokens: (usageResult as any).outputTokens || 0,
            totalTokens: usageResult.totalTokens || 0,
          }
        : undefined,
      finishReason: finishReasonResult,
    };
  } catch (error) {
    throw new Error(`Google AI Chat Stream Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 简化的单次对话接口
 * 快速发送一条用户消息并获取响应
 *
 * @param prompt - 用户消息内容
 * @param systemPrompt - 可选的系统提示词
 * @returns 聊天响应
 *
 * @example
 * ```ts
 * const response = await quickChat('What is the capital of France?');
 * console.log(response.content);
 * ```
 */
export async function quickChat(prompt: string, systemPrompt?: string): Promise<ChatResponse> {
  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  messages.push({
    role: 'user',
    content: prompt,
  });

  return googleChat({ messages });
}

/**
 * Google AI Chat 功能（通过 OpenRouter）
 * 使用 OpenRouter 作为代理发送消息并获取响应
 *
 * @param options - 聊天选项
 * @returns 聊天响应
 *
 * @example
 * ```ts
 * const response = await googleChatWithOpenRouter({
 *   messages: [
 *     { role: 'user', content: 'Hello!' }
 *   ],
 *   model: 'google/gemini-2.5-pro'
 * });
 * console.log(response.content);
 * ```
 */
export async function googleChatWithOpenRouter(options: ChatOptions): Promise<ChatResponse> {
  const openrouter = createOpenRouterClient();

  const {
    messages,
    model = 'google/gemini-2.0-flash-exp',
    temperature = DEFAULT_CONFIG.temperature,
    maxTokens = DEFAULT_CONFIG.maxTokens,
    topP = DEFAULT_CONFIG.topP,
  } = options;

  try {
    const result = await generateText({
      model: openrouter(model),
      messages: convertMessages(messages),
      temperature,
      topP,
      ...(maxTokens && { maxTokens }),
    });

    return {
      content: result.text,
      model,
      usage: result.usage
        ? {
            promptTokens: (result.usage as any).inputTokens || (result.usage as any).promptTokens || 0,
            completionTokens: (result.usage as any).outputTokens || (result.usage as any).completionTokens || 0,
            totalTokens: result.usage.totalTokens || 0,
          }
        : undefined,
      finishReason: result.finishReason,
    };
  } catch (error) {
    throw new Error(`Google AI Chat Error (OpenRouter): ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Google AI 流式 Chat 功能（通过 OpenRouter）
 * 使用 OpenRouter 作为代理发送消息并以流式方式获取响应
 *
 * @param options - 聊天选项
 * @param onChunk - 接收流式数据块的回调函数
 * @returns 完整的聊天响应
 *
 * @example
 * ```ts
 * const response = await googleChatStreamWithOpenRouter(
 *   {
 *     messages: [
 *       { role: 'user', content: 'Tell me a story' }
 *     ],
 *     model: 'google/gemini-2.5-pro'
 *   },
 *   (chunk) => {
 *     process.stdout.write(chunk.delta);
 *   }
 * );
 * console.log('\\n', response.content);
 * ```
 */
export async function googleChatStreamWithOpenRouter(
  options: ChatOptions,
  onChunk: (chunk: ChatStreamChunk) => void | Promise<void>,
): Promise<ChatResponse> {
  const openrouter = createOpenRouterClient();

  const {
    messages,
    model = 'google/gemini-2.0-flash-exp',
    temperature = DEFAULT_CONFIG.temperature,
    maxTokens = DEFAULT_CONFIG.maxTokens,
    topP = DEFAULT_CONFIG.topP,
  } = options;

  try {
    const result = await streamText({
      model: openrouter(model),
      messages: convertMessages(messages),
      temperature,
      topP,
      ...(maxTokens && { maxTokens }),
    });

    let fullContent = '';

    // 处理流式响应
    for await (const chunk of result.textStream) {
      fullContent += chunk;

      await onChunk({
        delta: chunk,
        isDone: false,
      });
    }

    // 发送完成信号
    await onChunk({
      delta: '',
      isDone: true,
    });

    // 等待最终 usage 和 finishReason
    const [usageResult, finishReasonResult] = await Promise.all([result.usage, result.finishReason]);

    return {
      content: fullContent,
      model,
      usage: usageResult
        ? {
            promptTokens: (usageResult as any).inputTokens || (usageResult as any).promptTokens || 0,
            completionTokens: (usageResult as any).outputTokens || (usageResult as any).completionTokens || 0,
            totalTokens: usageResult.totalTokens || 0,
          }
        : undefined,
      finishReason: finishReasonResult,
    };
  } catch (error) {
    throw new Error(
      `Google AI Chat Stream Error (OpenRouter): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * 智能 Chat 功能
 * 根据配置自动选择提供商（Google AI 直连 或 OpenRouter）
 *
 * @param options - 聊天选项
 * @returns 聊天响应
 *
 * @example
 * ```ts
 * // 根据环境变量 AI_PROVIDER 自动选择提供商
 * const response = await smartChat({
 *   messages: [
 *     { role: 'user', content: 'Hello!' }
 *   ]
 * });
 * console.log(response.content);
 * ```
 */
export async function smartChat(options: ChatOptions): Promise<ChatResponse> {
  const provider = getAIProvider();

  switch (provider) {
    case AIProvider.OPENROUTER:
      return googleChatWithOpenRouter(options);
    case AIProvider.GOOGLE:
    default:
      return googleChat(options);
  }
}

/**
 * 智能流式 Chat 功能
 * 根据配置自动选择提供商（Google AI 直连 或 OpenRouter）
 *
 * @param options - 聊天选项
 * @param onChunk - 接收流式数据块的回调函数
 * @returns 完整的聊天响应
 *
 * @example
 * ```ts
 * // 根据环境变量 AI_PROVIDER 自动选择提供商
 * const response = await smartChatStream(
 *   {
 *     messages: [
 *       { role: 'user', content: 'Tell me a story' }
 *     ]
 *   },
 *   (chunk) => {
 *     process.stdout.write(chunk.delta);
 *   }
 * );
 * console.log('\\n', response.content);
 * ```
 */
export async function smartChatStream(
  options: ChatOptions,
  onChunk: (chunk: ChatStreamChunk) => void | Promise<void>,
): Promise<ChatResponse> {
  const provider = getAIProvider();

  switch (provider) {
    case AIProvider.OPENROUTER:
      return googleChatStreamWithOpenRouter(options, onChunk);
    case AIProvider.GOOGLE:
    default:
      return googleChatStream(options, onChunk);
  }
}
