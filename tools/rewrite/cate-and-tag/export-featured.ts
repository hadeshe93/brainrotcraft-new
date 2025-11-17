#!/usr/bin/env tsx

import { writeFileSync } from 'fs';
import { join } from 'path';
import { eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { FeaturedOutput, FeaturedItem } from './types';

// Import Cloudflare D1 types and schema
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(): Promise<T[]>;
}

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    rows_read: number;
    rows_written: number;
  };
}

interface D1ExecResult {
  count: number;
  duration: number;
}

/**
 * Featured Item from Database
 */
interface DbFeaturedItem {
  uuid: string;
  name: string;
  slug: string;
  metadataTitle: string;
  metadataDescription: string;
  content: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

/**
 * Configuration
 */
const OUTPUT_DIR = join(__dirname, 'output');
const OUTPUT_FILE = join(OUTPUT_DIR, 'game-featured.json');
const DB_PATH = join(__dirname, '../../../.wrangler/state/v3/d1/miniflare-D1DatabaseObject');

/**
 * Fetch all featured items directly from D1 database
 */
async function fetchAllFeaturedItems(): Promise<DbFeaturedItem[]> {
  try {
    console.log('📡 Fetching featured items from local D1 database...');

    // Use wrangler d1 execute to query the database
    const { execSync } = await import('child_process');

    const query = `
      SELECT uuid, name, slug, metadata_title as metadataTitle,
             metadata_description as metadataDescription, content,
             created_at as createdAt, updated_at as updatedAt, deleted_at as deletedAt
      FROM featured
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `;

    // Execute query using wrangler
    const result = execSync(
      `pnpm wrangler d1 execute gamesramp --local --command "${query.replace(/\n/g, ' ').trim()}"`,
      {
        cwd: join(__dirname, '../../..'),
        encoding: 'utf-8',
      },
    );

    // Parse the result - wrangler returns JSON format
    try {
      // Try to extract JSON from the output
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.log('No JSON array found in output');
        return [];
      }

      // wrangler returns an array with a single object containing results
      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        results: DbFeaturedItem[];
        success: boolean;
        meta: { duration: number };
      }>;

      // Extract the actual results from the first element
      const items = parsed[0]?.results || [];
      console.log(`✓ Fetched ${items.length} featured items from database\n`);
      return items;
    } catch (parseError) {
      console.error('Failed to parse JSON result:', parseError);
      console.log('Result was:', result);
      return [];
    }
  } catch (error) {
    console.error('❌ Failed to fetch from database:', error);
    throw error;
  }
}

/**
 * Transform database data to output format
 */
function transformToOutput(items: DbFeaturedItem[]): FeaturedOutput {
  const featured: FeaturedItem[] = items.map((item) => ({
    name: item.name,
    slug: item.slug,
    content: item.content || '',
    metaTitle: item.metadataTitle || '',
    metaDescription: item.metadataDescription || '',
  }));

  return {
    featured,
    metadata: {
      totalCount: featured.length,
      generatedAt: new Date().toISOString(),
      source: 'database (featured table - local D1)',
    },
  };
}

/**
 * Save data to JSON file
 */
function saveToJson(data: FeaturedOutput): void {
  try {
    const jsonContent = JSON.stringify(data, null, 2);
    writeFileSync(OUTPUT_FILE, jsonContent, 'utf-8');
    console.log(`✓ Saved to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ Failed to save JSON file:', error);
    throw error;
  }
}

/**
 * Display summary
 */
function displaySummary(data: FeaturedOutput): void {
  console.log('\n=== Export Summary ===');
  console.log(`Total featured items: ${data.metadata.totalCount}`);
  console.log(`Generated at: ${data.metadata.generatedAt}`);
  console.log(`Source: ${data.metadata.source}`);

  if (data.featured.length > 0) {
    console.log('\nFeatured items:');
    data.featured.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.name} (${item.slug})`);
    });
  }

  console.log('\n✅ Export completed successfully!');
}

/**
 * Main execution
 */
async function main() {
  console.log('=== Featured Data Export Tool ===\n');

  try {
    // Step 1: Fetch all items from database
    const dbItems = await fetchAllFeaturedItems();

    if (dbItems.length === 0) {
      console.warn('⚠️  No featured items found in database');
      // Still create an empty output file
      const emptyOutput = transformToOutput([]);
      saveToJson(emptyOutput);
      displaySummary(emptyOutput);
      return;
    }

    // Step 2: Transform to output format
    console.log('🔄 Transforming data...');
    const output = transformToOutput(dbItems);

    // Step 3: Save to JSON file
    console.log(`💾 Writing to ${OUTPUT_FILE}...`);
    saveToJson(output);

    // Step 4: Display summary
    displaySummary(output);
  } catch (error) {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { fetchAllFeaturedItems, transformToOutput, saveToJson };
