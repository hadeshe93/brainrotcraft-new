import { downloadBacklinks } from './index';

// 示例使用

// 示例 1: 串行下载（默认）
async function example1() {
  console.log('=== 示例 1: 串行下载 ===');
  const urls = [
    'https://backgroundremover.com',
    'example.com',
    'www.google.com',
  ];

  const result = await downloadBacklinks(urls);
  console.log('结果:', result);
}

// 示例 2: 并行下载
async function example2() {
  console.log('\n=== 示例 2: 并行下载 ===');
  const urls = [
    'backgroundremover.com',
    'https://example.com',
    'google.com',
  ];

  const result = await downloadBacklinks(urls, true);
  console.log('结果:', result);
}

// 运行示例
(async () => {
  try {
    await example1();
    // await example2(); // 取消注释以测试并行下载
  } catch (error) {
    console.error('错误:', error);
  }
})();
