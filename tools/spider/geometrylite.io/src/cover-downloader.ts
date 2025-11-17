import * as fs from 'fs/promises';
import * as path from 'path';
import pLimit from 'p-limit';
import { parse } from 'csv-parse/sync';

/**
 * 下载结果接口
 */
interface DownloadResult {
  url: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  filePath?: string;
}

/**
 * 下载失败记录接口
 */
interface FailedDownload {
  url: string;
  statusCode?: number;
  error: string;
}

/**
 * 封面图下载器
 * 负责并发下载游戏封面图
 */
export class CoverDownloader {
  private downloadConcurrency: number;
  private maxRetries: number;
  private outputDir: string;
  private progressTotal = 0;
  private progressCompleted = 0;
  private progressFailed = 0;

  constructor(outputDir: string, downloadConcurrency = 10, maxRetries = 1) {
    this.outputDir = outputDir;
    this.downloadConcurrency = downloadConcurrency;
    this.maxRetries = maxRetries;
  }

  /**
   * 从 CSV 文件中提取封面图 URL
   * @param csvPath CSV 文件路径
   * @returns 封面图 URL 数组
   */
  private async extractCoverUrlsFromCsv(csvPath: string): Promise<string[]> {
    try {
      const content = await fs.readFile(csvPath, 'utf-8');
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
      });

      return records.map((record: any) => record['Cover Image']).filter((url: string) => url && url.trim());
    } catch (error) {
      console.error(`❌ Failed to read CSV file ${csvPath}:`, error);
      return [];
    }
  }

  /**
   * 从多个 CSV 文件中收集所有封面图 URL
   * @param csvPattern CSV 文件 glob 模式
   * @returns 去重后的封面图 URL 数组
   */
  async collectCoverUrls(csvPattern: string): Promise<string[]> {
    const glob = await import('glob');
    const csvFiles = glob.sync(csvPattern);

    console.log(`📂 Found ${csvFiles.length} CSV files`);

    // 并发读取所有 CSV 文件
    const urlsArrays = await Promise.all(csvFiles.map((file) => this.extractCoverUrlsFromCsv(file)));

    // 合并并去重
    const allUrls = urlsArrays.flat();
    const uniqueUrls = [...new Set(allUrls)];

    console.log(`🔗 Collected ${allUrls.length} URLs (${uniqueUrls.length} unique)`);

    return uniqueUrls;
  }

  /**
   * 从 URL 中提取文件名
   * @param url 图片 URL
   * @returns 文件名
   */
  private getFilenameFromUrl(url: string): string {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return path.basename(pathname);
  }

  /**
   * 下载单个图片
   * @param url 图片 URL
   * @param retryCount 当前重试次数
   * @returns 下载结果
   */
  private async downloadImage(url: string, retryCount = 0): Promise<DownloadResult> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const filename = this.getFilenameFromUrl(url);
      const filePath = path.join(this.outputDir, filename);

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await fs.writeFile(filePath, buffer);

      return {
        url,
        success: true,
        statusCode: response.status,
        filePath,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 重试逻辑
      if (retryCount < this.maxRetries) {
        console.log(`🔄 Retrying ${url} (${retryCount + 1}/${this.maxRetries})...`);
        await this.delay(1000); // 重试前等待 1 秒
        return this.downloadImage(url, retryCount + 1);
      }

      return {
        url,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 延迟函数
   * @param ms 延迟毫秒数
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 更新进度显示
   */
  private updateProgress(): void {
    const progress = ((this.progressCompleted / this.progressTotal) * 100).toFixed(2);
    process.stdout.write(
      `\r📥 Progress: ${this.progressCompleted}/${this.progressTotal} (${progress}%) | ✅ ${this.progressCompleted - this.progressFailed} | ❌ ${this.progressFailed}   `,
    );
  }

  /**
   * 并发下载所有封面图
   * @param urls 封面图 URL 数组
   * @returns 下载结果数组
   */
  async downloadCovers(urls: string[]): Promise<DownloadResult[]> {
    // 确保输出目录存在
    await fs.mkdir(this.outputDir, { recursive: true });

    this.progressTotal = urls.length;
    this.progressCompleted = 0;
    this.progressFailed = 0;

    console.log(`\n📥 Starting download of ${urls.length} cover images...\n`);

    // 使用 p-limit 控制并发数
    const limit = pLimit(this.downloadConcurrency);

    const downloadPromises = urls.map((url) =>
      limit(async () => {
        const result = await this.downloadImage(url);

        this.progressCompleted++;
        if (!result.success) {
          this.progressFailed++;
        }
        this.updateProgress();

        return result;
      }),
    );

    const results = await Promise.all(downloadPromises);

    console.log('\n\n✅ Download completed!\n');

    return results;
  }

  /**
   * 保存失败记录到 JSON 文件
   * @param results 下载结果数组
   * @param outputPath 输出文件路径
   */
  async saveFailedResults(results: DownloadResult[], outputPath: string): Promise<void> {
    const failedDownloads: FailedDownload[] = results
      .filter((r) => !r.success)
      .map((r) => ({
        url: r.url,
        statusCode: r.statusCode,
        error: r.error || 'Unknown error',
      }));

    if (failedDownloads.length > 0) {
      await fs.writeFile(outputPath, JSON.stringify(failedDownloads, null, 2), 'utf-8');
      console.log(`📝 Failed downloads saved to: ${outputPath} (${failedDownloads.length} failures)`);
    } else {
      console.log('✅ All downloads succeeded!');
    }
  }
}
