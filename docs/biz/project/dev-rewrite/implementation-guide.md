# Game Content Rewrite Implementation Guide

## Project Overview

This project aims to rewrite game introductions, meta titles, and meta descriptions using Google's Gemini AI (gemini-2.5-pro) with Google Search Grounding capability. The system will process game data from CSV files, research each game online, and generate high-quality, player-focused content.

### Goals

- Generate engaging, player-focused game descriptions
- Create SEO-optimized meta titles and descriptions
- Provide comprehensive gameplay information and FAQs
- Maintain consistency across 550+ games
- Support scalable batch processing with error recovery

---

## Technical Stack

### Core Dependencies

```json
{
  "@ai-sdk/google": "^2.0.26",
  "ai": "^5.0.14",
  "csv-parse": "^5.x",
  "csv-stringify": "^6.x"
}
```

### AI Model Configuration

- **Model**: `gemini-2.5-pro`
- **Features**: Google Search Grounding (online research)
- **Temperature**: 0.7 (balanced creativity)
- **Max Tokens**: 4000 (comprehensive content)

---

## Architecture Design

### Directory Structure

```
tools/rewrite/geometrylite.io/
├── rewrite-games.ts              # Main entry point
├── lib/
│   ├── csv-handler.ts            # CSV read/write operations
│   ├── json-handler.ts           # JSON data export
│   ├── content-reader.ts         # Read original markdown content
│   ├── gemini-rewriter.ts        # Gemini API integration
│   ├── prompt-builder.ts         # Dynamic prompt generation
│   ├── validator.ts              # Validate output (meta length, etc.)
│   ├── progress-manager.ts       # Save/load progress for resume
│   └── logger.ts                 # Structured logging
├── config.ts                     # Configuration constants
├── types.ts                      # TypeScript interfaces
├── output/
│   ├── games-001-test.csv        # Test CSV output (5 games)
│   ├── games-001-test.json       # Test JSON output (5 games)
│   ├── games-001.csv             # Production CSV output
│   ├── games-001.json            # Production JSON output (complete data)
│   ├── content/                  # Rewritten markdown files
│   │   ├── game-name.md
│   │   └── ...
│   ├── logs/                     # Execution logs
│   │   ├── rewrite-2025-11-03.log
│   │   └── errors.log
│   └── progress/                 # Resume checkpoints
│       └── games-001.json
└── README.md                     # Usage documentation
```

---

## Module Design

### 1. Configuration (config.ts)

```typescript
export const CONFIG = {
  // AI Model Settings
  model: 'gemini-2.5-pro',
  temperature: 0.7,
  maxTokens: 4000,

  // Processing Settings
  concurrency: 4, // 3-5 concurrent requests
  retryAttempts: 1, // Retry once on failure
  retryDelay: 2000, // 2 seconds between retries

  // Meta Length Limits
  metaTitle: { min: 50, max: 60 },
  metaDescription: { min: 150, max: 160 },
  shortDescription: { minWords: 20, maxWords: 40 },

  // FAQ Settings
  faqCount: { min: 3, max: 5 },

  // Paths
  inputDir: 'tools/spider/geometrylite.io/output',
  outputDir: 'tools/rewrite/geometrylite.io/output',

  // Brand Name (optional, low priority)
  brandName: 'GamesRamp',
};
```

### 2. Type Definitions (types.ts)

```typescript
export interface GameRecord {
  title: string;
  pageUrl: string;
  gameUrl: string;
  coverImage: string;
  rating: string;
  contentPath: string;
  metaTitle?: string; // To be generated
  metaDescription?: string; // To be generated
}

export interface GameContent {
  shortDescription: string;
  whatIs: string;
  howToPlay: string;
  whatMakesSpecial: string;
  faqs: FAQ[];
  metaTitle?: string;
  metaDescription?: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface RewriteResult {
  success: boolean;
  game: GameRecord;
  content?: GameContent;
  error?: string;
  attempts: number;
}

export interface GameDataExport {
  title: string;
  pageUrl: string;
  gameUrl: string;
  coverImage: string;
  rating: string;
  contentPath: string;
  metaTitle: string;
  metaDescription: string;
}

export interface ProcessingProgress {
  csvFile: string;
  totalGames: number;
  processedGames: number;
  successCount: number;
  failedGames: string[];
  lastProcessedIndex: number;
  timestamp: string;
}
```

### 3. CSV Handler (lib/csv-handler.ts)

**Purpose**: Read and write CSV files with proper escaping and encoding.

```typescript
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import fs from 'fs/promises';

export class CsvHandler {
  async readCsv(filePath: string): Promise<GameRecord[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    return records;
  }

  async writeCsv(filePath: string, records: GameRecord[]): Promise<void> {
    const csv = stringify(records, {
      header: true,
      quoted: true,
    });
    await fs.writeFile(filePath, csv, 'utf-8');
  }
}
```

### 4. JSON Handler (lib/json-handler.ts)

**Purpose**: Export game metadata as JSON for structured data storage.

```typescript
import fs from 'fs/promises';
import type { GameDataExport } from '../types';

export class JsonHandler {
  /**
   * Write game metadata to JSON file
   * Includes all metadata and generated fields (meta title/description)
   * Content is stored separately in markdown files (referenced by contentPath)
   */
  async writeJson(filePath: string, data: GameDataExport[]): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, json, 'utf-8');
  }

  /**
   * Read JSON data file
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
```

### 5. Content Reader (lib/content-reader.ts)

**Purpose**: Read original markdown content files.

```typescript
import fs from 'fs/promises';
import path from 'path';

export class ContentReader {
  constructor(private baseDir: string) {}

  async readContent(contentPath: string): Promise<string> {
    const fullPath = path.join(this.baseDir, contentPath);
    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read content from ${fullPath}: ${error}`);
    }
  }
}
```

### 6. Prompt Builder (lib/prompt-builder.ts)

**Purpose**: Generate player-focused prompts with Google Search Grounding instructions.

```typescript
export class PromptBuilder {
  buildResearchPrompt(gameName: string, originalContent: string): string {
    return `You are a professional game content writer creating engaging descriptions for players.

**TASK**: Research and rewrite comprehensive content for the game "${gameName}".

**ORIGINAL CONTENT** (for reference):
${originalContent}

**INSTRUCTIONS**:
1. Use Google Search to research the latest information about "${gameName}"
2. Focus on what players want to know: gameplay, controls, tips, and unique features
3. Write in an engaging, player-focused tone
4. Ensure accuracy by verifying information from multiple sources

**OUTPUT REQUIREMENTS**:

Generate a JSON object with the following structure:

\`\`\`json
{
  "shortDescription": "1-2 engaging sentences (20-40 words) that hook players immediately",
  "whatIs": "Comprehensive introduction covering: game concept, genre, platform, main objective, target audience (150-250 words)",
  "howToPlay": "Detailed gameplay instructions including: basic controls, game mechanics, progression system, beginner tips (200-300 words)",
  "whatMakesSpecial": "Unique selling points: standout features, what differentiates from similar games, why players love it (150-200 words)",
  "faqs": [
    {
      "question": "Common player question 1",
      "answer": "Clear, helpful answer (50-100 words)"
    },
    // 3-5 FAQs total covering: platform compatibility, difficulty, multiplayer, updates, tips
  ],
  "metaTitle": "SEO-optimized title (50-60 characters, include game name and key benefit)",
  "metaDescription": "Compelling meta description (150-160 characters, include CTA and main features)"
}
\`\`\`

**META GUIDELINES**:
- **metaTitle**: 50-60 characters, format: "[Game Name] - [Key Feature/Benefit]"
- **metaDescription**: 150-160 characters, include game name, main features, and call-to-action
- Brand name "GeometryLite" is optional (low priority, only if space permits)

**STYLE GUIDELINES**:
- Write from player's perspective
- Use active voice and present tense
- Be specific and avoid generic descriptions
- Include concrete examples and details
- Make content scannable with clear sections

**RESEARCH FOCUS**:
- Current gameplay mechanics and controls
- Player reviews and common questions
- Recent updates or versions
- Platform availability (web, mobile, etc.)
- Difficulty level and learning curve

Return ONLY the JSON object, no additional text.`;
  }
}
```

### 7. Gemini Rewriter (lib/gemini-rewriter.ts)

**Purpose**: Interface with Gemini AI using Google Search Grounding.

````typescript
import { googleChat } from '@/tools/ai';
import { CONFIG } from '../config';
import type { GameContent } from '../types';

export class GeminiRewriter {
  async rewriteGameContent(gameName: string, originalContent: string, prompt: string): Promise<GameContent> {
    const response = await googleChat({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: CONFIG.model,
      temperature: CONFIG.temperature,
      maxTokens: CONFIG.maxTokens,
    });

    // Parse JSON response
    const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response.content;

    try {
      const parsed = JSON.parse(jsonStr.trim());
      return {
        shortDescription: parsed.shortDescription,
        whatIs: parsed.whatIs,
        howToPlay: parsed.howToPlay,
        whatMakesSpecial: parsed.whatMakesSpecial,
        faqs: parsed.faqs,
        metaTitle: parsed.metaTitle,
        metaDescription: parsed.metaDescription,
      };
    } catch (error) {
      throw new Error(`Failed to parse Gemini response: ${error}`);
    }
  }
}
````

### 8. Validator (lib/validator.ts)

**Purpose**: Validate generated content against requirements.

```typescript
import { CONFIG } from '../config';
import type { GameContent } from '../types';

export class Validator {
  validate(content: GameContent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate metaTitle length
    const titleLen = content.metaTitle?.length || 0;
    if (titleLen < CONFIG.metaTitle.min || titleLen > CONFIG.metaTitle.max) {
      errors.push(`metaTitle length ${titleLen} outside range ${CONFIG.metaTitle.min}-${CONFIG.metaTitle.max}`);
    }

    // Validate metaDescription length
    const descLen = content.metaDescription?.length || 0;
    if (descLen < CONFIG.metaDescription.min || descLen > CONFIG.metaDescription.max) {
      errors.push(
        `metaDescription length ${descLen} outside range ${CONFIG.metaDescription.min}-${CONFIG.metaDescription.max}`,
      );
    }

    // Validate shortDescription word count
    const wordCount = content.shortDescription.split(/\s+/).length;
    if (wordCount < CONFIG.shortDescription.minWords || wordCount > CONFIG.shortDescription.maxWords) {
      errors.push(
        `shortDescription word count ${wordCount} outside range ${CONFIG.shortDescription.minWords}-${CONFIG.shortDescription.maxWords}`,
      );
    }

    // Validate FAQ count
    const faqCount = content.faqs.length;
    if (faqCount < CONFIG.faqCount.min || faqCount > CONFIG.faqCount.max) {
      errors.push(`FAQ count ${faqCount} outside range ${CONFIG.faqCount.min}-${CONFIG.faqCount.max}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
```

### 9. Progress Manager (lib/progress-manager.ts)

**Purpose**: Save and restore processing progress for resume capability.

```typescript
import fs from 'fs/promises';
import path from 'path';
import type { ProcessingProgress } from '../types';

export class ProgressManager {
  constructor(private progressDir: string) {}

  async saveProgress(progress: ProcessingProgress): Promise<void> {
    const fileName = `${progress.csvFile.replace('.csv', '')}.json`;
    const filePath = path.join(this.progressDir, fileName);

    await fs.mkdir(this.progressDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(progress, null, 2), 'utf-8');
  }

  async loadProgress(csvFile: string): Promise<ProcessingProgress | null> {
    const fileName = `${csvFile.replace('.csv', '')}.json`;
    const filePath = path.join(this.progressDir, fileName);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async clearProgress(csvFile: string): Promise<void> {
    const fileName = `${csvFile.replace('.csv', '')}.json`;
    const filePath = path.join(this.progressDir, fileName);

    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore if file doesn't exist
    }
  }
}
```

### 10. Logger (lib/logger.ts)

**Purpose**: Structured logging with file output.

```typescript
import fs from 'fs/promises';
import path from 'path';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class Logger {
  constructor(
    private logDir: string,
    private minLevel: LogLevel = LogLevel.INFO,
  ) {}

  private async writeLog(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;

    // Console output
    if (this.shouldLog(level)) {
      console.log(logLine.trim());
    }

    // File output
    await fs.mkdir(this.logDir, { recursive: true });
    const logFile = path.join(
      this.logDir,
      level === LogLevel.ERROR ? 'errors.log' : `rewrite-${this.getDateStr()}.log`,
    );
    await fs.appendFile(logFile, logLine, 'utf-8');
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private getDateStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  info(message: string, data?: any) {
    return this.writeLog(LogLevel.INFO, message, data);
  }

  error(message: string, data?: any) {
    return this.writeLog(LogLevel.ERROR, message, data);
  }

  warn(message: string, data?: any) {
    return this.writeLog(LogLevel.WARN, message, data);
  }

  debug(message: string, data?: any) {
    return this.writeLog(LogLevel.DEBUG, message, data);
  }
}
```

---

## Main Script Design (rewrite-games.ts)

### Core Processing Logic

```typescript
import pLimit from 'p-limit';
import { CsvHandler } from './lib/csv-handler';
import { JsonHandler } from './lib/json-handler';
import { ContentReader } from './lib/content-reader';
import { GeminiRewriter } from './lib/gemini-rewriter';
import { PromptBuilder } from './lib/prompt-builder';
import { Validator } from './lib/validator';
import { ProgressManager } from './lib/progress-manager';
import { Logger } from './lib/logger';
import { CONFIG } from './config';
import type { GameRecord, RewriteResult, GameDataExport } from './types';

export class GameRewriter {
  private csvHandler: CsvHandler;
  private jsonHandler: JsonHandler;
  private contentReader: ContentReader;
  private geminiRewriter: GeminiRewriter;
  private promptBuilder: PromptBuilder;
  private validator: Validator;
  private progressManager: ProgressManager;
  private logger: Logger;

  constructor() {
    this.csvHandler = new CsvHandler();
    this.jsonHandler = new JsonHandler();
    this.contentReader = new ContentReader(CONFIG.inputDir);
    this.geminiRewriter = new GeminiRewriter();
    this.promptBuilder = new PromptBuilder();
    this.validator = new Validator();
    this.progressManager = new ProgressManager(`${CONFIG.outputDir}/progress`);
    this.logger = new Logger(`${CONFIG.outputDir}/logs`);
  }

  async processGame(game: GameRecord): Promise<RewriteResult> {
    let attempts = 0;
    let lastError: string | undefined;

    while (attempts <= CONFIG.retryAttempts) {
      try {
        attempts++;

        // Read original content
        const originalContent = await this.contentReader.readContent(game.contentPath);

        // Build prompt
        const prompt = this.promptBuilder.buildResearchPrompt(game.title, originalContent);

        // Call Gemini with Google Search Grounding
        const content = await this.geminiRewriter.rewriteGameContent(game.title, originalContent, prompt);

        // Validate output
        const validation = this.validator.validate(content);
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        // Save content to markdown file
        await this.saveContentFile(game.title, content);

        // Update game record with meta data
        game.metaTitle = content.metaTitle;
        game.metaDescription = content.metaDescription;
        game.contentPath = `content/${this.slugify(game.title)}.md`;

        return {
          success: true,
          game,
          content,
          attempts,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);

        if (attempts <= CONFIG.retryAttempts) {
          await this.logger.warn(`Attempt ${attempts} failed for "${game.title}", retrying...`, { error: lastError });
          await this.sleep(CONFIG.retryDelay);
        }
      }
    }

    return {
      success: false,
      game,
      error: lastError,
      attempts,
    };
  }

  async processCsvFile(csvFileName: string, options: { test?: boolean; limit?: number } = {}): Promise<void> {
    const inputPath = `${CONFIG.inputDir}/${csvFileName}`;
    const outputPath = `${CONFIG.outputDir}/${options.test ? csvFileName.replace('.csv', '-test.csv') : csvFileName}`;

    await this.logger.info(`Starting processing: ${csvFileName}`);

    // Load existing progress
    const savedProgress = await this.progressManager.loadProgress(csvFileName);

    // Read input CSV
    const games = await this.csvHandler.readCsv(inputPath);
    const totalGames = options.limit || games.length;
    const gamesToProcess = games.slice(0, totalGames);

    // Resume from saved progress
    const startIndex = savedProgress?.lastProcessedIndex ?? 0;
    const successCount = savedProgress?.successCount ?? 0;
    const failedGames = savedProgress?.failedGames ?? [];

    await this.logger.info(`Processing ${totalGames} games (starting from index ${startIndex})`);

    // Concurrent processing with p-limit
    const limit = pLimit(CONFIG.concurrency);
    const results: RewriteResult[] = [];

    const tasks = gamesToProcess.slice(startIndex).map((game, index) =>
      limit(async () => {
        const actualIndex = startIndex + index;
        await this.logger.info(`[${actualIndex + 1}/${totalGames}] Processing: ${game.title}`);

        const result = await this.processGame(game);

        // Save progress after each game
        const progress = {
          csvFile: csvFileName,
          totalGames,
          processedGames: actualIndex + 1,
          successCount: successCount + (result.success ? 1 : 0),
          failedGames: result.success ? failedGames : [...failedGames, game.title],
          lastProcessedIndex: actualIndex + 1,
          timestamp: new Date().toISOString(),
        };
        await this.progressManager.saveProgress(progress);

        if (result.success) {
          await this.logger.info(`✅ Success: ${game.title} (attempt ${result.attempts})`);
        } else {
          await this.logger.error(`❌ Failed: ${game.title} after ${result.attempts} attempts`, {
            error: result.error,
          });
        }

        return result;
      }),
    );

    const processedResults = await Promise.all(tasks);
    results.push(...processedResults);

    // Prepare output data
    const successfulResults = results.filter((r) => r.success);
    const successfulGames = successfulResults.map((r) => r.game);

    // Write output CSV
    await this.csvHandler.writeCsv(outputPath, successfulGames);

    // Write output JSON (metadata only, content in separate .md files)
    const jsonOutputPath = outputPath.replace('.csv', '.json');
    const jsonData: GameDataExport[] = successfulResults.map((result) => ({
      title: result.game.title,
      pageUrl: result.game.pageUrl,
      gameUrl: result.game.gameUrl,
      coverImage: result.game.coverImage,
      rating: result.game.rating,
      contentPath: result.game.contentPath,
      metaTitle: result.game.metaTitle!,
      metaDescription: result.game.metaDescription!,
    }));
    await this.jsonHandler.writeJson(jsonOutputPath, jsonData);

    // Clear progress on completion
    await this.progressManager.clearProgress(csvFileName);

    // Summary
    const summary = {
      total: totalGames,
      successful: successfulGames.length,
      failed: totalGames - successfulGames.length,
      failedGames: results.filter((r) => !r.success).map((r) => r.game.title),
      outputFiles: {
        csv: outputPath,
        json: jsonOutputPath,
      },
    };

    await this.logger.info('Processing complete', summary);
    console.log('\n📊 Summary:', summary);
  }

  private async saveContentFile(gameTitle: string, content: any): Promise<void> {
    const fileName = `${this.slugify(gameTitle)}.md`;
    const filePath = `${CONFIG.outputDir}/content/${fileName}`;

    const markdown = `${content.shortDescription}

## What is ${gameTitle}?

${content.whatIs}

## How to Play ${gameTitle}?

${content.howToPlay}

## What Makes ${gameTitle} Special?

${content.whatMakesSpecial}

## Frequently Asked Questions

${content.faqs.map((faq: any) => `### ${faq.question}\n\n${faq.answer}`).join('\n\n')}
`;

    await fs.mkdir(`${CONFIG.outputDir}/content`, { recursive: true });
    await fs.writeFile(filePath, markdown, 'utf-8');
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// CLI Entry Point
async function main() {
  const rewriter = new GameRewriter();

  // Test mode: process first 5 games from games-001.csv
  await rewriter.processCsvFile('games-001.csv', {
    test: true,
    limit: 5,
  });

  // Production mode (uncomment to run):
  // await rewriter.processCsvFile('games-001.csv');
}

if (require.main === module) {
  main().catch(console.error);
}
```

---

## Data Flow

```
1. Read CSV File (games-001.csv)
   ↓
2. Load Progress (if exists) → Resume from last index
   ↓
3. For each game (with concurrency limit):
   ├─ Read original content (.md file)
   ├─ Build player-focused prompt
   ├─ Call Gemini with Google Search Grounding
   ├─ Parse JSON response
   ├─ Validate meta lengths and content
   ├─ Save markdown file to output/content/
   ├─ Update CSV record with metaTitle & metaDescription
   └─ Save progress checkpoint
   ↓
4. Write output files:
   ├─ CSV file (games-001.csv) → Game records with meta columns
   ├─ JSON file (games-001.json) → Structured metadata (no content)
   └─ Markdown files (content/*.md) → Full content for each game
   ↓
5. Generate summary report
   ↓
6. Clear progress file (on success)
```

### JSON Output Structure

The JSON file contains structured metadata for all games (lightweight, no content):

```json
[
  {
    "title": "1v1 lol",
    "pageUrl": "https://geometrylite.io/1v1-lol",
    "gameUrl": "https://1v1lol.io/",
    "coverImage": "https://geometrylite.io/cache/data/image/game/1v1-lol/1v1-lol-m300x180.webp",
    "rating": "10",
    "contentPath": "content/1v1-lol.md",
    "metaTitle": "1v1 LOL - Epic Building & Shooting Battle Arena",
    "metaDescription": "Master building and shooting in 1v1 LOL! Compete in intense 1v1 duels, practice mode, and team battles. Test your skills in the ultimate arena game."
  },
  {
    "title": "Mr Flip",
    "pageUrl": "https://geometrylite.io/mr-flip",
    "gameUrl": "https://mr-flip.1games.io/",
    "coverImage": "https://geometrylite.io/cache/data/image/game/mr-flip/mr-flip-m300x180.webp",
    "rating": "10",
    "contentPath": "content/mr-flip.md",
    "metaTitle": "Mr Flip - Master Gravity-Defying Parkour Challenges",
    "metaDescription": "Flip, jump, and defy gravity in Mr Flip! Navigate tricky obstacles with perfect timing. Can you master all the challenging parkour levels?"
  }
  // ... more games
]
```

**Note**: Full game content (descriptions, FAQs, etc.) is stored in separate markdown files referenced by `contentPath`. This keeps the JSON file lightweight and prevents memory issues when loading large datasets.

---

## Cost and Time Estimation

### For Testing (5 games)

**API Costs** (gemini-2.5-pro with Search Grounding):

- Input: ~500 tokens/game × 5 = 2,500 tokens
- Output: ~2,500 tokens/game × 5 = 12,500 tokens
- Search queries: ~10 queries/game × 5 = 50 queries
- **Estimated cost**: ~$0.10 - 0.20 USD

**Time**:

- Processing time: ~15-25 seconds/game
- With 4 concurrent requests: ~20-30 seconds total
- **Total test time**: < 1 minute

### For Production (550 games)

**API Costs**:

- Input: ~500 tokens/game × 550 = 275,000 tokens
- Output: ~2,500 tokens/game × 550 = 1,375,000 tokens
- Search queries: ~10 queries/game × 550 = 5,500 queries
- **Estimated cost**: ~$15 - 25 USD

**Time**:

- With 4 concurrent requests: ~550 / 4 = 138 batches
- At ~20 seconds/batch: 138 × 20 = 2,760 seconds
- **Total production time**: ~45 - 50 minutes

**Note**: Google Search Grounding may add extra cost and latency. Monitor first few requests to adjust estimates.

---

## Usage Examples

### Test Mode (5 games)

```bash
# Run test on first 5 games
pnpm tsx tools/rewrite/geometrylite.io/rewrite-games.ts --test

# Output:
# - tools/rewrite/geometrylite.io/output/games-001-test.csv (CSV with meta columns)
# - tools/rewrite/geometrylite.io/output/games-001-test.json (Complete JSON data)
# - tools/rewrite/geometrylite.io/output/content/*.md (5 markdown files)
# - tools/rewrite/geometrylite.io/output/logs/rewrite-2025-11-03.log
```

### Production Mode (Full CSV)

```bash
# Process all games in a CSV file
pnpm tsx tools/rewrite/geometrylite.io/rewrite-games.ts --file games-001.csv

# Resume interrupted processing
pnpm tsx tools/rewrite/geometrylite.io/rewrite-games.ts --file games-001.csv --resume
```

### Batch Process All CSV Files

```bash
# Process all 11 CSV files
pnpm tsx tools/rewrite/geometrylite.io/rewrite-games.ts --all
```

---

## Error Handling Strategy

### Retry Logic

1. **First Attempt**: Call Gemini API
2. **If Fail**: Wait 2 seconds, retry once
3. **If Still Fail**: Log error, skip game, continue processing

### Error Categories

| Error Type            | Action                         | Logged To  |
| --------------------- | ------------------------------ | ---------- |
| API Rate Limit        | Retry with exponential backoff | errors.log |
| Invalid JSON Response | Retry once, then skip          | errors.log |
| Validation Failed     | Log details, skip game         | errors.log |
| File Read Error       | Skip game, log error           | errors.log |
| Network Error         | Retry once, then skip          | errors.log |

### Resume Capability

- Progress saved after each game
- On interruption (Ctrl+C, crash), run with `--resume` flag
- Automatically skips already processed games

---

## Quality Assurance

### Automated Validation

- ✅ Meta title length: 50-60 characters
- ✅ Meta description length: 150-160 characters
- ✅ Short description: 20-40 words
- ✅ FAQ count: 3-5 questions
- ✅ All required sections present
- ✅ Valid JSON structure

### Manual Review Checklist

After processing, review sample outputs for:

- [ ] Content accuracy (cross-check with game)
- [ ] Engaging, player-focused tone
- [ ] No hallucinated features
- [ ] Proper grammar and spelling
- [ ] Consistent formatting
- [ ] SEO best practices

---

## Important Notes

### Google Search Grounding

- **Feature**: Gemini will automatically search Google for latest game information
- **Benefit**: More accurate, up-to-date content
- **Cost**: May add $0.01-0.02 per game (monitor actual costs)
- **Latency**: Adds 3-5 seconds per request

### API Key Requirements

```bash
# Required environment variable
export GOOGLE_AI_API_KEY="your-api-key-here"
```

### Rate Limits

- Gemini API: ~60 requests/minute (adjust concurrency if hitting limits)
- Concurrent requests: 4 (configurable in config.ts)
- Retry delay: 2 seconds (exponential backoff on rate limit errors)

### Content Guidelines

- **Tone**: Enthusiastic but professional
- **Audience**: Gamers aged 13-35
- **Style**: Active voice, present tense
- **SEO**: Include keywords naturally (game name, genre, platform)

---

## Implementation Steps

### Phase 1: Foundation (3 steps)

**Goal**: Set up project structure and core type definitions

- [ ] **Step 1**: Create directory structure
  - Create `tools/rewrite/geometrylite.io/` directory
  - Create `lib/` subdirectory for modules
  - Create `output/{content,logs,progress}/` subdirectories

- [ ] **Step 2**: Implement TypeScript types (types.ts)
  - Define `GameRecord`, `GameContent`, `FAQ` interfaces
  - Define `RewriteResult`, `GameDataExport` interfaces
  - Define `ProcessingProgress` interface

- [ ] **Step 3**: Implement configuration file (config.ts)
  - AI model settings (gemini-2.5-pro, temperature, maxTokens)
  - Processing settings (concurrency, retry, delay)
  - Meta length limits and validation rules
  - Input/output paths and brand name

**Review Point**: Verify type definitions are complete and config is reasonable

---

### Phase 2: Data Processing Modules (4 steps)

**Goal**: Implement file I/O and logging infrastructure

- [ ] **Step 4**: Implement CSV Handler (lib/csv-handler.ts)
  - `readCsv()`: Parse CSV with proper encoding
  - `writeCsv()`: Write CSV with quoted fields

- [ ] **Step 5**: Implement JSON Handler (lib/json-handler.ts)
  - `writeJson()`: Export metadata to JSON
  - `readJson()`: Parse JSON data files

- [ ] **Step 6**: Implement Content Reader (lib/content-reader.ts)
  - `readContent()`: Read markdown files from content path
  - Error handling for missing files

- [ ] **Step 7**: Implement Logger (lib/logger.ts)
  - Log levels: DEBUG, INFO, WARN, ERROR
  - Console output and file output
  - Separate error log file
  - Date-based log file naming

**Review Point**: File I/O works correctly, error handling is robust

---

### Phase 3: AI Processing Modules (3 steps)

**Goal**: Implement AI content generation and validation

- [ ] **Step 8**: Implement Prompt Builder (lib/prompt-builder.ts)
  - `buildResearchPrompt()`: Generate player-focused prompts
  - Include Google Search Grounding instructions
  - JSON output format specification
  - Style and research guidelines

- [ ] **Step 9**: Implement Gemini Rewriter (lib/gemini-rewriter.ts)
  - `rewriteGameContent()`: Call Gemini API with Search Grounding
  - Parse JSON response from AI
  - Extract content fields and meta data
  - Error handling for API failures

- [ ] **Step 10**: Implement Validator (lib/validator.ts)
  - `validate()`: Check meta title/description lengths
  - Validate short description word count
  - Validate FAQ count (3-5)
  - Return validation errors array

**Review Point**: Prompt quality is good, API calls work, validation logic is complete

---

### Phase 4: Flow Control (2 steps)

**Goal**: Implement processing orchestration and resume capability

- [ ] **Step 11**: Implement Progress Manager (lib/progress-manager.ts)
  - `saveProgress()`: Save checkpoint after each game
  - `loadProgress()`: Load existing progress on resume
  - `clearProgress()`: Clean up on completion

- [ ] **Step 12**: Implement main script (rewrite-games.ts)
  - `GameRewriter` class with all handlers
  - `processGame()`: Single game processing with retry
  - `processCsvFile()`: Batch processing with concurrency
  - `saveContentFile()`: Write markdown files
  - CLI entry point with test/production modes

**Review Point**: Resume works, concurrency control is correct, retry logic functions

---

### Phase 5: Dependencies and Testing (3 steps)

**Goal**: Install dependencies, document usage, and validate with real data

- [ ] **Step 13**: Install required dependencies
  - `csv-parse@^5.x` - CSV parsing
  - `csv-stringify@^6.x` - CSV writing
  - `p-limit@^5.x` - Concurrency control

- [ ] **Step 14**: Create README.md with usage instructions
  - Environment setup (API key)
  - Test mode instructions
  - Production mode instructions
  - Output file descriptions

- [ ] **Step 15**: Run test mode with 5 games and verify output
  - Execute: `pnpm tsx tools/rewrite/geometrylite.io/rewrite-games.ts`
  - Check output CSV has new meta columns
  - Check output JSON has correct structure
  - Check markdown files are properly formatted
  - Verify meta lengths are within limits
  - Review content quality manually

**Review Point**: Test results meet quality standards, documentation is complete

---

## Review Process

After completing each phase:

1. **Developer**: Mark all steps in the phase as completed
2. **Developer**: Commit code and notify reviewer
3. **Reviewer**: Review code quality, logic correctness, and completeness
4. **Reviewer**: Test functionality if applicable
5. **Reviewer**: Provide feedback or approve to proceed
6. **If feedback**: Developer makes changes and resubmits
7. **If approved**: Move to next phase

---

## Rollback Plan

If critical issues are found during testing:

- **Phase 1-2 issues**: Fix types or I/O logic, minimal impact
- **Phase 3 issues**: Adjust prompts or validation rules, re-test single game
- **Phase 4 issues**: Fix flow control, may need to restart test batch
- **Phase 5 issues**: Re-run test mode after fixes

---

## Success Criteria

- ✅ All 550 games processed successfully (>95% success rate)
- ✅ Meta titles: 50-60 characters
- ✅ Meta descriptions: 150-160 characters
- ✅ Content follows template structure
- ✅ Player-focused, engaging tone
- ✅ Processing completes within estimated time
- ✅ Total cost under $30 USD
- ✅ Automated validation passes
- ✅ Manual spot-check approves quality

---

---

## JSON Data Benefits

### Why Export to JSON?

1. **Structured Metadata**: JSON provides well-structured game metadata with type safety
2. **Easy Integration**: Can be imported directly into databases, APIs, or other systems
3. **Version Control**: Git-friendly format for tracking metadata changes over time
4. **Lightweight**: Contains only metadata (no content), preventing memory issues
5. **Data Validation**: Programmatically validate metadata structure and field completeness
6. **API Ready**: Perfect for serving game listings, search results, and metadata endpoints
7. **Content Separation**: References content files via `contentPath`, load content on-demand

### JSON vs CSV

| Feature          | CSV                     | JSON                         |
| ---------------- | ----------------------- | ---------------------------- |
| Size             | Compact                 | Similar (both metadata only) |
| Structure        | Flat rows               | Nested objects               |
| Type Safety      | ❌ All strings          | ✅ Typed fields              |
| Human Readable   | ✅ Basic                | ✅ Better formatting         |
| Database Import  | ✅ Direct (fastest)     | ⚡ Requires parsing          |
| Content Included | ❌ (separate .md files) | ❌ (separate .md files)      |
| API Integration  | ⚠️ Needs conversion     | ✅ Native                    |
| Version Control  | ✅                      | ✅                           |
| Use Case         | Database tables, Excel  | APIs, validation, archives   |

### Recommended Workflow

1. **Development**: Use JSON for debugging and validation (easy to inspect)
2. **Database Import**: Use CSV for bulk database import (faster, native support)
3. **API Endpoints**: Use JSON for serving game metadata to frontend/APIs
4. **Content Loading**: Read markdown files from `contentPath` on-demand to avoid memory bloat
5. **Archive**: Keep both CSV and JSON for redundancy

### File Size Comparison (550 games estimate)

- **CSV**: ~150 KB (metadata only)
- **JSON**: ~200 KB (metadata only, pretty-printed)
- **All Markdown files**: ~5-8 MB (full content)

**Total**: ~8 MB for complete dataset (manageable, no memory risk)

---

**Document Version**: 1.3
**Last Updated**: 2025-11-04
**Status**: Ready for Implementation
**Changelog**:

- v1.3 (2025-11-04): Added detailed implementation steps with phase-based review process
- v1.2 (2025-11-04): Optimized JSON export - metadata only (no content) to prevent memory issues
- v1.1 (2025-11-04): Added JSON data export functionality
- v1.0 (2025-11-03): Initial implementation guide
