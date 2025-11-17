import { createObjectCsvWriter } from 'csv-writer';
import { IExporter, GameFullInfo } from './types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * CSV 导出器
 * 遵循单一职责原则：仅负责将数据导出为 CSV 文件
 */
export class CsvExporter implements IExporter<GameFullInfo> {
  /**
   * 导出游戏数据到 CSV 文件
   * @param data 游戏完整信息数组
   * @param filePath CSV 文件路径
   */
  async export(data: GameFullInfo[], filePath: string): Promise<void> {
    // 确保输出目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 创建 CSV writer
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'title', title: 'Title' },
        { id: 'url', title: 'Page URL' },
        { id: 'gameUrl', title: 'Game URL' },
        { id: 'coverImage', title: 'Cover Image' },
        { id: 'rating', title: 'Rating' },
        { id: 'contentPath', title: 'Content Path' },
      ],
      encoding: 'utf8',
    });

    // 写入数据
    await csvWriter.writeRecords(data);

    console.log(`✅ Exported ${data.length} games to ${filePath}`);
  }
}
