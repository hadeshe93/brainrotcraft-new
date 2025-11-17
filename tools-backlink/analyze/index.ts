/**
 * CSV 域名统计工具
 *
 * 功能：从多份 CSV 文件中提取 "Source url" 列的域名，统计出现次数，
 *       过滤高频域名并输出到 output.csv
 *
 * 设计原则：遵循 SOLID 原则，高内聚低耦合
 * 详细设计方案见：tools/PLAN.md
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import * as chardet from 'chardet';
import * as iconv from 'iconv-lite';

// ============================================================================
// 类型定义层 (Type Definitions)
// ============================================================================

/** CSV 行数据类型 */
interface CsvRow {
  [key: string]: string;
}

/** 域名统计信息 */
interface DomainStats {
  domain: string;
  count: number;
  urls: string[];
}

/** 域名条目（Map 存储） */
interface DomainEntry {
  count: number;
  urls: Set<string>;
}

/** 输出行格式 */
interface OutputRow {
  domain: string;
  count: number;
  sampleUrl1: string;
  sampleUrl2: string;
  sampleUrl3: string;
}

/** 处理总结信息 */
interface ProcessSummary {
  totalFiles: number;
  totalRows: number;
  totalDomains: number;
  filteredDomains: number;
}

// ============================================================================
// 文件操作层 (File Operations)
// ============================================================================

/**
 * 扫描目录获取所有 .csv 文件路径
 * @param dirPath 目录路径
 * @returns CSV 文件路径数组
 */
async function getAllCsvFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const csvFiles = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.csv'))
      .map((entry) => path.join(dirPath, entry.name));
    return csvFiles;
  } catch (error) {
    throw new Error(`无法读取目录 ${dirPath}: ${error}`);
  }
}

/**
 * 自动检测文件编码
 * @param filePath 文件路径
 * @returns 编码名称 (如 'utf-8', 'gbk')
 */
async function detectFileEncoding(filePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath);
    const detected = chardet.detect(buffer);
    return detected || 'utf-8';
  } catch (error) {
    console.warn(`编码检测失败，使用默认 utf-8: ${filePath}`);
    return 'utf-8';
  }
}

/**
 * 读取并解析单个 CSV 文件
 * @param filePath 文件路径
 * @param encoding 编码格式
 * @returns CSV 行数据数组
 */
async function readAndParseCsv(filePath: string, encoding: string): Promise<CsvRow[]> {
  try {
    const buffer = await fs.readFile(filePath);
    const content = iconv.decode(buffer, encoding);

    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    }) as CsvRow[];

    return records;
  } catch (error) {
    throw new Error(`解析 CSV 文件失败 ${filePath}: ${error}`);
  }
}

// ============================================================================
// 数据提取层 (Data Extraction)
// ============================================================================

/**
 * 从 URL 提取域名（纯函数）
 * @param url URL 字符串
 * @returns 域名字符串 或 null（无效 URL）
 */
function extractDomainFromUrl(url: string): string | null {
  try {
    // 确保 URL 有协议前缀
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return null;
  }
}

/**
 * 从 CSV 行中提取指定列的 URL
 * @param rows CSV 行数组
 * @param columnName 列名
 * @returns URL 字符串数组
 */
function extractSourceUrls(rows: CsvRow[], columnName: string): string[] {
  const urls: string[] = [];

  for (const row of rows) {
    const url = row[columnName];
    if (url && typeof url === 'string' && url.trim()) {
      urls.push(url.trim());
    }
  }

  return urls;
}

// ============================================================================
// 统计分析层 (Statistics)
// ============================================================================

/**
 * 统计每个域名的出现次数和对应的 URL 列表
 * @param urls URL 数组
 * @returns 域名统计 Map
 */
function collectDomainStatistics(urls: string[]): Map<string, DomainEntry> {
  const statsMap = new Map<string, DomainEntry>();

  for (const url of urls) {
    const domain = extractDomainFromUrl(url);
    if (!domain) {
      continue; // 跳过无效 URL
    }

    if (!statsMap.has(domain)) {
      statsMap.set(domain, {
        count: 0,
        urls: new Set(),
      });
    }

    const entry = statsMap.get(domain)!;
    entry.count++;
    entry.urls.add(url);
  }

  return statsMap;
}

/**
 * 合并多个域名统计 Map
 * @param targetMap 目标 Map
 * @param sourceMap 源 Map
 */
function mergeDomainStatistics(targetMap: Map<string, DomainEntry>, sourceMap: Map<string, DomainEntry>): void {
  for (const [domain, sourceEntry] of sourceMap.entries()) {
    if (!targetMap.has(domain)) {
      targetMap.set(domain, {
        count: sourceEntry.count,
        urls: new Set(sourceEntry.urls),
      });
    } else {
      const targetEntry = targetMap.get(domain)!;
      targetEntry.count += sourceEntry.count;
      for (const url of sourceEntry.urls) {
        targetEntry.urls.add(url);
      }
    }
  }
}

/**
 * 过滤出现次数 >= n 的域名
 * @param stats 统计 Map
 * @param minCount 最小次数
 * @returns 过滤后的域名统计数组
 */
function filterByMinimumCount(stats: Map<string, DomainEntry>, minCount: number): DomainStats[] {
  const filtered: DomainStats[] = [];

  for (const [domain, entry] of stats.entries()) {
    if (entry.count >= minCount) {
      filtered.push({
        domain,
        count: entry.count,
        urls: Array.from(entry.urls),
      });
    }
  }

  return filtered;
}

/**
 * 按出现次数降序排序
 * @param stats 域名统计数组
 * @returns 排序后的数组
 */
function sortByFrequency(stats: DomainStats[]): DomainStats[] {
  return [...stats].sort((a, b) => b.count - a.count);
}

// ============================================================================
// 输出格式化层 (Output Formatting)
// ============================================================================

/**
 * 从 URL 列表中随机选择指定数量的样本
 * @param urls URL 数组
 * @param count 采样数量
 * @returns 随机选择的 URL 数组（去重）
 */
function selectRandomSamples(urls: string[], count: number): string[] {
  if (urls.length <= count) {
    return [...urls];
  }

  // Fisher-Yates 洗牌算法
  const shuffled = [...urls];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

/**
 * 格式化为输出行，填充固定 3 列示例 URL
 * @param entries 域名统计数组
 * @returns 输出行数组
 */
function formatOutputRows(entries: DomainStats[]): OutputRow[] {
  return entries.map((entry) => {
    const samples = selectRandomSamples(entry.urls, 3);
    return {
      domain: entry.domain,
      count: entry.count,
      sampleUrl1: samples[0] || '',
      sampleUrl2: samples[1] || '',
      sampleUrl3: samples[2] || '',
    };
  });
}

/**
 * 将数据写入 CSV 文件
 * @param rows 输出行数组
 * @param outputPath 输出路径
 */
async function writeCsvOutput(rows: OutputRow[], outputPath: string): Promise<void> {
  try {
    const csv = stringify(rows, {
      header: true,
      columns: {
        domain: '域名地址',
        count: '出现次数',
        sampleUrl1: '示例url1',
        sampleUrl2: '示例url2',
        sampleUrl3: '示例url3',
      },
    });

    await fs.writeFile(outputPath, csv, 'utf-8');
  } catch (error) {
    throw new Error(`写入 CSV 文件失败 ${outputPath}: ${error}`);
  }
}

// ============================================================================
// 进度跟踪层 (Progress Tracking)
// ============================================================================

/**
 * 进度跟踪器类
 */
class ProgressTracker {
  private totalFiles: number = 0;
  private processedFiles: number = 0;
  private totalRows: number = 0;
  private failedFiles: string[] = [];

  /**
   * 设置总文件数
   */
  setTotalFiles(count: number): void {
    this.totalFiles = count;
  }

  /**
   * 开始处理文件
   */
  startFile(filename: string): void {
    const basename = path.basename(filename);
    console.log(`\n[${this.processedFiles + 1}/${this.totalFiles}] 处理文件: ${basename}`);
  }

  /**
   * 完成文件处理
   */
  completeFile(rowCount: number): void {
    this.processedFiles++;
    this.totalRows += rowCount;
    console.log(`  ✓ 处理了 ${rowCount.toLocaleString()} 行数据`);
  }

  /**
   * 记录失败的文件
   */
  recordFailure(filename: string, error: string): void {
    this.failedFiles.push(filename);
    console.error(`  ✗ 处理失败: ${error}`);
  }

  /**
   * 打印当前进度
   */
  printProgress(): void {
    console.log(`\n进度: ${this.processedFiles}/${this.totalFiles} 文件，累计 ${this.totalRows.toLocaleString()} 行`);
  }

  /**
   * 获取总结信息
   */
  getSummary(): ProcessSummary & { failedFiles: string[] } {
    return {
      totalFiles: this.processedFiles,
      totalRows: this.totalRows,
      totalDomains: 0, // 将在主函数中设置
      filteredDomains: 0, // 将在主函数中设置
      failedFiles: this.failedFiles,
    };
  }
}

// ============================================================================
// 主协调函数 (Main Orchestration)
// ============================================================================

/**
 * 处理 CSV 文件，统计域名并输出结果
 *
 * @param dirPath 包含 CSV 文件的目录路径
 * @param minCount 域名最少出现次数（过滤阈值）
 * @returns 是否处理成功
 *
 * @example
 * ```typescript
 * const success = await processCsvDomains('/path/to/csv/folder', 2);
 * if (success) {
 *   console.log('处理完成！');
 * }
 * ```
 */
export async function processCsvDomains(dirPath: string, minCount: number): Promise<boolean> {
  const startTime = Date.now();
  console.log('==================== CSV 域名统计工具 ====================\n');
  console.log(`📁 输入目录: ${dirPath}`);
  console.log(`🔢 过滤条件: 域名出现次数 >= ${minCount}`);
  console.log('');

  try {
    // 1. 初始化
    const tracker = new ProgressTracker();
    const globalStats = new Map<string, DomainEntry>();

    // 2. 扫描目录
    console.log('🔍 扫描 CSV 文件...');
    const csvFiles = await getAllCsvFiles(dirPath);

    if (csvFiles.length === 0) {
      console.error('❌ 目录中没有找到 CSV 文件');
      return false;
    }

    console.log(`✓ 找到 ${csvFiles.length} 个 CSV 文件\n`);
    tracker.setTotalFiles(csvFiles.length);

    // 3. 逐个处理文件
    for (const filePath of csvFiles) {
      tracker.startFile(filePath);

      try {
        // 检测编码
        const encoding = await detectFileEncoding(filePath);

        // 读取并解析
        const rows = await readAndParseCsv(filePath, encoding);

        // 检查是否有 "Source url" 列
        if (rows.length > 0 && !('Source url' in rows[0])) {
          throw new Error('未找到 "Source url" 列');
        }

        // 提取 URL
        const urls = extractSourceUrls(rows, 'Source url');

        // 统计域名
        const fileStats = collectDomainStatistics(urls);
        mergeDomainStatistics(globalStats, fileStats);

        // 更新进度
        tracker.completeFile(rows.length);
      } catch (error) {
        tracker.recordFailure(filePath, String(error));
      }
    }

    // 4. 过滤和排序
    console.log('\n📊 统计分析...');
    const filteredStats = filterByMinimumCount(globalStats, minCount);
    const sortedStats = sortByFrequency(filteredStats);

    console.log(`✓ 总域名数: ${globalStats.size.toLocaleString()}`);
    console.log(`✓ 符合条件的域名数: ${sortedStats.length.toLocaleString()}`);

    // 5. 格式化输出
    console.log('\n💾 生成输出文件...');
    const outputRows = formatOutputRows(sortedStats);
    const outputPath = path.join(path.dirname(import.meta.url.replace('file://', '')), 'output.csv');
    await writeCsvOutput(outputRows, outputPath);

    console.log(`✓ 输出文件: ${outputPath}`);

    // 6. 打印总结
    const summary = tracker.getSummary();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n==================== 处理完成 ====================');
    console.log(`📁 处理文件数: ${summary.totalFiles}`);
    console.log(`📊 总行数: ${summary.totalRows.toLocaleString()}`);
    console.log(`🌐 总域名数: ${globalStats.size.toLocaleString()}`);
    console.log(`✅ 符合条件的域名数: ${sortedStats.length.toLocaleString()} (出现 >= ${minCount} 次)`);
    console.log(`⏱️  处理耗时: ${elapsed} 秒`);

    if (summary.failedFiles.length > 0) {
      console.log(`\n⚠️  失败文件数: ${summary.failedFiles.length}`);
      summary.failedFiles.forEach((file) => {
        console.log(`  - ${path.basename(file)}`);
      });
    }

    console.log('==============================================\n');

    return true;
  } catch (error) {
    console.error('\n❌ 处理失败:', error);
    return false;
  }
}

// ============================================================================
// 示例调用 (Example Usage)
// ============================================================================

// 如果直接运行此文件，执行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  // 示例：处理指定目录的 CSV 文件
  const csvDirectory = process.argv[2] || path.resolve(__dirname, '../download/output');
  // const csvDirectory = process.argv[2] || '/Users/hadeshe/xcode/cursors/bgremover/tools-download-backlinks/output';
  const minOccurrences = parseInt(process.argv[3]) || 2;

  processCsvDomains(csvDirectory, minOccurrences)
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
