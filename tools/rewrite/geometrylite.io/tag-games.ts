#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface GameRow {
  Title: string;
  'Page URL': string;
  'Game URL': string;
  'Cover Image': string;
  Rating: string;
  'Content Path': string;
  'Meta Title': string;
  'Meta Description': string;
  Categories?: string;
  Tags?: string;
}

// 游戏分类和标签映射
const gameTagging: Record<string, { categories: string[]; tags: string[] }> = {
  'Hollow Knight: Silksong': {
    categories: ['Action', 'Adventure', 'Platform'],
    tags: ['Skill', 'Fast-Paced', 'Jumping', 'Side Scrolling'],
  },
  'Geometry Dash: Dual Wave Editor': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Fan-Made', 'Wave', 'Creative', 'Hard', 'Music'],
  },
  'Cosmic Dash': {
    categories: ['Arcade', 'Action'],
    tags: ['Endless Runner', 'Fast-Paced', 'Avoid', 'Space', 'Skill'],
  },
  'Flamewall Wave Challenge': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Fan-Made', 'Wave', 'Skill', 'Fast-Paced', 'Music'],
  },
  'Geometry Dash: Black Ball': {
    categories: ['Geometry', 'Platform', 'Rhythm'],
    tags: ['Fan-Made', 'Ball', 'Skill', 'Avoid', 'Music', 'Obstacle'],
  },
  'Geometry Craft 3D': {
    categories: ['Geometry', 'Arcade'],
    tags: ['3D', 'Fan-Made', 'Obstacle', 'Fast-Paced', 'Skill'],
  },
  'Geometry Dash Lava Mode': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Fan-Made', 'Wave', 'Music', 'Hard', 'Skill'],
  },
  'Vex Hyper Dash': {
    categories: ['Platform', 'Arcade'],
    tags: ['Endless Runner', 'Fast-Paced', 'Jumping', 'Skill', 'Obstacle'],
  },
  'Tung Tung Sahur in Geometry Dash': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Wave', 'Music', 'Neon', 'Skill', 'Fast-Paced'],
  },
  'Geometry Dash Polargeist v01': {
    categories: ['Geometry', 'Rhythm', 'Platform'],
    tags: ['Fan-Made', 'Classic', 'Hard', 'Music', '3 Coins', 'Skill'],
  },
  'Hollow Knight: Silksong in Geometry Mod!': {
    categories: ['Casual', 'Simulation'],
    tags: ['Creative', 'Fan-Made', 'Meme'],
  },
  'Geometry Dash Mystery Dungeon': {
    categories: ['Geometry', 'Rhythm', 'Adventure'],
    tags: ['User Levels', 'Music', 'Pixel', 'Skill', 'Hard'],
  },
  'Geometry Dash Remake Level 2': {
    categories: ['Geometry', 'Rhythm', 'Platform'],
    tags: ['Fan-Made', 'Classic', 'Music', 'Skill'],
  },
  'Geo Rush': {
    categories: ['Geometry', 'Rhythm', 'Platform'],
    tags: ['Fast-Paced', 'Music', 'Skill', 'Flying', 'Jumping'],
  },
  'Geometry Dash BuTiTi': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['User Levels', 'Music', 'Hard', 'Skill', 'Fast-Paced'],
  },
  'Geometry Dash Blade of Justice': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Extreme Demon', 'Skill', 'Music', 'Demonlist'],
  },
  'Neon Leap': {
    categories: ['Arcade', 'Casual'],
    tags: ['Neon', 'Jumping', 'Skill', 'Endless Runner', 'Music'],
  },
  'Geometry Dash ColorZ': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Fan-Made', 'Music', 'Normal', 'Colorful', '3 Coins'],
  },
  'Geometry Dash Back on Track RM': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Fan-Made', 'Classic', 'Music', 'Fast-Paced', 'Skill'],
  },
  'BLOODMONEY!': {
    categories: ['Clicker', 'Casual'],
    tags: ['Horror', 'Idle', 'Meme'],
  },
  'Geometry Dash Adrift': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['User Levels', 'Music', '3 Coins', 'Skill'],
  },
  'Geometry Dash Glitter Madness 2k15': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Fan-Made', 'Music', 'Wave', 'Hard', 'Skill'],
  },
  'A Shedletsky POV': {
    categories: ['Casual', 'Adventure'],
    tags: ['Roblox', 'Meme', 'Fan-Made'],
  },
  'Geometry Dash End Of Line': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Music', 'Normal', '3 Coins', 'Skill'],
  },
  'Geometry Dash Dreamland': {
    categories: ['Geometry', 'Rhythm', 'Platform'],
    tags: ['Classic', 'Hard', 'Music', 'Skill', 'Obstacle'],
  },
  'Geometry Platformer': {
    categories: ['Platform', 'Arcade'],
    tags: ['Neon', 'Skill', 'Obstacle', 'Jumping', 'Fast-Paced'],
  },
  'Geometry Dash Level Easy': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['User Levels', 'Music', 'Skill'],
  },
  'Geometry Dash Sonar': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['User Levels', 'Music', 'Classic', '3 Coins', 'Normal'],
  },
  'Geometry Dash The Lightning Road': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Easy Demon', 'Music', 'Skill', 'Fast-Paced'],
  },
  'Geometry Dash Double Wave PRO': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Fan-Made', 'Wave', 'Skill', 'Hard', 'Music'],
  },
  'Geometry Wave Сhallenge': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Fan-Made', 'Wave', 'Skill', 'Music'],
  },
  'Fireboy and Watergirl': {
    categories: ['Puzzle', 'Adventure'],
    tags: ['2 Player', 'Collect', 'Classic', 'Skill'],
  },
  'Dinosaur Game': {
    categories: ['Arcade', 'Casual'],
    tags: ['Endless Runner', 'Pixel', 'Classic', 'Jumping', 'Skill'],
  },
  'MineFun.io': {
    categories: ['IO', 'Simulation'],
    tags: ['Multiplayer', 'Creative', 'Survival', '3D'],
  },
  'Geometry Dash Breeze': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Fan-Made', 'Demon', 'Music', 'Skill'],
  },
  'Geometry Dash Razorleaf': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Gauntlets', 'Music', 'Neon', 'Skill', 'Hard'],
  },
  'Curve Rush 2': {
    categories: ['Arcade', 'Casual'],
    tags: ['Physics', 'Speed', 'Skill', 'Jumping'],
  },
  'Geometry Jump 2': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Neon', 'Jumping', 'Music', 'Fast-Paced', 'Skill'],
  },
  'Geometry Dash Waves of Motion': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Fan-Made', 'Wave', 'Music', 'Skill'],
  },
  'Snow Rider 3D': {
    categories: ['Driving', 'Arcade'],
    tags: ['3D', 'Endless Runner', 'Collect', 'Skill'],
  },
  'Geometry Vibes 3D': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['3D', 'Music', '2 Player', 'Fast-Paced', 'Skill'],
  },
  'Black Geometry Wave Super Challenge': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Fan-Made', 'Wave', 'Music', 'Skill', 'Hard'],
  },
  'Geometry Lite Classic': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Fan-Made', 'Classic', 'Music', 'Skill', 'Fast-Paced'],
  },
  'Deer Adventure': {
    categories: ['Simulation', 'Adventure', 'Casual'],
    tags: ['Physics', 'Ragdoll', 'Animal', 'Meme'],
  },
  'Geometry Dash Down Bass': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Extreme Demon', 'Wave', 'Music', 'Skill', 'Demonlist'],
  },
  'Geometry Dash Hexagon Hyperdrive': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Music', 'Fast-Paced', 'Skill', 'User Levels'],
  },
  'Geometry Dash Dark Paradise': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Music', 'Normal', 'Neon', '3 Coins', 'Skill'],
  },
  'Geometry Dash Change of Scene': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Easy Demon', 'Music', 'Skill', 'User Levels'],
  },
  'Geometry Dash 2D: Platformer': {
    categories: ['Geometry', 'Platform'],
    tags: ['Fan-Made', 'Skill', 'Obstacle', 'Jumping'],
  },
  'Geometry Dash Spider': {
    categories: ['Geometry', 'Rhythm'],
    tags: ['Fan-Made', 'Music', 'Skill', 'Fast-Paced'],
  },
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function main() {
  const inputFile = join(__dirname, 'output/games-002.csv');
  const outputFile = join(__dirname, 'output/games-002-tagged.csv');

  console.log('🏷️  Game Tagging Tool\n');
  console.log(`📖 Reading: ${inputFile}`);

  const content = readFileSync(inputFile, 'utf-8');
  const lines = content.split('\n');

  // Parse header
  const headerFields = parseCsvLine(lines[0]);
  const newHeader = [...headerFields, 'Categories', 'Tags'];

  console.log(`📋 Found ${lines.length - 1} games (excluding header)\n`);

  const newLines: string[] = [newHeader.map(escapeCsvField).join(',')];

  let taggedCount = 0;
  let skippedCount = 0;

  // Process each game
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCsvLine(line);
    const title = fields[0];

    // Check if game already has categories/tags (if CSV already has these columns)
    const existingCategories = fields[8];
    const existingTags = fields[9];

    if (existingCategories && existingTags) {
      console.log(`⏭️  Skipped: ${title} (already tagged)`);
      newLines.push(line);
      skippedCount++;
      continue;
    }

    const tagging = gameTagging[title];

    if (tagging) {
      const categories = tagging.categories.join(', ');
      const tags = tagging.tags.join(', ');

      const newFields = [...fields, categories, tags];
      newLines.push(newFields.map(escapeCsvField).join(','));

      console.log(`✅ Tagged: ${title}`);
      console.log(`   Categories: ${categories}`);
      console.log(`   Tags: ${tags}\n`);
      taggedCount++;
    } else {
      console.log(`⚠️  No tagging found for: ${title}`);
      newLines.push([...fields, '', ''].map(escapeCsvField).join(','));
    }
  }

  // Write output
  writeFileSync(outputFile, newLines.join('\n'), 'utf-8');

  console.log('\n📊 Summary:');
  console.log(`   ✅ Tagged: ${taggedCount} games`);
  console.log(`   ⏭️  Skipped: ${skippedCount} games`);
  console.log(`   📁 Output: ${outputFile}\n`);
  console.log('✨ Done!');
}

main();
