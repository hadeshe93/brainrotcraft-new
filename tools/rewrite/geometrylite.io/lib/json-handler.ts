/**
 * JSON Handler
 * Export game metadata as JSON for structured data storage
 */

import fs from 'fs/promises';
import type { GameDataExport } from '../types';

export class JsonHandler {
  /**
   * Write game metadata to JSON file
   * Includes all metadata and generated fields (meta title/description)
   * Content is stored separately in markdown files (referenced by contentPath)
   * @param filePath - Path to output JSON file
   * @param data - Array of game metadata
   */
  async writeJson(filePath: string, data: GameDataExport[]): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, json, 'utf-8');
  }

  /**
   * Read JSON data file
   * @param filePath - Path to JSON file
   * @returns Array of game metadata
   */
  async readJson(filePath: string): Promise<GameDataExport[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read JSON from ${filePath}: ${error}`);
    }
  }
}
