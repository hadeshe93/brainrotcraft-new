import * as path from 'path';
import { Spider, SpiderConfig } from './spider';
import { HttpClient } from './http-client';
import { GameListParser } from './game-list-parser';
import { GameDetailParser } from './game-detail-parser';
import { CsvExporter } from './csv-exporter';
import { CoverDownloader } from './cover-downloader';

/**
 * 主入口函数 - 爬取游戏数据
 */
async function scrapeGames() {
  // 配置
  const config: SpiderConfig = {
    baseUrl: 'https://geometrylite.io',
    apiUrl: 'https://geometrylite.io/game-new.ajax',
    startPage: 1,
    endPage: 17,
    pageSize: 32,
    delayMs: 1000, // 每次请求延迟 1 秒
    concurrency: 5, // 并发请求数
  };

  // 输出路径
  const outputPath = path.join(__dirname, '../output/games.csv');

  // 依赖注入：创建所有依赖
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
    console.error('❌ Spider failed:', error);
    process.exit(1);
  }
}

/**
 * 主入口函数 - 下载封面图
 */
async function downloadCovers() {
  console.log('🚀 Starting cover image download task...\n');

  // 配置路径
  const csvPattern = path.join(__dirname, '../output/games-*.csv');
  const coversDir = path.join(__dirname, '../output/covers');
  const failedResultsPath = path.join(__dirname, '../output/download-cover-results.json');

  // 创建下载器实例
  const downloader = new CoverDownloader(
    coversDir,
    10, // 并发数为 10
    1, // 重试次数为 1
  );

  try {
    // 1. 收集所有封面图 URL
    console.log('📋 Step 1: Collecting cover image URLs from CSV files...\n');
    const urls = await downloader.collectCoverUrls(csvPattern);

    if (urls.length === 0) {
      console.log('⚠️  No cover image URLs found. Exiting.');
      return;
    }

    // 2. 并发下载封面图
    console.log(`\n📋 Step 2: Downloading ${urls.length} cover images...`);
    const results = await downloader.downloadCovers(urls);

    // 3. 保存失败记录
    console.log('\n📋 Step 3: Saving failed download records...\n');
    await downloader.saveFailedResults(results, failedResultsPath);

    // 统计
    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    console.log('\n📊 Download Summary:');
    console.log(`   Total: ${results.length}`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    console.log(`\n📁 Covers saved to: ${coversDir}`);

    if (failedCount > 0) {
      console.log(`📝 Failed results: ${failedResultsPath}`);
    }
  } catch (error) {
    console.error('❌ Cover download failed:', error);
    process.exit(1);
  }
}

// 执行
// 根据命令行参数选择执行哪个任务
const task = process.argv[2] || 'scrape';

if (task === 'download-covers') {
  downloadCovers();
} else if (task === 'scrape') {
  scrapeGames();
} else {
  console.log('Usage:');
  console.log('  npm start                    # Scrape game data');
  console.log('  npm start download-covers    # Download cover images');
  process.exit(1);
}
