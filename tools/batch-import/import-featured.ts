/**
 * Featured Collections Import Tool
 * Reads featured collections from JSON file and imports via API
 */

import fs from 'fs/promises';
import path from 'path';
import { config } from 'dotenv';
config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuration
const API_URL = process.env.IMPORT_API_ORIGIN || 'http://localhost:4004';
const API_PATH = '/api/admin/featured/import';
const DEFAULT_FILE = 'tools/rewrite/cate-and-tag/output/game-featured.json';
const STRATEGY = (process.env.IMPORT_STRATEGY as 'upsert' | 'skip_existing' | 'overwrite') || 'upsert';

interface FeaturedData {
  name: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
}

async function main() {
  console.log('⭐ Featured Collections Import Tool');
  console.log('='.repeat(50));

  // 1. Read JSON file
  const filePath = process.argv[2] || DEFAULT_FILE;
  const fullPath = path.join(process.cwd(), filePath);

  console.log(`📖 Reading from: ${filePath}`);

  let fileContent: string;
  try {
    fileContent = await fs.readFile(fullPath, 'utf-8');
  } catch (error) {
    console.error(`❌ Failed to read file: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  // 2. Parse JSON
  let jsonData: any;
  try {
    jsonData = JSON.parse(fileContent);
  } catch (error) {
    console.error(`❌ Failed to parse JSON: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  // Extract featured array
  const featured: FeaturedData[] = jsonData.featured || [];

  if (featured.length === 0) {
    console.error('❌ No featured collections found in file');
    process.exit(1);
  }

  console.log(`✅ Found ${featured.length} featured collections`);
  console.log(`🎯 Strategy: ${STRATEGY}`);
  console.log(`🌐 API URL: ${API_URL}${API_PATH}`);
  console.log('');

  // 3. Call API
  console.log('📤 Sending request to API...');

  const url = `${API_URL}${API_PATH}`;
  const payload = {
    data: featured,
    strategy: STRATEGY,
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ADMIN_API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error(`❌ Network error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  // 4. Handle response
  let result: any;
  try {
    result = await response.json();
  } catch (error) {
    console.error(`❌ Failed to parse response: ${error instanceof Error ? error.message : error}`);
    console.error(`Response status: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  if (!response.ok) {
    console.error(`❌ API Error (${response.status}): ${result.error || response.statusText}`);
    process.exit(1);
  }

  // 5. Display results
  console.log('');
  console.log('✅ Import completed successfully!');
  console.log('='.repeat(50));

  const { data } = result;
  console.log(`📊 Results:`);
  console.log(`  Total:   ${data.total}`);
  console.log(`  Created: ${data.created} ✨`);
  console.log(`  Updated: ${data.updated} 🔄`);
  console.log(`  Skipped: ${data.skipped} ⏭️`);
  console.log(`  Failed:  ${data.failed} ❌`);

  if (data.failed > 0) {
    console.log('');
    console.log('⚠️  Failed items:');
    data.items
      .filter((item: any) => item.status === 'failed')
      .forEach((item: any) => {
        console.log(`  - ${item.name} (${item.slug}): ${item.error}`);
      });
  }

  console.log('');
  console.log('🎉 Done!');
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
