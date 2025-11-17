/**
 * CSV Handler
 * Read and write CSV files with proper escaping and encoding
 */

import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import fs from 'fs/promises';
import type { GameRecord } from '../types';

export class CsvHandler {
  /**
   * Read CSV file and parse into GameRecord array
   * @param filePath - Path to CSV file
   * @returns Array of game records
   */
  async readCsv(filePath: string): Promise<GameRecord[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const records = parse(content, {
      columns: (header) => {
        // Map CSV column names to GameRecord field names
        return header.map((col: string) => {
          const mapping: Record<string, string> = {
            Title: 'title',
            'Page URL': 'pageUrl',
            'Game URL': 'gameUrl',
            'Cover Image': 'coverImage',
            Rating: 'rating',
            'Content Path': 'contentPath',
            'Meta Title': 'metaTitle',
            'Meta Description': 'metaDescription',
            Categories: 'categories',
            Tags: 'tags',
          };
          return mapping[col] || col;
        });
      },
      skip_empty_lines: true,
      trim: true,
    }) as GameRecord[];
    return records;
  }

  /**
   * Write GameRecord array to CSV file
   * @param filePath - Path to output CSV file
   * @param records - Array of game records
   */
  async writeCsv(filePath: string, records: GameRecord[]): Promise<void> {
    // Map field names back to CSV column names
    const mappedRecords = records.map((record) => ({
      Title: record.title,
      'Page URL': record.pageUrl,
      'Game URL': record.gameUrl,
      'Cover Image': record.coverImage,
      Rating: record.rating,
      'Content Path': record.contentPath,
      'Meta Title': record.metaTitle,
      'Meta Description': record.metaDescription,
    }));

    const csv = stringify(mappedRecords, {
      header: true,
      quoted: true,
    });
    await fs.writeFile(filePath, csv, 'utf-8');
  }
}
