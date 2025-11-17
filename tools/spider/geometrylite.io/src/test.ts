import * as path from 'path';
import { Spider, SpiderConfig } from './spider';
import { HttpClient } from './http-client';
import { GameListParser } from './game-list-parser';
import { GameDetailParser } from './game-detail-parser';
import { CsvExporter } from './csv-exporter';

/**
 * 测试入口函数（仅爬取前 2 页）
 */
async function test() {
  console.log('🧪 Running test with limited pages...\n');

  // 测试配置
  const config: SpiderConfig = {
    baseUrl: 'https://geometrylite.io',
    apiUrl: 'https://geometrylite.io/game-new.ajax',
    startPage: 1,
    endPage: 2, // 仅测试前 2 页
    pageSize: 32,
    delayMs: 1000,
    concurrency: 3, // 降低并发数
  };

  // 输出路径
  const outputPath = path.join(__dirname, '../output/games-test.csv');

  // 依赖注入
  const httpClient = new HttpClient();
  const listParser = new GameListParser();
  const detailParser = new GameDetailParser();
  const exporter = new CsvExporter();

  // 创建爬虫实例
  const spider = new Spider(config, httpClient, listParser, detailParser, exporter);

  // 运行爬虫
  try {
    await spider.run(outputPath);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// 执行测试
test();
