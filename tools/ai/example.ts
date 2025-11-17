/**
 * Google AI 模块使用示例
 *
 * 运行方式:
 * 1. 设置环境变量: export GOOGLE_AI_API_KEY="your-api-key"
 * 2. 执行脚本: pnpm tsx tools/ai/example.ts
 */

import { googleChat, quickChat, googleChatStream } from './index';

/**
 * 示例 1: 基础对话
 */
async function example1() {
  console.log('\n=== 示例 1: 基础对话 ===\n');

  const response = await googleChat({
    messages: [
      {
        role: 'user',
        content: 'What is TypeScript in one sentence?',
      },
    ],
  });

  console.log('Response:', response.content);
  console.log('Tokens used:', response.usage?.totalTokens);
}

/**
 * 示例 2: 多轮对话
 */
async function example2() {
  console.log('\n=== 示例 2: 多轮对话 ===\n');

  const response = await googleChat({
    messages: [
      {
        role: 'system',
        content: 'You are a helpful programming tutor.',
      },
      {
        role: 'user',
        content: 'What is the difference between let and const?',
      },
      {
        role: 'assistant',
        content: 'let allows you to reassign values, while const creates read-only references.',
      },
      {
        role: 'user',
        content: 'Can you show me an example?',
      },
    ],
    temperature: 0.5, // 降低随机性以获得更确定的回答
  });

  console.log('Response:', response.content);
}

/**
 * 示例 3: 快速对话
 */
async function example3() {
  console.log('\n=== 示例 3: 快速对话 ===\n');

  const response = await quickChat('List 3 benefits of using TypeScript', 'You are a concise technical writer.');

  console.log('Response:', response.content);
}

/**
 * 示例 4: 流式响应
 */
async function example4() {
  console.log('\n=== 示例 4: 流式响应 ===\n');

  process.stdout.write('Streaming response: ');

  const response = await googleChatStream(
    {
      messages: [
        {
          role: 'user',
          content: 'Write a short haiku about coding',
        },
      ],
    },
    (chunk) => {
      if (!chunk.isDone) {
        process.stdout.write(chunk.delta);
      }
    },
  );

  console.log('\n\nFull response:', response.content);
  console.log('Finish reason:', response.finishReason);
}

/**
 * 示例 5: 错误处理
 */
async function example5() {
  console.log('\n=== 示例 5: 错误处理 ===\n');

  try {
    // 尝试使用不存在的模型
    const response = await googleChat({
      messages: [
        {
          role: 'user',
          content: 'Hello',
        },
      ],
      model: 'invalid-model-name',
    });

    console.log('Response:', response.content);
  } catch (error) {
    console.error('捕获到错误:', error instanceof Error ? error.message : error);
  }
}

/**
 * 示例 6: 自动化脚本场景 - 批量文本分析
 */
async function example6() {
  console.log('\n=== 示例 6: 批量文本分析 ===\n');

  const texts = [
    'TypeScript adds static typing to JavaScript.',
    'React is a popular UI library.',
    'Node.js allows JavaScript to run on the server.',
  ];

  console.log('分析以下文本:');
  texts.forEach((text, i) => console.log(`${i + 1}. ${text}`));

  const response = await googleChat({
    messages: [
      {
        role: 'system',
        content: 'You are a technical content analyzer. Provide a brief summary and categorization.',
      },
      {
        role: 'user',
        content: `Analyze these texts and provide a summary:\n\n${texts.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
      },
    ],
    temperature: 0.3,
    maxTokens: 500,
  });

  console.log('\n分析结果:');
  console.log(response.content);
}

/**
 * 示例 7: 自动化脚本场景 - 代码审查助手
 */
async function example7() {
  console.log('\n=== 示例 7: 代码审查助手 ===\n');

  const code = `
function add(a, b) {
  return a + b;
}

const result = add(5, "10");
console.log(result);
  `.trim();

  const response = await quickChat(
    `Review this JavaScript code and point out potential issues:\n\n\`\`\`javascript\n${code}\n\`\`\``,
    'You are a senior code reviewer. Provide constructive feedback focusing on type safety and best practices.',
  );

  console.log('代码审查结果:');
  console.log(response.content);
}

/**
 * 主函数
 */
async function main() {
  console.log('Google AI 模块使用示例');
  console.log('========================');

  try {
    // 运行所有示例（按需注释/取消注释）
    await example1();
    await example2();
    await example3();
    await example4();
    // await example5(); // 这个示例会产生错误，可按需启用
    await example6();
    await example7();

    console.log('\n所有示例运行完成！');
  } catch (error) {
    console.error('\n运行示例时出错:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

export { main };
