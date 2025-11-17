/**
 * Game Import Tool
 * Reads games from JSON files and imports via API
 * Supports multiple files and batch processing
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { config } from 'dotenv';
config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuration
const API_URL = process.env.IMPORT_API_ORIGIN || 'http://localhost:4004';
const API_PATH = '/api/admin/games/import';
const DEFAULT_PATTERN = 'tools/rewrite/geometrylite.io/output/games-*.json';
const STRATEGY = 'upsert' as 'upsert' | 'skip_existing' | 'overwrite';
const BATCH_SIZE = 50;

interface GameData {
  name: string;
  slug: string;
  thumbnail: string;
  source: string;
  status?: string;
  categories: string[];
  tags: string[];
  introduction?: {
    metaTitle: string;
    metaDescription: string;
    content: string;
  };
}

/**
 * Extract slug from URL
 */
function extractSlugFromUrl(url: string): string {
  const match = url.match(/\/([^/]+)\/?$/);
  return match ? match[1] : '';
}

/**
 * Read and parse a single game JSON file
 */
async function readGameFile(filePath: string): Promise<GameData[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);

  // Support both array and object with "games" key
  const rawGames = Array.isArray(data) ? data : data.games || [];

  // Transform raw data if needed (geometrylite.io format)
  const games: GameData[] = [];

  for (const raw of rawGames) {
    // Check if already in correct format
    if (raw.slug) {
      games.push(raw);
      continue;
    }

    // Transform from raw format
    const slug = extractSlugFromUrl(raw.pageUrl || raw.url || '');
    if (!slug) {
      console.warn(`⚠️  Skipping game without valid slug: ${raw.title || 'unknown'}`);
      continue;
    }

    const game: GameData = {
      name: raw.title || raw.name,
      slug,
      thumbnail: raw.coverImage || raw.thumbnail || '',
      source: raw.gameUrl || raw.source || '',
      status: raw.status || 'draft',
      categories: Array.isArray(raw.categories) ? raw.categories.map((c: string) => c.toLowerCase()) : [],
      tags: Array.isArray(raw.tags)
        ? raw.tags.map((t: string) =>
            t
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, ''),
          )
        : [],
    };

    // Add introduction if available
    if (raw.metaTitle || raw.metaDescription || raw.contentPath) {
      let content = '';

      // Read content from markdown file if contentPath exists
      if (raw.contentPath) {
        const contentFileName = raw.contentPath.replace(/^content\//, '');
        const contentFilePath = path.join(
          process.cwd(),
          'tools/rewrite/geometrylite.io/output/content',
          contentFileName,
        );
        try {
          content = await fs.readFile(contentFilePath, 'utf-8');
        } catch (error) {
          console.warn(
            `⚠️  Failed to read content file for ${game.slug}: ${error instanceof Error ? error.message : error}`,
          );
          content = raw.content || '';
        }
      } else {
        content = raw.content || '';
      }

      game.introduction = {
        metaTitle: raw.metaTitle || game.name,
        metaDescription: raw.metaDescription || '',
        content,
      };
    }

    games.push(game);
  }

  return games;
}

/**
 * Import a batch of games via API
 */
async function importBatch(games: GameData[], batchNum: number, totalBatches: number): Promise<any> {
  console.log(`📤 Batch ${batchNum}/${totalBatches}: Sending ${games.length} games...`);

  const url = `${API_URL}${API_PATH}`;
  const payload = {
    data: games,
    strategy: STRATEGY,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.ADMIN_API_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || response.statusText);
  }

  return result.data;
}

/**
 * Main function
 */
async function main() {
  console.log('🎮 Game Import Tool');
  console.log('='.repeat(50));

  // 1. Determine file pattern or path
  const pattern = process.argv[2] || DEFAULT_PATTERN;
  const fullPattern = path.join(process.cwd(), pattern);

  console.log(`🔍 Searching for files: ${pattern}`);

  // 2. Find matching files
  const files = await glob(fullPattern, { nodir: true });

  if (files.length === 0) {
    console.error(`❌ No files found matching pattern: ${pattern}`);
    process.exit(1);
  }

  console.log(`✅ Found ${files.length} file(s)`);

  // 3. Read all games from files
  console.log('📖 Reading games from files...');
  const allGames: GameData[] = [];

  for (const file of files) {
    try {
      const games = await readGameFile(file);
      allGames.push(...games);
      console.log(`  ✓ ${path.basename(file)}: ${games.length} games`);
    } catch (error) {
      console.warn(`  ⚠️  Failed to read ${path.basename(file)}: ${error instanceof Error ? error.message : error}`);
    }
  }

  if (allGames.length === 0) {
    console.error('❌ No games found in any file');
    process.exit(1);
  }

  console.log(`\n✅ Total games to import: ${allGames.length}`);
  console.log(`🎯 Strategy: ${STRATEGY}`);
  console.log(`📦 Batch size: ${BATCH_SIZE}`);
  console.log(`🌐 API URL: ${API_URL}${API_PATH}`);
  console.log('');

  // 4. Split into batches and import
  const batches: GameData[][] = [];
  for (let i = 0; i < allGames.length; i += BATCH_SIZE) {
    batches.push(allGames.slice(i, i + BATCH_SIZE));
  }

  console.log(`🚀 Starting import (${batches.length} batch${batches.length > 1 ? 'es' : ''})...`);
  console.log('');

  const results = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    failedItems: [] as any[],
  };

  for (let i = 0; i < batches.length; i++) {
    try {
      const batchResult = await importBatch(batches[i], i + 1, batches.length);

      results.total += batchResult.total;
      results.created += batchResult.created;
      results.updated += batchResult.updated;
      results.skipped += batchResult.skipped;
      results.failed += batchResult.failed;

      // Collect failed items
      if (batchResult.failed > 0) {
        const failedInBatch = batchResult.items.filter((item: any) => item.status === 'failed');
        results.failedItems.push(...failedInBatch);
      }

      console.log(
        `  ✓ Batch ${i + 1}: ${batchResult.created} created, ${batchResult.updated} updated, ${batchResult.failed} failed`,
      );

      // Small delay between batches to avoid overwhelming the server
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`  ❌ Batch ${i + 1} failed: ${error instanceof Error ? error.message : error}`);
      results.failed += batches[i].length;
    }
  }

  // 5. Display final results
  console.log('');
  console.log('✅ Import process completed!');
  console.log('='.repeat(50));
  console.log(`📊 Final Results:`);
  console.log(`  Total:   ${results.total}`);
  console.log(`  Created: ${results.created} ✨`);
  console.log(`  Updated: ${results.updated} 🔄`);
  console.log(`  Skipped: ${results.skipped} ⏭️`);
  console.log(`  Failed:  ${results.failed} ❌`);

  if (results.failedItems.length > 0) {
    console.log('');
    console.log(`⚠️  Failed items (${results.failedItems.length}):`);
    results.failedItems.slice(0, 10).forEach((item: any) => {
      console.log(`  - ${item.name} (${item.slug}): ${item.error}`);
    });

    if (results.failedItems.length > 10) {
      console.log(`  ... and ${results.failedItems.length - 10} more`);
    }
  }

  // Show warnings if any
  if (results.failed > 0 || results.failedItems.length > 0) {
    console.log('');
    console.log('⚠️  Some items failed. Check the logs above for details.');
  }

  console.log('');
  console.log('🎉 Done!');

  // Exit with error code if there were failures
  if (results.failed > 0) {
    process.exit(1);
  }
}

// 执行： npx tsx tools/batch-import/import-games.ts
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
