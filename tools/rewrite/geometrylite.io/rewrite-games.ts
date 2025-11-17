/**
 * Game Content Rewriter
 * Main script for rewriting game content using Gemini AI
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import path from 'path';
import pLimit from 'p-limit';
import fs from 'fs/promises';
import { CsvHandler } from './lib/csv-handler';
import { JsonHandler } from './lib/json-handler';
import { ContentReader } from './lib/content-reader';
import { GeminiRewriter } from './lib/gemini-rewriter';
import { PromptBuilder } from './lib/prompt-builder';
import { Validator } from './lib/validator';
import { ProgressManager } from './lib/progress-manager';
import { Logger } from './lib/logger';
import { CONFIG } from './config';
import type { GameRecord, RewriteResult, GameDataExport, RunMode, GlobalProgress } from './types';

config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Get all CSV files from input directory
 * @returns Sorted array of CSV filenames
 */
async function getCsvFiles(): Promise<string[]> {
  const files = await fs.readdir(CONFIG.inputDir);
  const csvFiles = files.filter((file) => file.startsWith('games-') && file.endsWith('.csv')).sort();
  return csvFiles;
}

export class GameRewriter {
  private csvHandler: CsvHandler;
  private jsonHandler: JsonHandler;
  private contentReader: ContentReader;
  private geminiRewriter: GeminiRewriter;
  private promptBuilder: PromptBuilder;
  private validator: Validator;
  private progressManager: ProgressManager;
  private logger: Logger;

  constructor() {
    this.csvHandler = new CsvHandler();
    this.jsonHandler = new JsonHandler();
    this.contentReader = new ContentReader(CONFIG.inputDir);
    this.geminiRewriter = new GeminiRewriter();
    this.promptBuilder = new PromptBuilder();
    this.validator = new Validator();
    this.progressManager = new ProgressManager(`${CONFIG.outputDir}/progress`);
    this.logger = new Logger(`${CONFIG.outputDir}/logs`);
  }

  /**
   * Process a single game
   * @param game - Game record from CSV
   * @returns Processing result
   */
  async processGame(game: GameRecord): Promise<RewriteResult> {
    let attempts = 0;
    let lastError: string | undefined;

    while (attempts <= CONFIG.retryAttempts) {
      try {
        attempts++;

        // Read original content
        const originalContent = await this.contentReader.readContent(game.contentPath);

        // Build prompt
        const prompt = this.promptBuilder.buildResearchPrompt(game.title, originalContent);

        // Call Gemini with Google Search Grounding
        const content = await this.geminiRewriter.rewriteGameContent(game.title, originalContent, prompt);

        // Validate output
        const validation = this.validator.validate(content);
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        // Save content to markdown file
        await this.saveContentFile(game.title, content);

        // Update game record with meta data
        game.metaTitle = content.metaTitle;
        game.metaDescription = content.metaDescription;
        game.contentPath = `content/${this.slugify(game.title)}.md`;

        return {
          success: true,
          game,
          content,
          attempts,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);

        if (attempts <= CONFIG.retryAttempts) {
          await this.logger.warn(`Attempt ${attempts} failed for "${game.title}", retrying...`, { error: lastError });
          await this.sleep(CONFIG.retryDelay);
        }
      }
    }

    return {
      success: false,
      game,
      error: lastError,
      attempts,
    };
  }

  /**
   * Process CSV file with concurrent processing
   * @param csvFileName - CSV file name
   * @param options - Processing options
   */
  async processCsvFile(
    csvFileName: string,
    options: {
      mode: RunMode;
      csvIndex: number;
      totalCsvFiles: number;
      allCsvFiles: string[];
      processedCsvFiles: string[];
      startGameIndex?: number;
      previousSuccessCount?: number;
      previousFailedGames?: string[];
    },
  ): Promise<void> {
    const {
      mode,
      csvIndex,
      totalCsvFiles,
      allCsvFiles,
      processedCsvFiles,
      startGameIndex = 0,
      previousSuccessCount = 0,
      previousFailedGames = [],
    } = options;

    const inputPath = `${CONFIG.inputDir}/${csvFileName}`;
    const outputPath = `${CONFIG.outputDir}/${mode === 'test' ? csvFileName.replace('.csv', '-test.csv') : csvFileName}`;

    await this.logger.info(`[${csvIndex + 1}/${totalCsvFiles}] Starting CSV file: ${csvFileName}`);

    // Read input CSV
    const games = await this.csvHandler.readCsv(inputPath);
    const totalGames = mode === 'test' ? Math.min(5, games.length) : games.length;
    const gamesToProcess = games.slice(0, totalGames);

    await this.logger.info(`Processing ${totalGames} games (mode: ${mode}, starting from index ${startGameIndex})`);

    // Concurrent processing with p-limit
    const limit = pLimit(CONFIG.concurrency);
    const results: RewriteResult[] = [];
    let accumulatedSuccessCount = previousSuccessCount;
    const accumulatedFailedGames = [...previousFailedGames];

    const tasks = gamesToProcess.slice(startGameIndex).map((game, index) =>
      limit(async () => {
        const actualIndex = startGameIndex + index;
        await this.logger.info(`[${actualIndex + 1}/${totalGames}] Processing: ${game.title}`);

        const result = await this.processGame(game);

        // Update accumulated counters
        if (result.success) {
          accumulatedSuccessCount++;
        } else {
          accumulatedFailedGames.push(game.title);
        }

        // Update global progress after each game
        const globalProgress: GlobalProgress = {
          mode,
          currentCsvFile: csvFileName,
          currentCsvIndex: csvIndex,
          totalCsvFiles,
          allCsvFiles,
          processedCsvFiles,
          currentFileProgress: {
            totalGames,
            processedGames: actualIndex + 1,
            successCount: accumulatedSuccessCount,
            failedGames: accumulatedFailedGames,
            lastProcessedIndex: actualIndex + 1,
          },
          timestamp: new Date().toISOString(),
        };
        await this.progressManager.saveGlobalProgress(globalProgress);

        if (result.success) {
          await this.logger.info(`✅ Success: ${game.title} (attempt ${result.attempts})`);
        } else {
          await this.logger.error(`❌ Failed: ${game.title} after ${result.attempts} attempts`, {
            error: result.error,
          });
        }

        return result;
      }),
    );

    const processedResults = await Promise.all(tasks);
    results.push(...processedResults);

    // Prepare output data
    const successfulResults = results.filter((r) => r.success);
    const successfulGames = successfulResults.map((r) => r.game);

    // Write output CSV
    await this.csvHandler.writeCsv(outputPath, successfulGames);

    // Write output JSON (metadata only, content in separate .md files)
    const jsonOutputPath = outputPath.replace('.csv', '.json');
    const jsonData: GameDataExport[] = successfulResults.map((result) => ({
      title: result.game.title,
      pageUrl: result.game.pageUrl,
      gameUrl: result.game.gameUrl,
      coverImage: result.game.coverImage,
      rating: result.game.rating,
      contentPath: result.game.contentPath,
      metaTitle: result.game.metaTitle!,
      metaDescription: result.game.metaDescription!,
    }));
    await this.jsonHandler.writeJson(jsonOutputPath, jsonData);

    // Summary
    const summary = {
      csvFile: csvFileName,
      csvIndex: csvIndex + 1,
      totalCsvFiles,
      gamesTotal: totalGames,
      gamesSuccessful: successfulGames.length,
      gamesFailed: totalGames - successfulGames.length,
      failedGames: results.filter((r) => !r.success).map((r) => r.game.title),
      outputFiles: {
        csv: outputPath,
        json: jsonOutputPath,
      },
    };

    await this.logger.info('CSV file processing complete', summary);
    console.log(`\n📊 CSV Summary [${csvIndex + 1}/${totalCsvFiles}]:`, summary);

    // If this CSV file completed successfully, add it to processed list
    if (summary.gamesFailed === 0) {
      processedCsvFiles.push(csvFileName);
    }
  }

  /**
   * Save content to markdown file
   * @param gameTitle - Game title
   * @param content - Game content
   */
  private async saveContentFile(gameTitle: string, content: any): Promise<void> {
    const fileName = `${this.slugify(gameTitle)}.md`;
    const filePath = `${CONFIG.outputDir}/content/${fileName}`;

    const markdown = `${content.shortDescription}

## What is ${gameTitle}?

${content.whatIs}

## How to Play ${gameTitle}?

${content.howToPlay}

## What Makes ${gameTitle} Special?

${content.whatMakesSpecial}

## Frequently Asked Questions

${content.faqs.map((faq: any) => `### ${faq.question}\n\n${faq.answer}`).join('\n\n')}
`;

    await fs.mkdir(`${CONFIG.outputDir}/content`, { recursive: true });
    await fs.writeFile(filePath, markdown, 'utf-8');
  }

  /**
   * Convert string to URL-friendly slug
   * @param text - Text to slugify
   * @returns Slugified text
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Sleep for specified milliseconds
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Transform Cover Image URL
   * Extract filename from original URL and prepend with new base URL
   * @param originalUrl - Original cover image URL
   * @returns Transformed URL
   */
  private transformCoverImageUrl(originalUrl: string): string {
    if (!originalUrl) return '';

    const filename = originalUrl.split('/').pop() || '';
    return `https://enqxmjd3.gamesramp.com/gamesramp/covers/${filename}`;
  }

  /**
   * Split comma-separated string into trimmed array
   * @param str - Comma-separated string
   * @returns Array of trimmed strings
   */
  private splitAndTrim(str: string): string[] {
    if (!str) return [];
    return str
      .split(',')
      .map((item) => item.split(';'))
      .flat()
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  /**
   * Reformat CSV files to JSON format
   * Reads games-*.csv files from output directory and converts to JSON
   */
  async reformatCsv2Json(): Promise<void> {
    // 1. Get all CSV files from output directory
    const files = await fs.readdir(CONFIG.outputDir);
    const csvFiles = files.filter((file) => file.startsWith('games-') && file.endsWith('.csv')).sort();

    if (csvFiles.length === 0) {
      console.log('\n⚠️  未在 output 目录中找到 games-*.csv 文件');
      return;
    }

    console.log(`\n📂 发现 ${csvFiles.length} 个 CSV 文件待转换:`, csvFiles);
    await this.logger.info(`Starting CSV to JSON conversion for ${csvFiles.length} files`, { csvFiles });

    // 2. Process files concurrently
    const limit = pLimit(CONFIG.concurrency);
    const tasks = csvFiles.map((csvFile) =>
      limit(async () => {
        try {
          const csvPath = `${CONFIG.outputDir}/${csvFile}`;
          const jsonPath = csvPath.replace('.csv', '.json');

          await this.logger.info(`Converting ${csvFile} to JSON`);
          console.log(`🔄 正在转换: ${csvFile}...`);

          // Read CSV
          const games = await this.csvHandler.readCsv(csvPath);

          // Transform data
          const jsonData: GameDataExport[] = games.map((game) => ({
            title: game.title,
            pageUrl: game.pageUrl,
            gameUrl: game.gameUrl,
            // Transform Cover Image URL
            coverImage: this.transformCoverImageUrl(game.coverImage),
            rating: game.rating,
            contentPath: game.contentPath,
            metaTitle: game.metaTitle || '',
            metaDescription: game.metaDescription || '',
            // Transform Categories and Tags to arrays
            categories: game.categories ? this.splitAndTrim(game.categories) : [],
            tags: game.tags ? this.splitAndTrim(game.tags) : [],
          }));

          // Save to JSON (overwrite if exists)
          await this.jsonHandler.writeJson(jsonPath, jsonData);

          await this.logger.info(`✅ Converted ${csvFile} → ${jsonPath.split('/').pop()}`, {
            count: jsonData.length,
          });
          console.log(`✅ ${csvFile} → ${jsonPath.split('/').pop()} (${jsonData.length} 个游戏)`);

          return { csvFile, jsonFile: jsonPath.split('/').pop(), count: jsonData.length, success: true };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          await this.logger.error(`❌ Failed to convert ${csvFile}`, { error: errorMsg });
          console.error(`❌ 转换失败 ${csvFile}:`, errorMsg);
          return { csvFile, error: errorMsg, success: false };
        }
      }),
    );

    const results = await Promise.all(tasks);

    // 3. Summary
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);
    const totalGames = successful.reduce((sum, r) => sum + (r.count || 0), 0);

    console.log(`\n📊 转换结果总结:`);
    console.log(`   总文件数: ${csvFiles.length}`);
    console.log(`   成功: ${successful.length}`);
    console.log(`   失败: ${failed.length}`);
    console.log(`   总游戏数: ${totalGames}`);

    if (failed.length > 0) {
      console.log(`   失败文件: ${failed.map((r) => r.csvFile).join(', ')}`);
    }

    await this.logger.info('CSV to JSON conversion complete', {
      total: csvFiles.length,
      successful: successful.length,
      failed: failed.length,
      totalGames,
    });
  }

  /**
   * Retry failed games from progress file
   * @param progress - Global progress containing failed games list
   */
  async retryFailedGames(progress: GlobalProgress): Promise<void> {
    const { mode, currentCsvFile, currentFileProgress } = progress;
    const { failedGames } = currentFileProgress;

    console.log(`\n🔄 开始重试 ${failedGames.length} 个失败的游戏...`);

    // 1. Read CSV and filter failed games
    const inputPath = `${CONFIG.inputDir}/${currentCsvFile}`;
    const allGames = await this.csvHandler.readCsv(inputPath);
    const gamesToRetry = allGames.filter((game) => failedGames.includes(game.title));

    if (gamesToRetry.length === 0) {
      console.log('⚠️  在 CSV 文件中未找到需要重试的游戏');
      return;
    }

    await this.logger.info(`Retrying ${gamesToRetry.length} failed games from ${currentCsvFile}`);

    // 2. Process each failed game with concurrent processing
    const limit = pLimit(CONFIG.concurrency);
    const results: RewriteResult[] = [];

    const tasks = gamesToRetry.map((game, index) =>
      limit(async () => {
        await this.logger.info(`[${index + 1}/${gamesToRetry.length}] Retrying: ${game.title}`);
        const result = await this.processGame(game);

        if (result.success) {
          await this.logger.info(`✅ Retry success: ${game.title} (attempt ${result.attempts})`);
        } else {
          await this.logger.error(`❌ Retry failed: ${game.title} after ${result.attempts} attempts`, {
            error: result.error,
          });
        }

        return result;
      }),
    );

    const processedResults = await Promise.all(tasks);
    results.push(...processedResults);

    // 3. Calculate new statistics
    const successfulRetries = results.filter((r) => r.success);
    const stillFailedGames = results.filter((r) => !r.success).map((r) => r.game.title);

    // 4. Read existing output files and append successful retries
    const outputPath = `${CONFIG.outputDir}/${mode === 'test' ? currentCsvFile.replace('.csv', '-test.csv') : currentCsvFile}`;
    const jsonOutputPath = outputPath.replace('.csv', '.json');

    try {
      // Read existing output
      const existingGames = await this.csvHandler.readCsv(outputPath);
      const existingJson = await this.jsonHandler.readJson(jsonOutputPath);

      // Append successful retries
      const newGames = [...existingGames, ...successfulRetries.map((r) => r.game)];
      const newJsonData: GameDataExport[] = [
        ...existingJson,
        ...successfulRetries.map((result) => ({
          title: result.game.title,
          pageUrl: result.game.pageUrl,
          gameUrl: result.game.gameUrl,
          coverImage: result.game.coverImage,
          rating: result.game.rating,
          contentPath: result.game.contentPath,
          metaTitle: result.game.metaTitle!,
          metaDescription: result.game.metaDescription!,
        })),
      ];

      // Write updated output
      await this.csvHandler.writeCsv(outputPath, newGames);
      await this.jsonHandler.writeJson(jsonOutputPath, newJsonData);

      await this.logger.info('Updated output files with successful retries');
    } catch (error) {
      await this.logger.warn('Failed to update output files, they may not exist yet', { error });
    }

    // 5. Update progress
    const updatedProgress: GlobalProgress = {
      ...progress,
      currentFileProgress: {
        ...currentFileProgress,
        successCount: currentFileProgress.successCount + successfulRetries.length,
        failedGames: stillFailedGames,
      },
      timestamp: new Date().toISOString(),
    };

    await this.progressManager.saveGlobalProgress(updatedProgress);

    // 6. Summary
    console.log(`\n📊 重试结果总结:`);
    console.log(`   总重试数: ${gamesToRetry.length}`);
    console.log(`   成功: ${successfulRetries.length}`);
    console.log(`   失败: ${stillFailedGames.length}`);
    if (stillFailedGames.length > 0) {
      console.log(`   仍然失败的游戏: ${stillFailedGames.join(', ')}`);
    }

    await this.logger.info('Retry operation complete', {
      totalRetries: gamesToRetry.length,
      successful: successfulRetries.length,
      failed: stillFailedGames.length,
      stillFailedGames,
    });
  }
}

enum EMainAction {
  Resume = 'resume', // 读取进度文件并继续处理
  Restart = 'restart', // 忽略进度文件并重新开始
  Retry = 'retry', // 重试失败的游戏
  ReformatCsv2Json = 'reformat-csv-2-json', // 将 output 下的 CSV 文件转换为 JSON 文件
}
enum EMainMode {
  Test = 'test',
  Production = 'production',
}
interface MainOptions {
  action: EMainAction;
  mode: EMainMode;
}

// CLI Entry Point
// npx tsx tools/rewrite/geometrylite.io/rewrite-games.ts
async function main(options: MainOptions) {
  const rewriter = new GameRewriter();

  // 1. Get all CSV files
  const csvFilesAll = await getCsvFiles();
  const csvFiles = csvFilesAll.slice(8);
  console.log(`📂 Found ${csvFiles.length} CSV files:`, csvFiles);

  // 2. Check for existing global progress
  const progress = await rewriter['progressManager'].loadGlobalProgress();

  // 3. Handle Retry action separately
  if (options.action === EMainAction.Retry) {
    if (!progress) {
      console.error('\n❌ 无法重试：未检测到进度文件');
      console.log('提示：请先运行一次处理任务，产生进度文件后再使用重试功能\n');
      return;
    }

    if (progress.currentFileProgress.failedGames.length === 0) {
      console.log('\n✅ 没有需要重试的失败游戏\n');
      return;
    }

    console.log('\n🔍 检测到进度文件');
    console.log(`📋 当前模式: ${progress.mode === 'test' ? '测试模式' : '生产模式'}`);
    console.log(`📋 CSV 文件: ${progress.currentCsvFile}`);
    console.log(`📋 失败游戏数: ${progress.currentFileProgress.failedGames.length}`);
    console.log(`📋 失败游戏列表: ${progress.currentFileProgress.failedGames.join(', ')}`);

    await rewriter.retryFailedGames(progress);

    console.log('\n🎉 重试完成！');
    return;
  }

  // 4. Handle ReformatCsv2Json action separately
  if (options.action === EMainAction.ReformatCsv2Json) {
    console.log('\n🔄 开始 CSV 转 JSON 格式化...');
    await rewriter.reformatCsv2Json();
    console.log('\n🎉 格式化完成！');
    return;
  }

  // 4. Determine action based on options (Resume/Restart)
  let shouldRestart = false;
  let mode: RunMode;

  if (progress) {
    console.log('\n🔍 检测到全局断点恢复文件');
    console.log(
      `   当前进度: ${progress.currentCsvFile} (第 ${progress.currentCsvIndex + 1}/${progress.totalCsvFiles} 个文件)`,
    );
    console.log(
      `   当前文件进度: ${progress.currentFileProgress.processedGames}/${progress.currentFileProgress.totalGames} 游戏`,
    );

    if (options.action === EMainAction.Restart) {
      shouldRestart = true;
      await rewriter['progressManager'].clearGlobalProgress();
      mode = options.mode as RunMode;
      console.log('✅ 进度文件已删除，将从头开始处理\n');
      console.log(`📋 运行模式: ${mode === 'test' ? '测试模式' : '生产模式'}\n`);
    } else {
      // Resume from checkpoint
      mode = progress.mode;
      console.log('✅ 将从上次断点继续处理\n');
      console.log(`📋 继续使用之前的运行模式: ${mode === 'test' ? '测试模式' : '生产模式'}\n`);
    }
  } else {
    // No progress file, start fresh
    console.log('\nℹ️  未检测到断点恢复文件，将从头开始处理\n');
    mode = options.mode as RunMode;
    console.log(`📋 运行模式: ${mode === 'test' ? '测试模式' : '生产模式'}\n`);
  }

  // 5. Process all CSV files
  const startCsvIndex = shouldRestart || !progress ? 0 : progress.currentCsvIndex;
  const startGameIndex = shouldRestart || !progress ? 0 : progress.currentFileProgress.lastProcessedIndex;
  const processedCsvFiles = shouldRestart || !progress ? [] : progress.processedCsvFiles;

  console.log(`\n🚀 开始处理 (模式: ${mode === 'test' ? '测试' : '生产'})`);
  console.log(`   CSV 文件范围: ${startCsvIndex + 1} - ${csvFiles.length}`);
  console.log(`   起始游戏索引: ${startGameIndex}\n`);

  for (let i = startCsvIndex; i < csvFiles.length; i++) {
    const csvFile = csvFiles[i];

    await rewriter.processCsvFile(csvFile, {
      mode,
      csvIndex: i,
      totalCsvFiles: csvFiles.length,
      allCsvFiles: csvFiles,
      processedCsvFiles,
      startGameIndex: i === startCsvIndex ? startGameIndex : 0, // Only use saved index for first CSV
      previousSuccessCount: i === startCsvIndex && progress ? progress.currentFileProgress.successCount : 0,
      previousFailedGames: i === startCsvIndex && progress ? progress.currentFileProgress.failedGames : [],
    });
  }

  // Clear progress if all files completed successfully
  const finalProgress = await rewriter['progressManager'].loadGlobalProgress();
  if (finalProgress && finalProgress.processedCsvFiles.length === csvFiles.length) {
    await rewriter['progressManager'].clearGlobalProgress();
    console.log('\n✅ 所有 CSV 文件处理完成，进度文件已清除');
  } else {
    console.log(`\n⚠️  部分 CSV 文件处理失败，进度文件保留: ${rewriter['progressManager'].getProgressFilePath()}`);
  }

  console.log('\n🎉 全部处理完成！');
}

// 执行： npx tsx tools/rewrite/geometrylite.io/rewrite-games.ts
if (require.main === module) {
  // Default options: ReformatCsv2Json (convert CSV to JSON)
  const defaultOptions: MainOptions = {
    action: EMainAction.ReformatCsv2Json,
    mode: EMainMode.Production,
  };
  main(defaultOptions).catch(console.error);
}
