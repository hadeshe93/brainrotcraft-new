# 批量导入 API 实施指南

## 1. 项目概述

本文档描述了游戏聚合平台批量导入功能的完整实施方案，用于将自动化脚本生成的游戏分类、标签和详情数据批量导入到数据库中。

### 1.1 目标

- 批量导入游戏分类数据（从 JSON 文件）
- 批量导入游戏标签数据（从 JSON 文件）
- 批量导入游戏详情数据（从 JSON 文件）
- 支持幂等性操作（可重复导入）
- 提供详细的导入结果报告

### 1.2 数据源

| 数据类型 | 数据源                                                   | 目标表                                                       |
| -------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| 游戏分类 | `tools/rewrite/cate-and-tag/output/game-categories.json` | `categories`                                                 |
| 游戏标签 | `tools/rewrite/cate-and-tag/output/game-tags.json`       | `tags`                                                       |
| 游戏详情 | `tools/rewrite/geometrylite.io/output/games-*.json`      | `games`, `introductions`, `gamesToCategories`, `gamesToTags` |

**注意**: 分类和标签数据已从 Markdown 格式转换为 JSON 格式，简化了数据导入流程。

---

## 2. 现有 API 分析

### 2.1 已有的批量操作 API

经过检查，已存在以下批量操作 API：

1. **`POST /api/admin/games/batch`**
   - 功能：批量更新或删除游戏
   - 操作：`update` (批量更新), `delete` (批量删除)
   - 特点：针对已存在的游戏进行批量修改

2. **`POST /api/admin/comments/batch`**
   - 功能：批量审批或拒绝评论
   - 操作：`approve` (批量通过), `reject` (批量拒绝)

### 2.2 缺失的功能

现有的批量 API 主要用于**修改现有数据**，但缺少以下功能：

- ❌ 批量**导入/创建**分类数据
- ❌ 批量**导入/创建**标签数据
- ❌ 批量**导入/创建**游戏数据及关联关系

**结论**：需要新增 3 个批量导入 API。

---

## 3. 数据库表结构分析

### 3.1 Categories 表

```typescript
categories: {
  id: integer (主键)
  uuid: text (唯一，使用 nanoid 生成)
  name: text (分类名称，如 "Platform", "Rhythm")
  slug: text (唯一，URL友好格式，如 "platform", "rhythm")
  metadataTitle: text (SEO 元标题)
  metadataDescription: text (SEO 元描述)
  content: text (Markdown 格式的详细介绍)
  createdAt: integer (Unix 时间戳)
  updatedAt: integer (Unix 时间戳)
  deletedAt: integer (软删除时间戳)
}
```

### 3.2 Tags 表

```typescript
tags: {
  id: integer (主键)
  uuid: text (唯一，使用 nanoid 生成)
  name: text (标签名称，如 "Jumping", "Fast-Paced")
  slug: text (唯一，URL友好格式，如 "jumping", "fast-paced")
  metadataTitle: text (SEO 元标题)
  metadataDescription: text (SEO 元描述)
  content: text (Markdown 格式的详细介绍)
  createdAt: integer (Unix 时间戳)
  updatedAt: integer (Unix 时间戳)
  deletedAt: integer (软删除时间戳)
}
```

### 3.3 Games 表

```typescript
games: {
  id: integer (主键)
  uuid: text (唯一，使用 nanoid 生成)
  name: text (游戏名称)
  slug: text (唯一，URL友好格式)
  status: text (enum: 'draft' | 'online' | 'offline')
  thumbnail: text (缩略图 URL)
  source: text (游戏资源地址)
  interact: integer (交互次数)
  rating: real (平均评分 0-5)
  ratingCount: integer (评分人数)
  upvoteCount: integer (赞成数)
  downvoteCount: integer (反对数)
  saveCount: integer (收藏数)
  shareCount: integer (分享数)
  createdAt: integer (Unix 时间戳)
  updatedAt: integer (Unix 时间戳)
  deletedAt: integer (软删除时间戳)
}
```

### 3.4 Introductions 表

```typescript
introductions: {
  id: integer (主键)
  uuid: text (唯一，使用 nanoid 生成)
  gameUuid: text (关联 games 表，唯一索引，一对一关系)
  metadataTitle: text (SEO 元标题)
  metadataDescription: text (SEO 元描述)
  content: text (Markdown 格式的游戏详情)
  createdAt: integer (Unix 时间戳)
  updatedAt: integer (Unix 时间戳)
  deletedAt: integer (软删除时间戳)
}
```

### 3.5 关联表

```typescript
// 游戏与分类关联表 (多对多)
gamesToCategories: {
  gameUuid: text;
  categoryUuid: text;
}

// 游戏与标签关联表 (多对多)
gamesToTags: {
  gameUuid: text;
  tagUuid: text;
}
```

---

## 4. 数据映射规则

### 4.1 分类数据映射

**数据源格式** (`game-categories.json`):

```json
{
  "categories": [
    {
      "name": "Platform",
      "slug": "platform",
      "content": "Platform games are one of the most classic game genres...",
      "metaTitle": "Platform Games - Jump, Climb & Master Classic Platformers",
      "metaDescription": "Play the best platform games online! Experience classic jumping action..."
    }
  ],
  "metadata": {
    "totalCount": 15,
    "generatedAt": "2025-11-04T09:30:00.000Z",
    "source": "docs/biz/project/dev-meta/game-categories.md"
  }
}
```

**映射到 `categories` 表**:

| JSON 字段         | 目标字段                  | 转换规则                                    |
| ----------------- | ------------------------- | ------------------------------------------- |
| `name`            | `name`                    | 直接使用                                    |
| `slug`            | `slug`                    | 直接使用（已经是 kebab-case）               |
| `metaTitle`       | `metadataTitle`           | 直接使用                                    |
| `metaDescription` | `metadataDescription`     | 直接使用                                    |
| `content`         | `content`                 | 直接使用（完整描述文本）                    |
| -                 | `uuid`                    | 使用 `nanoid()` 生成                        |
| -                 | `createdAt` / `updatedAt` | Unix 时间戳 `Math.floor(Date.now() / 1000)` |

**数据读取逻辑**:

1. 读取 JSON 文件并解析
2. 从 `categories` 数组中提取所有分类对象
3. 直接映射字段到数据库表（无需额外转换）

### 4.2 标签数据映射

**数据源格式** (`game-tags.json`):

```json
{
  "tags": [
    {
      "name": "Jumping",
      "slug": "jumping",
      "content": "Jumping games emphasize vertical movement and precise timing...",
      "metaTitle": "Jumping Games - Perfect Timing & Platform Action Online",
      "metaDescription": "Master jumping games with precise timing and perfect leaps!..."
    }
  ],
  "metadata": {
    "totalCount": 60,
    "generatedAt": "2025-11-04T09:31:00.000Z",
    "source": "docs/biz/project/dev-meta/game-tags.md"
  }
}
```

**映射到 `tags` 表**:

| JSON 字段         | 目标字段                  | 转换规则                                    |
| ----------------- | ------------------------- | ------------------------------------------- |
| `name`            | `name`                    | 直接使用                                    |
| `slug`            | `slug`                    | 直接使用（已经是 kebab-case）               |
| `metaTitle`       | `metadataTitle`           | 直接使用                                    |
| `metaDescription` | `metadataDescription`     | 直接使用                                    |
| `content`         | `content`                 | 直接使用（完整描述文本）                    |
| -                 | `uuid`                    | 使用 `nanoid()` 生成                        |
| -                 | `createdAt` / `updatedAt` | Unix 时间戳 `Math.floor(Date.now() / 1000)` |

**数据读取逻辑**: 与分类数据相同

### 4.3 游戏数据映射

**数据源格式** (`games-*.json`):

```json
[
  {
    "title": "Undead Corridor",
    "pageUrl": "https://geometrylite.io/undead-corridor",
    "gameUrl": "https://undead-corridor.1games.io/",
    "coverImage": "https://enqxmjd3.gamesramp.com/gamesramp/covers/undead-corridor-game-m300x180.webp",
    "rating": "10",
    "contentPath": "content/undead-corridor.md",
    "metaTitle": "Undead Corridor - Survive the Endless Zombie Horde",
    "metaDescription": "Trapped in a corridor, face endless waves...",
    "categories": ["Action", "Shooter", "Arcade"],
    "tags": ["Survival", "Endless Runner", "Weapon", "Fast-Paced", "Skill", "Wave"]
  }
]
```

**映射到多个表**:

#### `games` 表:

| JSON 字段    | 目标字段                  | 转换规则                                                 |
| ------------ | ------------------------- | -------------------------------------------------------- |
| `title`      | `name`                    | 直接使用                                                 |
| `pageUrl`    | `slug`                    | 提取 URL 最后一段 (如 "undead-corridor")                 |
| `coverImage` | `thumbnail`               | 直接使用                                                 |
| `gameUrl`    | `source`                  | 直接使用                                                 |
| `rating`     | `rating`                  | 转换为数字 `parseFloat(rating) / 2`（原始10分制转5分制） |
| -            | `status`                  | 默认 `'draft'`                                           |
| -            | `uuid`                    | 使用 `nanoid()` 生成                                     |
| -            | 其他统计字段              | 默认 `0`                                                 |
| -            | `createdAt` / `updatedAt` | Unix 时间戳                                              |

#### `introductions` 表:

| JSON 字段         | 目标字段                  | 转换规则                       |
| ----------------- | ------------------------- | ------------------------------ |
| -                 | `gameUuid`                | 关联 `games.uuid`              |
| `metaTitle`       | `metadataTitle`           | 直接使用                       |
| `metaDescription` | `metadataDescription`     | 直接使用                       |
| `contentPath`     | `content`                 | **读取对应 markdown 文件内容** |
| -                 | `uuid`                    | 使用 `nanoid()` 生成           |
| -                 | `createdAt` / `updatedAt` | Unix 时间戳                    |

#### 关联表:

**`gamesToCategories`**:

- 遍历 `categories` 数组中的每个分类名称
- 在 `categories` 表中查找对应的 `uuid` (通过 `name` 匹配，忽略大小写)
- 插入 `{ gameUuid, categoryUuid }` 到关联表

**`gamesToTags`**:

- 遍历 `tags` 数组中的每个标签名称
- 在 `tags` 表中查找对应的 `uuid` (通过 `name` 匹配，忽略大小写)
- 插入 `{ gameUuid, tagUuid }` 到关联表

**注意事项**:

- `contentPath` 指向的 markdown 文件路径相对于 JSON 文件所在目录
- 需要先导入分类和标签数据，才能导入游戏数据（因为需要关联）
- 如果 `categories` 或 `tags` 中的名称在数据库中不存在，应记录警告但不阻断导入

---

## 5. API 设计方案

### 5.1 批量导入分类 API

**端点**: `POST /api/admin/categories/import`

**请求体**:

```typescript
{
  // 选项1: 使用默认路径
  "useDefaultPath": true,

  // 选项2: 指定自定义路径（相对于项目根目录）
  "filePath": "tools/rewrite/cate-and-tag/output/game-categories.json",

  // 导入策略
  "strategy": "upsert" | "skip_existing" | "overwrite",

  // 是否删除现有数据（危险操作）
  "clearExisting": false
}
```

**响应体**:

```typescript
{
  "success": true,
  "data": {
    "total": 15,
    "created": 12,
    "updated": 3,
    "skipped": 0,
    "failed": 0,
    "categories": [
      {
        "name": "Platform",
        "slug": "platform",
        "status": "created" | "updated" | "skipped" | "failed",
        "uuid": "abc123",
        "error": "..." // 仅在 failed 时
      }
    ]
  },
  "message": "Successfully imported 15 categories (12 created, 3 updated)"
}
```

**导入策略说明**:

- `upsert`: 如果 slug 已存在则更新，否则创建（默认）
- `skip_existing`: 如果 slug 已存在则跳过
- `overwrite`: 完全覆盖现有数据（更新所有字段）

### 5.2 批量导入标签 API

**端点**: `POST /api/admin/tags/import`

**请求体**:

```typescript
{
  "useDefaultPath": true,
  "filePath": "tools/rewrite/cate-and-tag/output/game-tags.json",
  "strategy": "upsert" | "skip_existing" | "overwrite",
  "clearExisting": false
}
```

**响应体**:

```typescript
{
  "success": true,
  "data": {
    "total": 60,
    "created": 55,
    "updated": 5,
    "skipped": 0,
    "failed": 0,
    "tags": [
      {
        "name": "Jumping",
        "slug": "jumping",
        "status": "created" | "updated" | "skipped" | "failed",
        "uuid": "def456",
        "error": "..."
      }
    ]
  },
  "message": "Successfully imported 60 tags (55 created, 5 updated)"
}
```

### 5.3 批量导入游戏 API

**端点**: `POST /api/admin/games/import`

**请求体**:

```typescript
{
  // 选项1: 使用默认路径（导入所有 games-*.json）
  "useDefaultPath": true,

  // 选项2: 指定文件模式
  "filePattern": "tools/rewrite/geometrylite.io/output/games-*.json",

  // 选项3: 指定单个文件
  "filePath": "tools/rewrite/geometrylite.io/output/games-001.json",

  // 选项4: 直接传递 JSON 数据（用于测试）
  "data": [...],

  // 导入策略
  "strategy": "upsert" | "skip_existing" | "overwrite",

  // 是否导入 introductions（需要读取 markdown 文件）
  "importIntroductions": true,

  // 是否建立分类关联
  "importCategories": true,

  // 是否建立标签关联
  "importTags": true,

  // 批量大小（每次事务处理的游戏数量）
  "batchSize": 50,

  // 是否删除现有数据（危险操作）
  "clearExisting": false
}
```

**响应体**:

```typescript
{
  "success": true,
  "data": {
    "total": 550,
    "games": {
      "created": 500,
      "updated": 50,
      "skipped": 0,
      "failed": 0
    },
    "introductions": {
      "created": 500,
      "updated": 50,
      "failed": 0
    },
    "categories": {
      "linked": 1200,
      "failed": 10,
      "missingCategories": ["未知分类1"]
    },
    "tags": {
      "linked": 2500,
      "failed": 5,
      "missingTags": ["未知标签1"]
    },
    "details": [
      {
        "name": "Undead Corridor",
        "slug": "undead-corridor",
        "status": "created" | "updated" | "skipped" | "failed",
        "uuid": "ghi789",
        "error": "...",
        "warnings": [
          "Category 'Unknown' not found",
          "Tag 'Unknown Tag' not found"
        ]
      }
    ]
  },
  "message": "Successfully imported 550 games (500 created, 50 updated)"
}
```

---

## 6. 实施步骤

### 6.1 Phase 1: 工具函数和数据解析器

**文件**: `src/lib/import-utils.ts`

需要实现以下工具函数（由于数据已转为 JSON 格式，实现大幅简化）：

1. **JSON 文件读取器（分类/标签）**

   ```typescript
   import fs from 'fs/promises';

   /**
    * 读取分类 JSON 文件
    */
   export async function readCategoriesJson(filePath: string): Promise<CategoryData[]> {
     const content = await fs.readFile(filePath, 'utf-8');
     const data = JSON.parse(content);

     if (!data.categories || !Array.isArray(data.categories)) {
       throw new Error('Invalid categories JSON format');
     }

     return data.categories;
   }

   /**
    * 读取标签 JSON 文件
    */
   export async function readTagsJson(filePath: string): Promise<TagData[]> {
     const content = await fs.readFile(filePath, 'utf-8');
     const data = JSON.parse(content);

     if (!data.tags || !Array.isArray(data.tags)) {
       throw new Error('Invalid tags JSON format');
     }

     return data.tags;
   }
   ```

2. **JSON 文件读取器（游戏）**

   ```typescript
   async function readJsonFiles(pattern: string): Promise<GameRecord[]> {
     // 使用 glob 匹配文件
     // 读取并合并所有 JSON 文件
     return games;
   }
   ```

3. **Markdown 文件读取器（游戏介绍）**

   ```typescript
   async function readMarkdownFile(path: string): Promise<string> {
     // 读取 markdown 文件内容（仅用于游戏介绍）
     return content;
   }
   ```

**注意**：由于分类和标签数据已经包含了完整的 slug、metaTitle、metaDescription 等字段，不再需要以下工具函数：

- ~~Markdown 解析器~~
- ~~Slug 生成器~~
- ~~元描述截取器~~

### 6.2 Phase 2: 服务层实现

#### 文件: `src/services/content/categories.ts`

新增函数：

```typescript
/**
 * 批量导入分类
 */
export async function importCategories(
  items: ParsedCategory[],
  strategy: ImportStrategy,
  db: D1Database,
): Promise<ImportResult> {
  const client = createDrizzleClient(db);
  const results: CategoryImportResult[] = [];

  for (const item of items) {
    try {
      // 1. 检查是否已存在 (通过 slug)
      const existing = await getCategoryBySlug(item.slug, db);

      if (existing) {
        if (strategy === 'skip_existing') {
          results.push({ ...item, status: 'skipped', uuid: existing.uuid });
          continue;
        }

        // 更新现有记录
        await updateCategory(existing.uuid, item, db);
        results.push({ ...item, status: 'updated', uuid: existing.uuid });
      } else {
        // 创建新记录
        const newCategory = await createCategory(item, db);
        results.push({ ...item, status: 'created', uuid: newCategory.uuid });
      }
    } catch (error) {
      results.push({
        ...item,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    total: items.length,
    created: results.filter((r) => r.status === 'created').length,
    updated: results.filter((r) => r.status === 'updated').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    failed: results.filter((r) => r.status === 'failed').length,
    items: results,
  };
}
```

#### 文件: `src/services/content/tags.ts`

新增函数：

```typescript
/**
 * 批量导入标签
 */
export async function importTags(items: ParsedTag[], strategy: ImportStrategy, db: D1Database): Promise<ImportResult> {
  // 实现逻辑与 importCategories 类似
}
```

#### 文件: `src/services/content/games.ts`

新增函数：

```typescript
/**
 * 批量导入游戏（带事务支持）
 */
export async function importGames(
  items: ParsedGame[],
  options: ImportGamesOptions,
  db: D1Database,
): Promise<GameImportResult> {
  const client = createDrizzleClient(db);
  const results: GameDetailResult[] = [];

  // 批量处理（使用事务）
  for (let i = 0; i < items.length; i += options.batchSize) {
    const batch = items.slice(i, i + options.batchSize);

    await db.batch(
      batch.map(async (item) => {
        try {
          // 1. 导入游戏基本信息
          const game = await importSingleGame(item, options.strategy, db);

          // 2. 导入游戏介绍
          if (options.importIntroductions) {
            await importGameIntroduction(game.uuid, item, db);
          }

          // 3. 建立分类关联
          if (options.importCategories) {
            await linkGameToCategories(game.uuid, item.categories, db);
          }

          // 4. 建立标签关联
          if (options.importTags) {
            await linkGameToTags(game.uuid, item.tags, db);
          }

          results.push({ ...item, status: 'created', uuid: game.uuid });
        } catch (error) {
          results.push({
            ...item,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }),
    );
  }

  return aggregateResults(results);
}

/**
 * 导入单个游戏
 */
async function importSingleGame(item: ParsedGame, strategy: ImportStrategy, db: D1Database): Promise<Game> {
  // 实现逻辑...
}

/**
 * 导入游戏介绍
 */
async function importGameIntroduction(gameUuid: string, item: ParsedGame, db: D1Database): Promise<void> {
  // 1. 读取 contentPath 对应的 markdown 文件
  // 2. 创建或更新 introduction 记录
}

/**
 * 建立游戏与分类的关联
 */
async function linkGameToCategories(gameUuid: string, categoryNames: string[], db: D1Database): Promise<LinkResult> {
  const client = createDrizzleClient(db);
  const results: LinkItemResult[] = [];

  for (const name of categoryNames) {
    // 1. 查找分类 UUID (忽略大小写)
    const category = await client
      .select()
      .from(categories)
      .where(sql`LOWER(${categories.name}) = ${name.toLowerCase()}`)
      .limit(1);

    if (!category[0]) {
      results.push({ name, status: 'not_found' });
      continue;
    }

    // 2. 检查关联是否已存在
    const existing = await client
      .select()
      .from(gamesToCategories)
      .where(and(eq(gamesToCategories.gameUuid, gameUuid), eq(gamesToCategories.categoryUuid, category[0].uuid)))
      .limit(1);

    if (existing[0]) {
      results.push({ name, status: 'already_linked', uuid: category[0].uuid });
      continue;
    }

    // 3. 创建关联
    await client.insert(gamesToCategories).values({
      gameUuid,
      categoryUuid: category[0].uuid,
    });

    results.push({ name, status: 'linked', uuid: category[0].uuid });
  }

  return {
    linked: results.filter((r) => r.status === 'linked').length,
    alreadyLinked: results.filter((r) => r.status === 'already_linked').length,
    notFound: results.filter((r) => r.status === 'not_found').length,
    missingItems: results.filter((r) => r.status === 'not_found').map((r) => r.name),
  };
}

/**
 * 建立游戏与标签的关联
 */
async function linkGameToTags(gameUuid: string, tagNames: string[], db: D1Database): Promise<LinkResult> {
  // 实现逻辑与 linkGameToCategories 类似
}
```

### 6.3 Phase 3: API 路由实现

#### 文件: `src/app/api/admin/categories/import/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { requireAdmin } from '@/lib/auth-helpers';
import { readCategoriesJson } from '@/lib/import-utils';
import { importCategories } from '@/services/content/categories';
import path from 'path';

const DEFAULT_PATH = 'tools/rewrite/cate-and-tag/output/game-categories.json';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { useDefaultPath = true, filePath = DEFAULT_PATH, strategy = 'upsert', clearExisting = false } = body;

    // 1. 读取 JSON 文件
    const fullPath = path.join(process.cwd(), useDefaultPath ? DEFAULT_PATH : filePath);
    const items = await readCategoriesJson(fullPath);

    // 2. 可选：清空现有数据
    if (clearExisting) {
      // 危险操作，需要额外确认
      // await clearAllCategories(db);
    }

    // 3. 执行导入
    const env = await getCloudflareEnv();
    const result = await importCategories(items, strategy, env.DB);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully imported ${result.total} categories (${result.created} created, ${result.updated} updated)`,
    });
  } catch (error) {
    console.error('Error importing categories:', error);
    // 错误处理...
  }
}
```

#### 文件: `src/app/api/admin/tags/import/route.ts`

实现逻辑与 `categories/import` 类似。

#### 文件: `src/app/api/admin/games/import/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { requireAdmin } from '@/lib/auth-helpers';
import { readJsonFiles } from '@/lib/import-utils';
import { importGames } from '@/services/content/games';
import path from 'path';

const DEFAULT_PATTERN = 'tools/rewrite/geometrylite.io/output/games-*.json';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      useDefaultPath = true,
      filePattern = DEFAULT_PATTERN,
      filePath,
      data,
      strategy = 'upsert',
      importIntroductions = true,
      importCategories = true,
      importTags = true,
      batchSize = 50,
      clearExisting = false,
    } = body;

    // 1. 获取游戏数据
    let games: ParsedGame[];

    if (data) {
      // 直接使用传递的数据
      games = data;
    } else if (filePath) {
      // 读取单个文件
      const fullPath = path.join(process.cwd(), filePath);
      games = JSON.parse(await fs.readFile(fullPath, 'utf-8'));
    } else {
      // 使用文件模式匹配
      const pattern = useDefaultPath ? DEFAULT_PATTERN : filePattern;
      games = await readJsonFiles(pattern);
    }

    // 2. 可选：清空现有数据
    if (clearExisting) {
      // 危险操作，需要额外确认
      // await clearAllGames(db);
    }

    // 3. 执行导入
    const env = await getCloudflareEnv();
    const result = await importGames(
      games,
      {
        strategy,
        importIntroductions,
        importCategories,
        importTags,
        batchSize,
      },
      env.DB,
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully imported ${result.games.total} games`,
    });
  } catch (error) {
    console.error('Error importing games:', error);
    // 错误处理...
  }
}
```

---

## 7. 使用流程

### 7.1 导入顺序

由于游戏数据依赖于分类和标签数据，**必须按以下顺序执行导入**：

1. ✅ **先导入分类数据**

   ```bash
   POST /api/admin/categories/import
   {
     "useDefaultPath": true,
     "strategy": "upsert"
   }
   ```

2. ✅ **再导入标签数据**

   ```bash
   POST /api/admin/tags/import
   {
     "useDefaultPath": true,
     "strategy": "upsert"
   }
   ```

3. ✅ **最后导入游戏数据**
   ```bash
   POST /api/admin/games/import
   {
     "useDefaultPath": true,
     "strategy": "upsert",
     "importIntroductions": true,
     "importCategories": true,
     "importTags": true,
     "batchSize": 50
   }
   ```

### 7.2 典型使用场景

#### 场景 1: 首次全量导入

```bash
# 1. 导入分类
curl -X POST http://localhost:4004/api/admin/categories/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -d '{"useDefaultPath": true, "strategy": "upsert"}'

# 2. 导入标签
curl -X POST http://localhost:4004/api/admin/tags/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -d '{"useDefaultPath": true, "strategy": "upsert"}'

# 3. 导入游戏（分批导入，每批50个）
curl -X POST http://localhost:4004/api/admin/games/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -d '{
    "useDefaultPath": true,
    "strategy": "upsert",
    "importIntroductions": true,
    "importCategories": true,
    "importTags": true,
    "batchSize": 50
  }'
```

#### 场景 2: 增量更新（只更新变化的数据）

```bash
# 使用 skip_existing 策略，只导入新数据
curl -X POST http://localhost:4004/api/admin/games/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -d '{
    "useDefaultPath": true,
    "strategy": "skip_existing",
    "importIntroductions": true,
    "importCategories": true,
    "importTags": true
  }'
```

#### 场景 3: 测试导入（单个文件）

```bash
# 只导入一个测试文件
curl -X POST http://localhost:4004/api/admin/games/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -d '{
    "filePath": "tools/rewrite/geometrylite.io/output/games-001.json",
    "strategy": "upsert",
    "importIntroductions": false,
    "importCategories": true,
    "importTags": true
  }'
```

---

## 8. 技术要点和注意事项

### 8.1 幂等性保证

- 使用 `slug` 作为唯一标识符检查记录是否已存在
- 支持 `upsert` 策略，可重复执行导入而不产生重复数据
- 关联表在插入前检查是否已存在关联关系

### 8.2 事务处理

- 游戏导入使用批量事务（`db.batch`）
- 每批 50 个游戏作为一个事务单元
- 单个游戏失败不影响整批次其他游戏的导入

### 8.3 错误处理

- 每个导入项独立处理错误，记录详细错误信息
- 分类/标签未找到时记录警告，但不阻断游戏导入
- 返回详细的导入结果报告，包含成功、失败、跳过的统计

### 8.4 性能优化

- **批量插入**: 使用 `db.batch` 减少数据库往返次数
- **并发控制**: 批量大小可配置（默认 50）
- **索引利用**: 通过 `slug` 索引快速查找现有记录
- **文件读取**: 仅在需要时读取 markdown 文件

### 8.5 数据验证

- **必填字段**: 确保 name, slug, thumbnail, source 等必填字段存在
- **Slug 唯一性**: 检查 slug 冲突
- **Rating 范围**: 验证评分在 0-5 范围内
- **URL 格式**: 验证 URL 格式正确

### 8.6 安全性

- **权限验证**: 所有导入 API 要求管理员权限（`requireAdmin()`）
- **路径安全**: 验证文件路径，防止路径遍历攻击
- **数据清理**: `clearExisting` 参数需要额外确认机制

---

## 9. 测试计划

### 9.1 单元测试

- `readCategoriesJson()` - 测试分类 JSON 读取和解析
- `readTagsJson()` - 测试标签 JSON 读取和解析
- `importCategories()` - 测试分类导入逻辑
- `importTags()` - 测试标签导入逻辑
- `importGames()` - 测试游戏导入逻辑

### 9.2 集成测试

- 测试完整的导入流程（分类 → 标签 → 游戏）
- 测试幂等性（重复导入相同数据）
- 测试关联关系建立
- 测试错误处理和回滚

### 9.3 性能测试

- 测试批量导入 550+ 游戏的耗时
- 测试不同批量大小对性能的影响
- 测试数据库连接池使用情况

---

## 10. 实施时间估算

| 阶段          | 任务               | 原预估      | 新预估（JSON 格式） | 节省              |
| ------------- | ------------------ | ----------- | ------------------- | ----------------- |
| Phase 1       | 工具函数和解析器   | 4 小时      | 1 小时              | -3 小时           |
| Phase 2       | 服务层实现         | 8 小时      | 6 小时              | -2 小时           |
| Phase 3       | API 路由实现       | 4 小时      | 3 小时              | -1 小时           |
| Testing       | 单元测试和集成测试 | 4 小时      | 3 小时              | -1 小时           |
| Documentation | API 文档和使用指南 | 2 小时      | 1 小时              | -1 小时           |
| **总计**      |                    | **22 小时** | **14 小时**         | **-8 小时 (36%)** |

**说明**：由于分类和标签数据已从 Markdown 格式转换为 JSON 格式，所有字段（slug、metaTitle、metaDescription）已预处理完成，大幅简化了实施工作，开发时间减少约 36%。

---

## 11. 风险和缓解措施

### 11.1 风险识别

| 风险                       | 影响 | 概率 | 缓解措施                                 |
| -------------------------- | ---- | ---- | ---------------------------------------- |
| 大量数据导入导致数据库压力 | 高   | 中   | 使用批量处理，限制并发数，添加进度监控   |
| JSON 格式不正确            | 中   | 低   | 添加详细的 JSON 验证，提供清晰的错误提示 |
| 分类/标签名称不匹配        | 中   | 中   | 使用忽略大小写匹配，记录未匹配项         |
| 事务超时                   | 高   | 低   | 减小批量大小，增加超时时间配置           |
| 文件路径错误               | 低   | 低   | 验证路径存在性，提供清晰的错误提示       |

### 11.2 回滚策略

- 数据库备份：导入前创建数据库快照
- 事务回滚：批次失败时回滚该批次所有操作
- 软删除：使用 `deletedAt` 字段标记删除，而非物理删除

---

## 12. 后续优化建议

1. **增量导入优化**
   - 添加文件 MD5 检查，跳过未变化的文件
   - 支持增量同步（只导入新增/修改的游戏）

2. **导入队列**
   - 使用后台任务队列处理大规模导入
   - 提供导入进度查询 API

3. **数据验证增强**
   - 添加数据质量检查报告
   - 支持导入前预览（dry-run 模式）

4. **监控和告警**
   - 添加导入性能监控
   - 失败率超过阈值时发送告警

5. **UI 界面**
   - 开发管理后台页面，可视化导入操作
   - 显示导入历史和结果统计

---

## 13. 结论

本实施指南提供了完整的批量导入 API 设计方案，涵盖：

- ✅ 3 个批量导入 API（分类、标签、游戏）
- ✅ 完整的数据映射规则
- ✅ 幂等性和事务支持
- ✅ 详细的错误处理和结果报告
- ✅ 性能优化策略
- ✅ 安全性保障

**建议审核要点**：

1. 数据映射规则是否符合业务需求？
2. API 接口设计是否满足使用场景？
3. 导入策略（upsert/skip/overwrite）是否合理？
4. 批量大小和性能配置是否需要调整？
5. 错误处理和回滚机制是否完善？

审核通过后即可开始编码实施。
