import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface TrendData {
  tasks: Array<{
    result: Array<{
      items: Array<{
        keywords: string[];
        averages: number[];
      }>;
    }>;
  }>;
}

interface GameScore {
  name: string;
  average: number;
}

// 读取文件名（不含路径和扩展名）作为参数
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: pnpm tsx analyze-trends.ts <filename>');
  console.error('Example: pnpm tsx analyze-trends.ts trends-1');
  process.exit(1);
}

const fileName = args[0];
const inputPath = join(__dirname, 'output', `${fileName}.json`);
const outputPath = join(__dirname, 'rank', `${fileName}.txt`);

console.log(`📖 Reading: ${inputPath}`);

// 读取并解析 JSON
const content = readFileSync(inputPath, 'utf-8');
const data: TrendData = JSON.parse(content);

// 提取所有游戏及其平均搜索量
const gameScores: GameScore[] = [];

for (const task of data.tasks) {
  if (!task.result || task.result.length === 0) continue;

  for (const result of task.result) {
    if (!result.items || result.items.length === 0) continue;

    for (const item of result.items) {
      const { keywords, averages } = item;

      // 遍历每个关键词（排除 colorfle）
      for (let i = 0; i < keywords.length; i++) {
        const keyword = keywords[i];
        const average = averages[i];

        // 跳过基准词 colorfle
        if (keyword.toLowerCase() === 'colorfle') {
          continue;
        }

        gameScores.push({
          name: keyword,
          average: average,
        });
      }
    }
  }
}

console.log(`✅ Extracted ${gameScores.length} games`);

// 按 average 降序排序
gameScores.sort((a, b) => b.average - a.average);

// 分成 5 档
const totalGames = gameScores.length;
const tierSize = Math.ceil(totalGames / 5);

const tiers = [
  { name: '🔥 Tier S (Very High)', games: gameScores.slice(0, tierSize) },
  { name: '⭐ Tier A (High)', games: gameScores.slice(tierSize, tierSize * 2) },
  { name: '📊 Tier B (Medium)', games: gameScores.slice(tierSize * 2, tierSize * 3) },
  { name: '📉 Tier C (Low)', games: gameScores.slice(tierSize * 3, tierSize * 4) },
  { name: '💤 Tier D (Very Low)', games: gameScores.slice(tierSize * 4) },
];

// 构建输出内容
let output = '';
output += `Game Search Trends Analysis\n`;
output += `Source: ${fileName}.json\n`;
output += `Total Games: ${totalGames}\n`;
output += `Analysis Date: ${new Date().toISOString()}\n`;
output += `\n${'='.repeat(80)}\n\n`;

for (const tier of tiers) {
  output += `${tier.name}\n`;
  output += `${'-'.repeat(80)}\n`;

  for (const game of tier.games) {
    output += `${game.name} (avg: ${game.average})\n`;
  }

  output += `\n`;
}

// 统计信息
output += `${'='.repeat(80)}\n`;
output += `Statistics:\n`;
output += `- Highest: ${gameScores[0].name} (${gameScores[0].average})\n`;
output += `- Lowest: ${gameScores[totalGames - 1].name} (${gameScores[totalGames - 1].average})\n`;
output += `- Average: ${(gameScores.reduce((sum, g) => sum + g.average, 0) / totalGames).toFixed(2)}\n`;

// 写入文件
writeFileSync(outputPath, output, 'utf-8');

console.log(`\n📝 Saved to: ${outputPath}`);
console.log(`\n📊 Tier Distribution:`);
for (let i = 0; i < tiers.length; i++) {
  console.log(`   ${tiers[i].name}: ${tiers[i].games.length} games`);
}
