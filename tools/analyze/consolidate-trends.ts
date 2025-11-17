import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface TrendsData {
  tasks: Array<{
    result: Array<{
      items: Array<{
        keywords: string[];
        averages: number[];
      }>;
    }>;
  }>;
}

interface GameData {
  name: string;
  scores: number[];
  avgScore: number;
  count: number;
}

// 读取所有 trends JSON 文件
function loadAllTrendsData(): Map<string, GameData> {
  const gameMap = new Map<string, GameData>();

  for (let i = 1; i <= 7; i++) {
    const filePath = join(__dirname, 'output', `trends-${i}.json`);
    console.log(`📂 Reading: trends-${i}.json`);

    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      const data: TrendsData = JSON.parse(fileContent);

      // 遍历所有 tasks（每个文件包含多个 task）
      let gameCount = 0;
      for (const task of data.tasks) {
        if (!task.result || task.result.length === 0) continue;

        for (const result of task.result) {
          if (!result.items || result.items.length === 0) continue;

          for (const item of result.items) {
            const { keywords, averages } = item;

            // 过滤掉 "colorfle" 基准关键词，提取其他游戏
            keywords.forEach((keyword, index) => {
              if (keyword.toLowerCase() === 'colorfle') {
                return; // 跳过基准关键词
              }

              const score = averages[index];
              // 标准化游戏名称：trim + 统一大小写比较用的 key
              const normalizedName = keyword.trim();
              const mapKey = normalizedName.toLowerCase();

              if (gameMap.has(mapKey)) {
                // 已存在，添加新评分
                const existing = gameMap.get(mapKey)!;
                existing.scores.push(score);
                existing.count++;
              } else {
                // 新游戏，使用原始名称（保持首字母大小写）
                gameMap.set(mapKey, {
                  name: normalizedName,
                  scores: [score],
                  avgScore: 0, // 稍后计算
                  count: 1,
                });
              }

              gameCount++;
            });
          }
        }
      }

      console.log(`   ✅ Processed ${gameCount} game entries`);
    } catch (error) {
      console.error(`❌ Error reading trends-${i}.json:`, error);
    }
  }

  return gameMap;
}

// 计算平均分
function calculateAverages(gameMap: Map<string, GameData>): GameData[] {
  const games: GameData[] = [];

  gameMap.forEach((game) => {
    game.avgScore = Math.round(game.scores.reduce((sum, score) => sum + score, 0) / game.scores.length);
    games.push(game);
  });

  return games;
}

// 按平均分降序排序
function sortGames(games: GameData[]): GameData[] {
  return games.sort((a, b) => {
    if (b.avgScore !== a.avgScore) {
      return b.avgScore - a.avgScore; // 分数高的在前
    }
    return a.name.localeCompare(b.name); // 同分按名称排序
  });
}

// 分成 5 档
function createTiers(games: GameData[]): Record<string, GameData[]> {
  const totalGames = games.length;
  const tierSize = Math.ceil(totalGames / 5);

  const tiers: Record<string, GameData[]> = {
    S: games.slice(0, tierSize),
    A: games.slice(tierSize, tierSize * 2),
    B: games.slice(tierSize * 2, tierSize * 3),
    C: games.slice(tierSize * 3, tierSize * 4),
    D: games.slice(tierSize * 4),
  };

  return tiers;
}

// 生成输出文本
function generateOutput(games: GameData[], tiers: Record<string, GameData[]>): string {
  const lines: string[] = [];

  // 头部信息
  lines.push('Game Search Trends - Consolidated Analysis');
  lines.push('Source: trends-1.json ~ trends-7.json');
  lines.push(`Total Unique Games: ${games.length}`);
  lines.push(`Analysis Date: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('='.repeat(80));
  lines.push('');

  // 各档次
  const tierInfo = [
    { key: 'S', emoji: '🔥', name: 'Tier S (Very High)' },
    { key: 'A', emoji: '⭐', name: 'Tier A (High)' },
    { key: 'B', emoji: '📊', name: 'Tier B (Medium)' },
    { key: 'C', emoji: '📉', name: 'Tier C (Low)' },
    { key: 'D', emoji: '💤', name: 'Tier D (Very Low)' },
  ];

  tierInfo.forEach(({ key, emoji, name }) => {
    lines.push(`${emoji} ${name}`);
    lines.push('-'.repeat(80));

    const tierGames = tiers[key];
    tierGames.forEach((game) => {
      lines.push(`${game.name} (avg: ${game.avgScore}, appears: ${game.count}${game.count > 1 ? ' times' : ' time'})`);
    });

    lines.push('');
  });

  // 统计信息
  lines.push('='.repeat(80));
  lines.push('Statistics:');
  lines.push(`- Highest: ${games[0].name} (${games[0].avgScore})`);
  lines.push(`- Lowest: ${games[games.length - 1].name} (${games[games.length - 1].avgScore})`);
  lines.push(`- Average: ${(games.reduce((sum, g) => sum + g.avgScore, 0) / games.length).toFixed(2)}`);

  // 出现次数统计
  const appearances = games.reduce(
    (acc, g) => {
      acc[g.count] = (acc[g.count] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );

  lines.push('');
  lines.push('Game Appearances:');
  Object.keys(appearances)
    .sort((a, b) => Number(b) - Number(a))
    .forEach((count) => {
      lines.push(`  - ${count} time${Number(count) > 1 ? 's' : ''}: ${appearances[Number(count)]} games`);
    });

  lines.push('');

  return lines.join('\n');
}

// 主函数
function main() {
  console.log('🚀 Starting consolidated trends analysis...\n');

  // 1. 加载所有数据
  console.log('📊 Step 1: Loading all trends data...');
  const gameMap = loadAllTrendsData();
  console.log(`✅ Loaded ${gameMap.size} unique games\n`);

  // 2. 计算平均分
  console.log('🧮 Step 2: Calculating averages...');
  const games = calculateAverages(gameMap);
  console.log(`✅ Calculated averages for ${games.length} games\n`);

  // 3. 排序
  console.log('📈 Step 3: Sorting games by score...');
  const sortedGames = sortGames(games);
  console.log(`✅ Sorted ${sortedGames.length} games\n`);

  // 4. 分档
  console.log('🏆 Step 4: Creating tiers...');
  const tiers = createTiers(sortedGames);
  console.log('✅ Tier Distribution:');
  Object.entries(tiers).forEach(([tier, games]) => {
    console.log(`   ${tier}: ${games.length} games`);
  });
  console.log('');

  // 5. 生成输出
  console.log('📝 Step 5: Generating output...');
  const output = generateOutput(sortedGames, tiers);

  // 6. 保存文件
  const outputPath = join(__dirname, 'rank', 'trends-consolidated.txt');
  writeFileSync(outputPath, output, 'utf-8');
  console.log(`✅ Saved to: ${outputPath}\n`);

  // 7. 显示摘要
  console.log('📊 Summary:');
  console.log(`   Total unique games: ${sortedGames.length}`);
  console.log(`   Highest score: ${sortedGames[0].name} (${sortedGames[0].avgScore})`);
  console.log(
    `   Lowest score: ${sortedGames[sortedGames.length - 1].name} (${sortedGames[sortedGames.length - 1].avgScore})`,
  );
  console.log(
    `   Average score: ${(sortedGames.reduce((sum, g) => sum + g.avgScore, 0) / sortedGames.length).toFixed(2)}`,
  );
  console.log('\n✨ Consolidation complete!');
}

main();
