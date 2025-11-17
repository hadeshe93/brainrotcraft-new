# Game Content Rewriter

Rewrite game introductions, meta titles, and meta descriptions using Google's Gemini AI (gemini-2.5-pro) with Google Search Grounding capability.

## Features

- 🤖 AI-powered content generation using Gemini 2.5 Pro
- 🔍 Google Search Grounding for accurate, up-to-date information
- 🔌 **Multiple AI providers**: Google AI Direct or OpenRouter
- 📊 Concurrent processing (4 parallel requests)
- 🔄 Automatic retry on failures
- 💾 **Global checkpoint management** with resume/restart options
- 🎯 **Test/Production mode selection** - test with 5 games or run full batch
- 📦 **Batch CSV processing** - automatically processes all CSV files in sequence
- ✅ Automated validation (meta lengths, FAQ count, etc.)
- 📝 Dual output: CSV + JSON + Markdown files
- 📋 Detailed logging (console + file)

## Prerequisites

### Environment Setup

Add your AI API Key to `.env.local` file at the project root.

#### Option 1: Google AI Direct (Default)

```bash
GOOGLE_AI_API_KEY="your-google-api-key-here"
AI_PROVIDER="google"
```

Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

**Rate Limits (Free Tier)**: 2 requests per minute

#### Option 2: OpenRouter (Recommended for High Volume)

```bash
OPENROUTER_API_KEY="your-openrouter-api-key-here"
AI_PROVIDER="openrouter"
```

Get your API key from [OpenRouter](https://openrouter.ai/keys).

**Benefits**:

- Higher rate limits
- More stable for batch processing
- Access to multiple AI models through one API
- Better for processing 500+ games

**Note**: The `AI_PROVIDER` environment variable determines which provider to use. If not set, defaults to `google`.

### Input Data

Ensure your input CSV files exist in the directory:

```
tools/spider/geometrylite.io/output/
```

The script automatically detects and processes all CSV files matching the pattern `games-*.csv` (e.g., `games-001.csv`, `games-002.csv`, etc.).

Expected CSV columns:

- `title` - Game title
- `pageUrl` - Page URL on your site
- `gameUrl` - External game URL
- `coverImage` - Cover image URL
- `rating` - Game rating
- `contentPath` - Relative path to original markdown content

## Quick Start

### Running the Script

Simply run the script:

```bash
pnpm tsx tools/rewrite/geometrylite.io/rewrite-games.ts
```

### Interactive Workflow

The script provides an interactive CLI workflow:

#### 1. **Resume or Restart** (if progress file exists)

When you run the script and a global progress file exists, you'll be prompted:

```
🔍 检测到全局断点恢复文件
   当前进度: games-001.csv (第 1/11 个文件)
   当前文件进度: 3/5 游戏

? 请选择处理方式：
  ❯ 📂 恢复断点继续运行 (Resume from checkpoint)
    🔄 重新开始（删除进度文件）(Restart from beginning)
```

- **Resume**: Continue from the last processed game in the last CSV file
- **Restart**: Delete progress file and start from scratch

#### 2. **Select Mode** (when restarting or first run)

Choose between test and production modes:

```
? 请选择运行模式：
  ❯ 🧪 测试模式（仅处理前 5 个游戏）
    🚀 生产模式（处理所有游戏）
```

- **Test Mode**: Process only the first 5 games from each CSV file (for validation)
- **Production Mode**: Process all games from all CSV files

#### 3. **Processing**

The script will:

- Process all CSV files sequentially (e.g., `games-001.csv` → `games-002.csv` → ...)
- Save progress after each game
- Continue to the next CSV file after completing the current one

### Output Structure

**Test Mode Output:**

- `tools/rewrite/geometrylite.io/output/games-001-test.csv`
- `tools/rewrite/geometrylite.io/output/games-001-test.json`
- `tools/rewrite/geometrylite.io/output/games-002-test.csv`
- `tools/rewrite/geometrylite.io/output/games-002-test.json`
- `tools/rewrite/geometrylite.io/output/content/*.md` (markdown files for all processed games)
- `tools/rewrite/geometrylite.io/output/logs/rewrite-YYYY-MM-DD.log`

**Production Mode Output:**

- `tools/rewrite/geometrylite.io/output/games-001.csv`
- `tools/rewrite/geometrylite.io/output/games-001.json`
- ... (all CSV files)
- `tools/rewrite/geometrylite.io/output/content/*.md`
- `tools/rewrite/geometrylite.io/output/logs/rewrite-YYYY-MM-DD.log`

## Output Structure

### CSV File

Contains all game metadata with added `metaTitle` and `metaDescription` columns:

```csv
title,pageUrl,gameUrl,coverImage,rating,contentPath,metaTitle,metaDescription
"1v1 lol","https://geometrylite.io/1v1-lol","https://1v1lol.io/","...","10","content/1v1-lol.md","1v1 LOL - Epic Building & Shooting Battle Arena","Master building and shooting in 1v1 LOL! Compete in intense 1v1 duels..."
```

### JSON File

Lightweight metadata-only structure (no full content):

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
  }
]
```

### Markdown Files

Full game content stored in `output/content/`:

```markdown
Experience intense 1v1 battles combining building and shooting mechanics in this competitive arena game.

## What is 1v1 LOL?

[Comprehensive introduction...]

## How to Play 1v1 LOL?

[Detailed gameplay instructions...]

## What Makes 1v1 LOL Special?

[Unique selling points...]

## Frequently Asked Questions

### Can I play 1v1 LOL on mobile?

[Answer...]
```

## Configuration

Edit `config.ts` to customize:

```typescript
export const CONFIG = {
  // AI Model Settings
  model: 'gemini-2.5-pro',
  temperature: 0.7,
  maxTokens: 4000,

  // Processing Settings
  concurrency: 4, // Concurrent requests
  retryAttempts: 1, // Retry count
  retryDelay: 2000, // Delay between retries (ms)

  // Validation Rules
  metaTitle: { min: 50, max: 60 },
  metaDescription: { min: 150, max: 160 },
  shortDescription: { minWords: 20, maxWords: 40 },
  faqCount: { min: 3, max: 5 },
};
```

## Global Progress Management

The system features **global checkpoint management** across all CSV files:

### How It Works

1. **Global Progress Tracking**: After each game is processed, a single global progress file is saved to:

   ```
   tools/rewrite/geometrylite.io/output/progress/rewrite-progress.json
   ```

   This file tracks:
   - Current CSV file being processed
   - Current game index within that CSV file
   - List of successfully completed CSV files
   - Selected run mode (test/production)

2. **Smart Detection**: When you run the script again, it detects the progress file and prompts you to resume or restart.

3. **Choose Your Action**:
   - **Resume**: Continue from the last processed game in the last CSV file
   - **Restart**: Delete progress file and start from the beginning

### When Progress is Cleared

The global progress file is automatically cleared only when:

- ✅ All CSV files are processed successfully
- 🔄 You manually choose "Restart" option

The progress file is **preserved** when:

- ❌ Some games or CSV files fail (allows you to fix issues and retry)
- ⏸️ Processing is interrupted (Ctrl+C, crash, etc.)

### Non-Interactive Mode

In non-interactive environments (CI/CD, scripts), the behavior is:

- If progress file exists: automatically resumes
- If no progress file: starts with test mode by default

## Error Handling

- **Retry Logic**: Each game gets 1 automatic retry on failure
- **Error Logs**: Detailed errors saved to `output/logs/errors.log`
- **Skip on Failure**: Failed games are logged and skipped, processing continues
- **Progress Tracking**: Progress saved after each game for safe recovery

## Validation

All generated content is automatically validated:

- ✅ Meta title: 50-60 characters
- ✅ Meta description: 150-160 characters
- ✅ Short description: 20-40 words
- ✅ FAQ count: 3-5 questions
- ✅ All required fields present

## Cost and Time Estimates

Assuming 11 CSV files with ~50 games each (total ~550 games):

### Test Mode (5 games per CSV, 55 total)

- **Cost**: ~$1.10 - $2.20 USD
- **Time**: ~3-5 minutes

### Production Mode (all ~550 games)

- **Cost**: ~$15 - $25 USD
- **Time**: ~45-60 minutes

_Note: Costs include Google Search Grounding queries. Monitor your first few requests to adjust estimates._

## Logs

Logs are stored in `output/logs/`:

- `rewrite-YYYY-MM-DD.log` - Daily general log
- `errors.log` - Error-specific log

Example log entry:

```
[2025-11-04T10:30:45.123Z] [INFO] [1/5] Processing: 1v1 lol
[2025-11-04T10:30:58.456Z] [INFO] ✅ Success: 1v1 lol (attempt 1)
```

## Troubleshooting

### API Key Not Found

```
Error: GOOGLE_AI_API_KEY is not set
```

**Solution**: Set the environment variable or add to `.env` file.

### Rate Limit Errors

```
Error: Rate limit exceeded
```

**Solution**: Reduce `concurrency` in `config.ts` (e.g., from 4 to 2).

### Validation Errors

```
Validation failed: metaTitle length 65 outside range 50-60
```

**Solution**: The system will retry once. If it fails again, check the prompt in `lib/prompt-builder.ts`.

### File Not Found

```
Failed to read content from [path]
```

**Solution**: Verify the input CSV `contentPath` values are correct.

## Project Structure

```
tools/rewrite/geometrylite.io/
├── rewrite-games.ts          # Main entry point
├── config.ts                 # Configuration
├── types.ts                  # TypeScript types
├── lib/
│   ├── csv-handler.ts        # CSV I/O
│   ├── json-handler.ts       # JSON export
│   ├── content-reader.ts     # Read original content
│   ├── gemini-rewriter.ts    # Gemini API integration
│   ├── prompt-builder.ts     # Prompt generation
│   ├── validator.ts          # Output validation
│   ├── progress-manager.ts   # Progress tracking
│   └── logger.ts             # Logging system
├── output/
│   ├── content/              # Markdown files
│   ├── logs/                 # Log files
│   └── progress/             # Progress checkpoints
└── README.md                 # This file
```

## Development

### Run TypeScript Type Check

```bash
pnpm typecheck
```

### Modify Prompts

Edit `lib/prompt-builder.ts` to customize the AI prompts.

### Adjust Validation Rules

Edit `config.ts` to change meta length limits, FAQ counts, etc.

## Support

For issues or questions, refer to the implementation guide:

```
docs/biz/project/dev-rewrite/implementation-guide.md
```
