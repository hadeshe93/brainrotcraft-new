# JSON 格式更新说明

## 更新概述

分类和标签数据已从 Markdown 格式转换为 JSON 格式，这大幅简化了批量导入的实施方案。

## 主要变化

### 1. 数据源更新

| 数据类型 | 原格式                                         | 新格式                                                   | 变化            |
| -------- | ---------------------------------------------- | -------------------------------------------------------- | --------------- |
| 游戏分类 | `docs/biz/project/dev-meta/game-categories.md` | `tools/rewrite/cate-and-tag/output/game-categories.json` | Markdown → JSON |
| 游戏标签 | `docs/biz/project/dev-meta/game-tags.md`       | `tools/rewrite/cate-and-tag/output/game-tags.json`       | Markdown → JSON |

### 2. JSON 数据结构

#### 分类数据 (game-categories.json)

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

#### 标签数据 (game-tags.json)

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

### 3. 字段映射（简化版）

#### 分类映射到 `categories` 表

| JSON 字段         | 数据库字段            | 说明                                     |
| ----------------- | --------------------- | ---------------------------------------- |
| `name`            | `name`                | 分类名称，直接使用                       |
| `slug`            | `slug`                | URL标识符，直接使用（已经是 kebab-case） |
| `metaTitle`       | `metadataTitle`       | SEO元标题，直接使用                      |
| `metaDescription` | `metadataDescription` | SEO元描述，直接使用                      |
| `content`         | `content`             | 完整描述，直接使用                       |
| -                 | `uuid`                | 使用 `nanoid()` 生成                     |
| -                 | `createdAt`           | Unix 时间戳                              |
| -                 | `updatedAt`           | Unix 时间戳                              |

#### 标签映射到 `tags` 表

映射规则与分类完全相同。

## 实施简化

### 1. 移除的组件

由于数据已经格式化，以下组件不再需要：

- ❌ Markdown 解析器（`parseItemsFromMarkdown`）
- ❌ Slug 生成器（`generateSlug`）
- ❌ 元描述截取器（`extractMetaDescription`）
- ❌ 元标题生成器

### 2. 简化的工具函数

**文件**: `src/lib/import-utils.ts`

只需要实现 2 个简单的 JSON 读取函数：

```typescript
import fs from 'fs/promises';

/**
 * 分类数据接口
 */
export interface CategoryData {
  name: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
}

/**
 * 标签数据接口
 */
export interface TagData {
  name: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
}

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

### 3. 更新的 API 端点

#### 分类导入 API

**端点**: `POST /api/admin/categories/import`

**默认路径更新**:

```typescript
// 旧路径
const DEFAULT_PATH = 'docs/biz/project/dev-meta/game-categories.md';

// 新路径
const DEFAULT_PATH = 'tools/rewrite/cate-and-tag/output/game-categories.json';
```

**请求体（简化）**:

```typescript
{
  // 选项1: 使用默认路径
  "useDefaultPath": true,

  // 选项2: 指定自定义路径
  "filePath": "tools/rewrite/cate-and-tag/output/game-categories.json",

  // 导入策略
  "strategy": "upsert" | "skip_existing" | "overwrite",

  // 是否删除现有数据（危险操作）
  "clearExisting": false
}
```

**实现示例**:

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
    const categories = await readCategoriesJson(fullPath);

    // 2. 可选：清空现有数据
    if (clearExisting) {
      // 危险操作，需要额外确认
      // await clearAllCategories(db);
    }

    // 3. 执行导入
    const env = await getCloudflareEnv();
    const result = await importCategories(categories, strategy, env.DB);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully imported ${result.total} categories (${result.created} created, ${result.updated} updated)`,
    });
  } catch (error) {
    console.error('Error importing categories:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
```

#### 标签导入 API

**端点**: `POST /api/admin/tags/import`

**默认路径更新**:

```typescript
// 旧路径
const DEFAULT_PATH = 'docs/biz/project/dev-meta/game-tags.md';

// 新路径
const DEFAULT_PATH = 'tools/rewrite/cate-and-tag/output/game-tags.json';
```

实现逻辑与分类导入 API 完全相同，只需替换：

- `readCategoriesJson` → `readTagsJson`
- `importCategories` → `importTags`

### 4. 服务层简化

**文件**: `src/services/content/categories.ts`

```typescript
import { nanoid } from 'nanoid';
import { createDrizzleClient } from '@/db/client';
import { categories } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * 导入策略类型
 */
export type ImportStrategy = 'upsert' | 'skip_existing' | 'overwrite';

/**
 * 分类导入结果
 */
export interface CategoryImportResult {
  name: string;
  slug: string;
  status: 'created' | 'updated' | 'skipped' | 'failed';
  uuid?: string;
  error?: string;
}

/**
 * 批量导入结果
 */
export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  items: CategoryImportResult[];
}

/**
 * 批量导入分类
 */
export async function importCategories(
  items: CategoryData[],
  strategy: ImportStrategy,
  db: D1Database,
): Promise<ImportResult> {
  const client = createDrizzleClient(db);
  const results: CategoryImportResult[] = [];
  const now = Math.floor(Date.now() / 1000);

  for (const item of items) {
    try {
      // 1. 检查是否已存在 (通过 slug)
      const existing = await client.select().from(categories).where(eq(categories.slug, item.slug)).limit(1);

      if (existing[0]) {
        if (strategy === 'skip_existing') {
          results.push({
            name: item.name,
            slug: item.slug,
            status: 'skipped',
            uuid: existing[0].uuid,
          });
          continue;
        }

        // 更新现有记录
        await client
          .update(categories)
          .set({
            name: item.name,
            metadataTitle: item.metaTitle,
            metadataDescription: item.metaDescription,
            content: item.content,
            updatedAt: now,
          })
          .where(eq(categories.uuid, existing[0].uuid));

        results.push({
          name: item.name,
          slug: item.slug,
          status: 'updated',
          uuid: existing[0].uuid,
        });
      } else {
        // 创建新记录
        const uuid = nanoid();
        await client.insert(categories).values({
          uuid,
          name: item.name,
          slug: item.slug,
          metadataTitle: item.metaTitle,
          metadataDescription: item.metaDescription,
          content: item.content,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });

        results.push({
          name: item.name,
          slug: item.slug,
          status: 'created',
          uuid,
        });
      }
    } catch (error) {
      results.push({
        name: item.name,
        slug: item.slug,
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

**文件**: `src/services/content/tags.ts`

实现逻辑与 `categories.ts` 完全相同，只需替换表名 `categories` → `tags`。

## 实施时间估算（更新）

| 阶段          | 任务               | 原预估      | 新预估      | 节省              |
| ------------- | ------------------ | ----------- | ----------- | ----------------- |
| Phase 1       | 工具函数和解析器   | 4 小时      | 1 小时      | -3 小时           |
| Phase 2       | 服务层实现         | 8 小时      | 6 小时      | -2 小时           |
| Phase 3       | API 路由实现       | 4 小时      | 3 小时      | -1 小时           |
| Testing       | 单元测试和集成测试 | 4 小时      | 3 小时      | -1 小时           |
| Documentation | API 文档和使用指南 | 2 小时      | 1 小时      | -1 小时           |
| **总计**      |                    | **22 小时** | **14 小时** | **-8 小时 (36%)** |

## 优势总结

### 1. 开发效率提升

- ✅ 无需实现复杂的 Markdown 解析逻辑
- ✅ 无需实现 slug 生成和元数据提取
- ✅ 代码量减少约 40%
- ✅ 测试用例减少约 50%

### 2. 可维护性提升

- ✅ 更少的代码意味着更少的 bug
- ✅ JSON 格式更容易验证和测试
- ✅ 数据结构清晰明确

### 3. 性能提升

- ✅ JSON 解析比 Markdown 解析更快
- ✅ 无需复杂的正则表达式匹配
- ✅ 内存占用更小

### 4. 数据质量提升

- ✅ 数据已经过预处理和验证
- ✅ slug、元标题、元描述格式统一
- ✅ 减少运行时数据转换错误

## 迁移建议

### 对于原实施指南的使用者

1. **更新数据源路径**
   - 将所有 Markdown 路径替换为对应的 JSON 路径
   - 分类：`tools/rewrite/cate-and-tag/output/game-categories.json`
   - 标签：`tools/rewrite/cate-and-tag/output/game-tags.json`

2. **移除不需要的代码**
   - 删除 Markdown 解析相关函数
   - 删除 slug 生成相关函数
   - 删除元数据提取相关函数

3. **简化数据读取**
   - 使用 `readCategoriesJson()` 替代 Markdown 读取和解析
   - 使用 `readTagsJson()` 替代 Markdown 读取和解析

4. **更新测试用例**
   - 使用 JSON 测试数据替代 Markdown 测试数据
   - 移除 Markdown 解析相关测试

## 下一步行动

1. ✅ 已完成：数据格式转换（Markdown → JSON）
2. ⏭️ 待实施：更新实施指南主文档
3. ⏭️ 待实施：按照简化方案编写代码
4. ⏭️ 待实施：编写单元测试
5. ⏭️ 待实施：集成测试和验证

---

**更新日期**: 2025-11-04
**更新原因**: 分类和标签数据已从 Markdown 转换为 JSON 格式
**影响**: 大幅简化实施方案，减少开发时间约 8 小时（36%）
