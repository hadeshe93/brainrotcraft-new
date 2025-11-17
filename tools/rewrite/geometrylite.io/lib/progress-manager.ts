/**
 * Progress Manager
 * Save and restore global processing progress for resume capability
 * Now manages a single global progress file for all CSV files
 */

import fs from 'fs/promises';
import path from 'path';
import type { GlobalProgress } from '../types';

export class ProgressManager {
  private readonly progressFilePath: string;

  constructor(progressDir: string) {
    this.progressFilePath = path.join(progressDir, 'rewrite-progress.json');
  }

  /**
   * Save global processing progress to file
   * @param progress - Current global processing progress
   */
  async saveGlobalProgress(progress: GlobalProgress): Promise<void> {
    await fs.mkdir(path.dirname(this.progressFilePath), { recursive: true });
    await fs.writeFile(this.progressFilePath, JSON.stringify(progress, null, 2), 'utf-8');
  }

  /**
   * Load existing global progress from file
   * @returns Global progress object or null if not found
   */
  async loadGlobalProgress(): Promise<GlobalProgress | null> {
    try {
      const content = await fs.readFile(this.progressFilePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Clear global progress file after successful completion
   */
  async clearGlobalProgress(): Promise<void> {
    try {
      await fs.unlink(this.progressFilePath);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Get the progress file path (for display purposes)
   */
  getProgressFilePath(): string {
    return this.progressFilePath;
  }
}
