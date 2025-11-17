import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';

interface Game {
  title: string;
  pageUrl: string;
  gameUrl: string;
  coverImage: string;
  rating: string;
  contentPath: string;
  metaTitle: string;
  metaDescription: string;
}

const OUTPUT_DIR = join(__dirname, 'output');
const LIST_DIR = join(OUTPUT_DIR, 'list');

// 确保输出目录存在
try {
  mkdirSync(LIST_DIR, { recursive: true });
} catch (error) {
  // 目录已存在，忽略错误
}

// 读取所有 games-*.json 文件
const files = readdirSync(OUTPUT_DIR).filter((file) => file.startsWith('games-') && file.endsWith('.json'));

console.log(`Found ${files.length} JSON files to process`);

const titles: string[] = [];

// 遍历每个文件
for (const file of files) {
  const filePath = join(OUTPUT_DIR, file);
  console.log(`Processing: ${file}`);

  try {
    const content = readFileSync(filePath, 'utf-8');
    const games: Game[] = JSON.parse(content);

    for (const game of games) {
      let title = game.title;

      // 如果标题包含英文冒号，只取冒号前的部分
      if (title.includes(':')) {
        title = title.split(':')[0].trim();
      }

      titles.push(title);
    }

    console.log(`  Extracted ${games.length} titles from ${file}`);
  } catch (error) {
    console.error(`Error processing ${file}:`, error);
  }
}

// 输出到文件
const outputPath = join(LIST_DIR, 'game-titles.txt');
writeFileSync(outputPath, titles.join('\n'), 'utf-8');

console.log(`\n✅ Successfully extracted ${titles.length} titles`);
console.log(`📝 Saved to: ${outputPath}`);
