/**
 * Content Reader
 * Read original markdown content files
 */

import fs from 'fs/promises';
import path from 'path';

export class ContentReader {
  constructor(private baseDir: string) {}

  /**
   * Read markdown content from file
   * @param contentPath - Relative path to content file
   * @returns File content as string
   */
  async readContent(contentPath: string): Promise<string> {
    const fullPath = path.join(this.baseDir, contentPath);
    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read content from ${fullPath}: ${error}`);
    }
  }
}
