import { IHttpClient, IParser, IExporter, GameBasicInfo, GameFullInfo, GameDetailInfo } from './types';
import TurndownService from 'turndown';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 爬虫配置
 */
export interface SpiderConfig {
  baseUrl: string;
  apiUrl: string;
  startPage: number;
  endPage: number;
  pageSize: number;
  delayMs: number;
  concurrency: number;
}

/**
 * 主爬虫协调器
 * 遵循依赖倒置原则：依赖抽象接口而非具体实现
 * 遵循开闭原则：对扩展开放，对修改关闭
 */
export class Spider {
  private config: SpiderConfig;
  private httpClient: IHttpClient;
  private listParser: IParser<GameBasicInfo[]>;
  private detailParser: IParser<GameDetailInfo>;
  private exporter: IExporter<GameFullInfo>;
  private turndownService: TurndownService;
  private contentDir: string;

  constructor(
    config: SpiderConfig,
    httpClient: IHttpClient,
    listParser: IParser<GameBasicInfo[]>,
    detailParser: IParser<GameDetailInfo>,
    exporter: IExporter<GameFullInfo>,
    contentDir: string = 'output/content',
  ) {
    this.config = config;
    this.httpClient = httpClient;
    this.listParser = listParser;
    this.detailParser = detailParser;
    this.exporter = exporter;
    this.contentDir = contentDir;
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });

    // 确保内容目录存在
    if (!fs.existsSync(this.contentDir)) {
      fs.mkdirSync(this.contentDir, { recursive: true });
    }
  }

  /**
   * 运行爬虫
   * @param outputPath 输出文件路径（如 'output/games.csv'，会自动生成 games-001.csv, games-002.csv 等）
   */
  async run(outputPath: string): Promise<void> {
    console.log('🕷️  Starting spider...\n');

    // 第一步：爬取所有游戏列表
    console.log('📋 Step 1: Fetching game lists...');
    const allGames = await this.fetchAllGameLists();
    console.log(`✅ Found ${allGames.length} games\n`);

    // 第二步：爬取每个游戏的详情（并分批导出）
    console.log('🎮 Step 2: Fetching game details and exporting in batches...');
    await this.fetchGameDetailsWithBatchExport(allGames, outputPath);

    console.log('\n🎉 Spider completed successfully!');
  }

  /**
   * 爬取所有分页的游戏列表
   */
  private async fetchAllGameLists(): Promise<GameBasicInfo[]> {
    const allGames: GameBasicInfo[] = [];

    for (let page = this.config.startPage; page <= this.config.endPage; page++) {
      try {
        const url = `${this.config.apiUrl}?page=${page}&limit=${this.config.pageSize}`;
        console.log(`  Fetching page ${page}/${this.config.endPage}...`);

        const html = await this.httpClient.fetch(url);
        const games = this.listParser.parse(html, this.config.baseUrl);

        allGames.push(...games);
        console.log(`    ✓ Found ${games.length} games on page ${page}`);

        // 延迟以避免请求过快
        if (page < this.config.endPage) {
          await this.delay(this.config.delayMs);
        }
      } catch (error) {
        console.error(`  ✗ Error fetching page ${page}:`, error);
      }
    }

    return allGames;
  }

  /**
   * 批量爬取游戏详情并分批导出到 CSV
   * 每收集满 50 条数据就导出一个 CSV 文件
   * @param games 游戏基本信息数组
   * @param outputPath 输出文件路径模板（如 'output/games.csv'）
   */
  private async fetchGameDetailsWithBatchExport(games: GameBasicInfo[], outputPath: string): Promise<void> {
    const total = games.length;
    const batchSize = 50; // 每 50 条数据导出一个文件
    let batchBuffer: GameFullInfo[] = []; // 批次缓冲区
    let batchNumber = 1; // 批次序号
    let processedCount = 0; // 已处理数量

    // 解析输出路径，准备生成带序号的文件名
    const dir = path.dirname(outputPath);
    const ext = path.extname(outputPath);
    const basename = path.basename(outputPath, ext);

    // 分批处理，控制并发
    for (let i = 0; i < total; i += this.config.concurrency) {
      const batch = games.slice(i, i + this.config.concurrency);
      const promises = batch.map((game, index) => this.fetchSingleGameDetail(game, i + index + 1, total));

      const results = await Promise.allSettled(promises);

      // 处理结果并添加到缓冲区
      for (let index = 0; index < results.length; index++) {
        const result = results[index];
        if (result.status === 'fulfilled' && result.value) {
          batchBuffer.push(result.value);
          processedCount++;

          // 当缓冲区达到批次大小时，导出并清空
          if (batchBuffer.length >= batchSize) {
            const batchFileName = `${basename}-${String(batchNumber).padStart(3, '0')}${ext}`;
            const batchFilePath = path.join(dir, batchFileName);

            console.log(`\n💾 Exporting batch ${batchNumber} (${batchBuffer.length} games) to ${batchFileName}...`);
            await this.exporter.export(batchBuffer, batchFilePath);

            batchBuffer = []; // 清空缓冲区
            batchNumber++;
          }
        } else if (result.status === 'rejected') {
          console.error(`  ✗ Error fetching game ${batch[index].title}:`, result.reason);
        }
      }

      // 延迟以避免请求过快
      if (i + this.config.concurrency < total) {
        await this.delay(this.config.delayMs);
      }
    }

    // 导出剩余的数据（不足 100 条）
    if (batchBuffer.length > 0) {
      const batchFileName = `${basename}-${String(batchNumber).padStart(3, '0')}${ext}`;
      const batchFilePath = path.join(dir, batchFileName);

      console.log(`\n💾 Exporting final batch ${batchNumber} (${batchBuffer.length} games) to ${batchFileName}...`);
      await this.exporter.export(batchBuffer, batchFilePath);
    }

    console.log(`\n✅ Exported total ${processedCount} games in ${batchNumber} batch(es)`);
  }

  /**
   * 批量爬取游戏详情（原方法，保留用于可能的其他用途）
   */
  private async fetchGameDetails(games: GameBasicInfo[]): Promise<GameFullInfo[]> {
    const gamesWithDetails: GameFullInfo[] = [];
    const total = games.length;

    // 分批处理，控制并发
    for (let i = 0; i < total; i += this.config.concurrency) {
      const batch = games.slice(i, i + this.config.concurrency);
      const promises = batch.map((game) => this.fetchSingleGameDetail(game, i + 1, total));

      const results = await Promise.allSettled(promises);

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          gamesWithDetails.push(result.value);
        } else if (result.status === 'rejected') {
          console.error(`  ✗ Error fetching game ${batch[index].title}:`, result.reason);
        }
      });

      // 延迟以避免请求过快
      if (i + this.config.concurrency < total) {
        await this.delay(this.config.delayMs);
      }
    }

    return gamesWithDetails;
  }

  /**
   * 爬取单个游戏的详情
   */
  private async fetchSingleGameDetail(game: GameBasicInfo, index: number, total: number): Promise<GameFullInfo | null> {
    try {
      console.log(`  [${index}/${total}] Fetching ${game.title}...`);

      const html = await this.httpClient.fetch(game.url);
      const detailInfo = this.detailParser.parse(html);

      if (!detailInfo.gameUrl) {
        console.warn(`    ⚠ Game URL not found for ${game.title}`);
      }

      // 转换 HTML 到 Markdown 并保存
      const contentPath = await this.saveGameContent(game, detailInfo.contentHtml);

      return {
        ...game,
        gameUrl: detailInfo.gameUrl,
        contentPath,
      };
    } catch (error) {
      console.error(`    ✗ Error fetching ${game.title}:`, error);
      return null;
    }
  }

  /**
   * 保存游戏内容为 Markdown 文件
   * @param game 游戏基本信息
   * @param contentHtml 游戏介绍 HTML
   * @returns Markdown 文件的相对路径
   */
  private async saveGameContent(game: GameBasicInfo, contentHtml: string): Promise<string> {
    // 如果没有内容，返回空字符串
    if (!contentHtml || contentHtml.trim() === '') {
      return '';
    }

    // 生成文件名（使用游戏 URL 的最后一段作为文件名）
    const urlParts = game.url.split('/');
    const slug = urlParts[urlParts.length - 1] || 'unknown';
    const fileName = `${slug}.md`;
    const filePath = path.join(this.contentDir, fileName);

    try {
      // 转换 HTML 到 Markdown
      const markdown = this.turndownService.turndown(contentHtml);

      // 保存到文件
      await fs.promises.writeFile(filePath, markdown, 'utf8');

      // 返回相对路径
      return `content/${fileName}`;
    } catch (error) {
      console.error(`    ✗ Error saving content for ${game.title}:`, error);
      return '';
    }
  }

  /**
   * 延迟辅助方法
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
