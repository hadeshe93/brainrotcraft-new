# Google AI 工具模块

提供 Google AI (Gemini) 模型的 Chat 功能，支持标准对话和流式响应。

## 环境配置

在使用前，需要设置 Google AI API Key 环境变量：

```bash
# 方式 1
export GOOGLE_AI_API_KEY="your-api-key-here"

# 方式 2
export GOOGLE_API_KEY="your-api-key-here"
```

或者在 `.env` 文件中配置：

```env
GOOGLE_AI_API_KEY=your-api-key-here
```

## 快速开始

### 基础用法

```typescript
import { googleChat } from '@/tools/ai';

const response = await googleChat({
  messages: [{ role: 'user', content: 'Hello! How are you?' }],
});

console.log(response.content);
// 输出: Hello! I'm doing well, thank you...
```

### 多轮对话

```typescript
import { googleChat } from '@/tools/ai';

const response = await googleChat({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is TypeScript?' },
    { role: 'assistant', content: 'TypeScript is a typed superset of JavaScript...' },
    { role: 'user', content: 'Can you give me an example?' },
  ],
});

console.log(response.content);
```

### 快速对话

```typescript
import { quickChat } from '@/tools/ai';

// 不带系统提示词
const response = await quickChat('What is the capital of France?');
console.log(response.content);

// 带系统提示词
const response2 = await quickChat(
  'Explain quantum computing',
  'You are a physics teacher explaining to high school students.',
);
console.log(response2.content);
```

### 流式响应

```typescript
import { googleChatStream } from '@/tools/ai';

const response = await googleChatStream(
  {
    messages: [{ role: 'user', content: 'Tell me a short story' }],
  },
  (chunk) => {
    if (!chunk.isDone) {
      // 实时输出每一个文本块
      process.stdout.write(chunk.delta);
    }
  },
);

console.log('\nFull response:', response.content);
console.log('Tokens used:', response.usage?.totalTokens);
```

## API 参考

### googleChat(options)

发送消息并获取完整响应。

**参数:**

- `options.messages` (必需): 聊天消息数组
- `options.model` (可选): 模型名称，默认 `gemini-2.0-flash-exp`
- `options.temperature` (可选): 温度参数 (0-1)，默认 0.7
- `options.maxTokens` (可选): 最大 token 数，默认 8192
- `options.topP` (可选): Top P 采样参数，默认 0.95

**返回:** Promise\<ChatResponse\>

### googleChatStream(options, onChunk)

发送消息并以流式方式获取响应。

**参数:**

- `options`: 同 `googleChat`
- `onChunk`: 接收流式数据块的回调函数

**返回:** Promise\<ChatResponse\>

### quickChat(prompt, systemPrompt?)

快速发送单条消息。

**参数:**

- `prompt`: 用户消息内容
- `systemPrompt` (可选): 系统提示词

**返回:** Promise\<ChatResponse\>

## 类型定义

### ChatMessage

```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
```

### ChatOptions

```typescript
interface ChatOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}
```

### ChatResponse

```typescript
interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}
```

### ChatStreamChunk

```typescript
interface ChatStreamChunk {
  delta: string;
  isDone: boolean;
}
```

## 高级配置

### 自定义模型参数

```typescript
import { googleChat, DEFAULT_CONFIG } from '@/tools/ai';

const response = await googleChat({
  messages: [{ role: 'user', content: 'Be creative!' }],
  temperature: 1.0, // 更高的随机性
  maxTokens: 4000, // 限制输出长度
  topP: 0.9,
});
```

### 错误处理

```typescript
import { googleChat } from '@/tools/ai';

try {
  const response = await googleChat({
    messages: [{ role: 'user', content: 'Hello!' }],
  });
  console.log(response.content);
} catch (error) {
  console.error('Error:', error.message);
  // 处理错误（如 API Key 未配置、网络错误等）
}
```

## 在自动化脚本中使用

```typescript
// tools/scripts/my-automation.ts
import { googleChat, quickChat } from '@/tools/ai';

async function analyzeData(data: string) {
  const response = await quickChat(`Analyze this data and provide insights: ${data}`, 'You are a data analyst.');

  return response.content;
}

async function generateSummary(texts: string[]) {
  const response = await googleChat({
    messages: [
      {
        role: 'system',
        content: 'Summarize the following texts concisely.',
      },
      {
        role: 'user',
        content: texts.join('\n\n'),
      },
    ],
    temperature: 0.3, // 更确定性的输出
    maxTokens: 500, // 限制摘要长度
  });

  return response.content;
}

// 使用示例
const insights = await analyzeData('Sales data: ...');
console.log(insights);

const summary = await generateSummary(['Text 1...', 'Text 2...']);
console.log(summary);
```

## 支持的模型

默认使用 `gemini-2.0-flash-exp`，你也可以使用其他 Gemini 模型：

- `gemini-2.0-flash-exp` (默认，最新的快速模型)
- `gemini-1.5-pro`
- `gemini-1.5-flash`
- `gemini-1.0-pro`

```typescript
const response = await googleChat({
  model: 'gemini-1.5-pro',
  messages: [...]
});
```

## 注意事项

1. **API Key 安全**: 不要在代码中硬编码 API Key，始终使用环境变量
2. **Token 限制**: 注意不同模型的 token 限制
3. **费用控制**: Google AI API 可能会产生费用，请留意使用量
4. **错误处理**: 生产环境中务必添加适当的错误处理逻辑
5. **速率限制**: 注意 API 的速率限制，避免频繁调用

## 获取 API Key

访问 [Google AI Studio](https://makersuite.google.com/app/apikey) 获取你的 API Key。
