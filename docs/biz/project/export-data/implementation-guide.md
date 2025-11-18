# 游戏信息批量导出实现方案

## 一、项目概述

### 目标
在 `/tools/batch-export/` 目录下实现游戏信息的批量导出功能，生成4个JSON文件，格式完全匹配 `demo/*.json` 中的示例数据。

### 导出文件清单
1. `game-categories.json` - 游戏分类数据
2. `game-tags.json` - 游戏标签数据
3. `game-featured.json` - 游戏特色合集数据
4. `games-export.zip` - 游戏数据压缩包（包含games.json和content/*.md文件）

## 二、现状分析

### 2.1 现有API接口评估

#### ✅ 可直接使用的接口

| 接口路径 | 功能 | 返回数据 | 认证方式 | 适用性 |
|---------|------|---------|---------|--------|
| `/api/fetch/categories` | 获取所有分类 | 包含所需全部字段 | API Key | 90% 匹配 |
| `/api/fetch/tags` | 获取所有标签 | 包含所需全部字段 | API Key | 90% 匹配 |
| `/api/fetch/featured` | 获取特色合集 | 包含所需全部字段 | API Key | 90% 匹配 |
| `/api/fetch/games` | 获取游戏列表 | 返回UUID关联，需转换 | API Key | 60% 匹配 |

#### ⚠️ 数据差异分析

**字段名称差异映射表**：

| Demo JSON字段 | 数据库/API字段 | 转换方式 |
|--------------|---------------|---------|
| `metaTitle` | `metadataTitle` | 重命名 |
| `metaDescription` | `metadataDescription` | 重命名 |
| `title` (games) | `name` | 重命名 |
| `gameUrl` | `source` | 重命名 |
| `coverImage` | `thumbnail` | 重命名 |
| `pageUrl` | 无 | 构造: `https://geometrylite.io/{slug}` |
| `contentPath` | 无 | 构造: `content/{slug}.md` |
| `categories[]` | UUID数组 | 需解析为名称数组 |
| `tags[]` | UUID数组 | 需解析为名称数组 |

### 2.2 数据库结构分析

#### 核心数据表

```sql
-- 游戏主表
games: {
  uuid, name, slug, thumbnail, source,
  status, rating, createdAt, updatedAt
}

-- 分类表
categories: {
  uuid, name, slug, iconUrl,
  metadataTitle, metadataDescription, content
}

-- 标签表
tags: {
  uuid, name, slug,
  metadataTitle, metadataDescription, content
}

-- 特色合集表
featured: {
  uuid, name, slug,
  metadataTitle, metadataDescription, content
}

-- 游戏介绍表
introductions: {
  uuid, gameUuid,
  metadataTitle, metadataDescription, content
}
```

#### 关联表

```sql
gamesToCategories: { gameUuid, categoryUuid, sortOrder }
gamesToTags: { gameUuid, tagUuid, sortOrder }
gamesToFeatured: { gameUuid, featuredUuid, sortOrder }
```

### 2.3 现有服务层功能

位置：`/src/services/content/`

- `CategoryService.getAll()` - 获取所有分类
- `TagService.getAll()` - 获取所有标签
- `FeaturedService.getAll()` - 获取所有特色合集
- `GameService.getPublicGames()` - 获取公开游戏
- `IntroductionService.findByGameUuid()` - 获取游戏介绍

## 三、实现方案

### 3.1 架构设计

采用**混合架构方案**：

```
┌─────────────────────────────────────────┐
│         /tools/batch-export/            │
│         (Node.js 导出脚本)               │
└─────────────┬───────────────────────────┘
              │ HTTP请求
              ▼
┌─────────────────────────────────────────┐
│    /api/admin/export/* (新建)           │
│    (数据转换和格式化API)                 │
└─────────────┬───────────────────────────┘
              │ 调用服务层
              ▼
┌─────────────────────────────────────────┐
│     /src/services/content/*             │
│     (现有数据服务层)                     │
└─────────────┬───────────────────────────┘
              │ Drizzle ORM
              ▼
┌─────────────────────────────────────────┐
│         Cloudflare D1 Database          │
└─────────────────────────────────────────┘
```

### 3.2 实现步骤详解

#### 步骤1：创建数据转换工具类

**文件**：`/src/lib/export-transformers.ts`

```typescript
// 核心转换函数
export function transformCategoryForExport(category: Category) {
  return {
    name: category.name,
    slug: category.slug,
    iconUrl: category.iconUrl || "",
    content: category.content || "",
    metaTitle: category.metadataTitle || "",
    metaDescription: category.metadataDescription || ""
  };
}

export function transformGameForExport(game: Game, config: ExportConfig) {
  return {
    title: game.name,
    pageUrl: `${config.baseUrl}/${game.slug}`,
    gameUrl: game.source,
    coverImage: game.thumbnail,
    rating: String(game.rating || 0),
    contentPath: `content/${game.slug}.md`,
    metaTitle: game.introduction?.metadataTitle || "",
    metaDescription: game.introduction?.metadataDescription || "",
    categories: game.categories.map(c => c.name), // 需要名称，不是UUID
    tags: game.tags.map(t => t.name) // 需要名称，不是UUID
  };
}

export function generateExportMetadata(items: any[], source: string) {
  return {
    totalCount: items.length,
    generatedAt: new Date().toISOString(),
    source
  };
}
```

#### 步骤2：创建导出API端点

**分类导出API**：`/src/app/api/admin/export/categories/route.ts`

```typescript
export async function GET(request: Request) {
  // 1. 验证管理员权限
  await requireAdmin(request);

  // 2. 获取所有分类
  const categories = await CategoryService.getAll();

  // 3. 转换数据格式
  const exportData = {
    categories: categories.map(transformCategoryForExport),
    metadata: generateExportMetadata(categories, "database")
  };

  // 4. 返回JSON
  return NextResponse.json(exportData);
}
```

**游戏导出API**：`/src/app/api/admin/export/games/route.ts`

```typescript
export async function GET(request: Request) {
  // 1. 验证管理员权限
  await requireAdmin(request);

  // 2. 获取所有游戏（需要特殊查询）
  const games = await getGamesWithResolvedRelations();

  // 3. 转换数据格式
  const exportData = games.map(game =>
    transformGameForExport(game, EXPORT_CONFIG)
  );

  // 4. 返回JSON数组（注意：games.json是数组格式）
  return NextResponse.json(exportData);
}

// 特殊查询函数：解析UUID为名称
async function getGamesWithResolvedRelations() {
  const games = await db
    .select({
      game: games,
      introduction: introductions,
      categories: sql`
        GROUP_CONCAT(
          DISTINCT categories.name
          ORDER BY gamesToCategories.sortOrder
        )
      `,
      tags: sql`
        GROUP_CONCAT(
          DISTINCT tags.name
          ORDER BY gamesToTags.sortOrder
        )
      `
    })
    .from(games)
    .leftJoin(introductions, eq(games.uuid, introductions.gameUuid))
    .leftJoin(gamesToCategories, eq(games.uuid, gamesToCategories.gameUuid))
    .leftJoin(categories, eq(gamesToCategories.categoryUuid, categories.uuid))
    .leftJoin(gamesToTags, eq(games.uuid, gamesToTags.gameUuid))
    .leftJoin(tags, eq(gamesToTags.tagUuid, tags.uuid))
    .where(isNull(games.deletedAt))
    .groupBy(games.uuid);

  return games;
}
```

#### 步骤3：创建批量导出脚本

**主导出脚本**：`/tools/batch-export/export-all.ts`

```typescript
import fs from 'fs/promises';
import path from 'path';
import { fetchWithAuth } from './utils';
import { EXPORT_CONFIG } from './config';

async function exportCategories() {
  console.log('📦 Exporting categories...');
  const data = await fetchWithAuth('/api/admin/export/categories');
  await fs.writeFile(
    path.join(EXPORT_CONFIG.outputDir, 'game-categories.json'),
    JSON.stringify(data, null, 2)
  );
  console.log(`✅ Exported ${data.metadata.totalCount} categories`);
}

async function exportTags() {
  console.log('🏷️ Exporting tags...');
  const data = await fetchWithAuth('/api/admin/export/tags');
  await fs.writeFile(
    path.join(EXPORT_CONFIG.outputDir, 'game-tags.json'),
    JSON.stringify(data, null, 2)
  );
  console.log(`✅ Exported ${data.metadata.totalCount} tags`);
}

async function exportFeatured() {
  console.log('⭐ Exporting featured collections...');
  const data = await fetchWithAuth('/api/admin/export/featured');
  await fs.writeFile(
    path.join(EXPORT_CONFIG.outputDir, 'game-featured.json'),
    JSON.stringify(data, null, 2)
  );
  console.log(`✅ Exported ${data.metadata.totalCount} featured collections`);
}

async function exportGames() {
  console.log('🎮 Exporting games...');
  const data = await fetchWithAuth('/api/admin/export/games');
  await fs.writeFile(
    path.join(EXPORT_CONFIG.outputDir, 'games.json'),
    JSON.stringify(data, null, 2)
  );
  console.log(`✅ Exported ${data.length} games`);
}

async function main() {
  console.log('🚀 Starting batch export...\n');

  // 确保输出目录存在
  await fs.mkdir(EXPORT_CONFIG.outputDir, { recursive: true });

  // 并行执行所有导出
  await Promise.all([
    exportCategories(),
    exportTags(),
    exportFeatured(),
    exportGames()
  ]);

  console.log('\n✨ All exports completed successfully!');
  console.log(`📁 Output directory: ${EXPORT_CONFIG.outputDir}`);
}

// 执行主函数
main().catch(console.error);
```

**配置文件**：`/tools/batch-export/config.ts`

```typescript
export const EXPORT_CONFIG = {
  // API配置
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4004',
  apiKey: process.env.ADMIN_API_KEY || '',

  // 导出配置
  outputDir: path.join(__dirname, 'output'),

  // 游戏URL配置
  gameBaseUrl: 'https://geometrylite.io',
  contentBasePath: 'content',

  // 请求配置
  requestTimeout: 30000,
  maxRetries: 3
};
```

**工具函数**：`/tools/batch-export/utils.ts`

```typescript
export async function fetchWithAuth(endpoint: string) {
  const url = `${EXPORT_CONFIG.apiBaseUrl}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${EXPORT_CONFIG.apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: EXPORT_CONFIG.requestTimeout
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

export async function retryWithBackoff(
  fn: () => Promise<any>,
  retries = EXPORT_CONFIG.maxRetries
) {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return retryWithBackoff(fn, retries - 1);
    }
    throw error;
  }
}
```

### 3.3 执行流程

1. **环境准备**
   ```bash
   cd tools/batch-export
   npm init -y
   npm install typescript tsx node-fetch dotenv
   ```

2. **配置环境变量**
   ```env
   API_BASE_URL=http://localhost:4004
   ADMIN_API_KEY=your-admin-api-key
   ```

3. **执行导出**
   ```bash
   npx tsx export-all.ts
   ```

## 四、关键技术点

### 4.1 UUID到名称的解析

**问题**：游戏API返回的是category/tag的UUID数组，但导出需要名称数组。

**解决方案**：

1. **方案A（推荐）**：在导出API中使用JOIN查询直接获取名称
   ```sql
   SELECT games.*,
          GROUP_CONCAT(categories.name) as category_names,
          GROUP_CONCAT(tags.name) as tag_names
   FROM games
   LEFT JOIN gamesToCategories ON ...
   LEFT JOIN categories ON ...
   GROUP BY games.uuid
   ```

2. **方案B**：先获取所有categories/tags建立UUID->Name映射表
   ```typescript
   const categoryMap = new Map(categories.map(c => [c.uuid, c.name]));
   game.categories = game.categoryUuids.map(uuid => categoryMap.get(uuid));
   ```

### 4.2 数据一致性保证

- 使用事务确保读取时的数据一致性
- 排除软删除数据（`deletedAt IS NULL`）
- 按照`sortOrder`字段排序关联数据

### 4.3 性能优化

1. **批量查询**：避免N+1查询问题
2. **并行导出**：4种数据类型可并行处理
3. **流式写入**：大数据量时使用流式写入
4. **缓存机制**：categories/tags数据可缓存

### 4.4 错误处理

```typescript
try {
  const data = await fetchWithAuth(endpoint);
  // 验证数据完整性
  validateExportData(data);
  // 写入文件
  await writeJsonFile(data);
} catch (error) {
  console.error(`导出失败: ${error.message}`);
  // 记录错误日志
  await logError(error);
  // 重试机制
  if (shouldRetry(error)) {
    await retryExport();
  }
}
```

## 五、测试验证

### 5.1 单元测试

- 测试数据转换函数的正确性
- 测试字段映射的完整性
- 测试元数据生成的准确性

### 5.2 集成测试

- 测试API端点的响应格式
- 测试权限验证
- 测试大数据量处理

### 5.3 验证清单

- [ ] 导出的JSON格式与demo文件完全一致
- [ ] 所有必需字段都已包含
- [ ] 字段名称映射正确
- [ ] URL构造正确
- [ ] 分类/标签名称解析成功
- [ ] 元数据信息准确
- [ ] 文件编码为UTF-8
- [ ] JSON格式化美观（2空格缩进）

## 六、部署说明

### 6.1 开发环境

```bash
# 安装依赖
cd tools/batch-export
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 运行导出
pnpm run export
```

### 6.2 生产环境

1. 使用Cloudflare Worker定时任务
2. 或使用GitHub Actions定期执行
3. 导出结果上传到对象存储

### 6.3 监控告警

- 导出失败时发送邮件通知
- 记录导出日志到日志服务
- 监控导出耗时和数据量

## 七、后续优化

### 7.1 增量导出

- 支持按更新时间增量导出
- 减少全量导出的开销

### 7.2 格式扩展

- 支持CSV格式导出
- 支持Excel格式导出
- 支持XML格式导出

### 7.3 数据同步

- 实时同步到CDN
- 自动更新静态站点
- Webhook通知机制

## 八、游戏数据导出格式（更新）

### 8.1 ZIP包结构

游戏数据导出为 `games-export.zip` 压缩包，包含以下内容：

```
games-export.zip
├── games.json              # 游戏元数据JSON文件
└── content/                # 游戏内容文件夹
    ├── undead-corridor.md
    ├── geometry-dash.md
    ├── slope.md
    └── ...                 # 每个游戏一个.md文件
```

### 8.2 文件说明

#### **games.json**
包含所有游戏的元数据，格式为JSON数组：

```json
[
  {
    "title": "Undead Corridor",
    "pageUrl": "https://geometrylite.io/undead-corridor",
    "gameUrl": "https://undead-corridor.1games.io/",
    "coverImage": "https://...",
    "rating": "10",
    "contentPath": "content/undead-corridor.md",
    "metaTitle": "Undead Corridor - Survive...",
    "metaDescription": "Trapped in a corridor...",
    "categories": ["Action", "Shooter", "Arcade"],
    "tags": ["Survival", "Endless Runner", "Weapon"]
  }
]
```

**注意**：`contentPath` 字段指向ZIP包内的相对路径，与实际文件位置完全匹配。

#### **content/*.md**
每个游戏的详细介绍内容，文件名由游戏名称转换为 kebab-case 生成：
- 文件格式：Markdown
- 文件名：游戏名称的 kebab-case 版本（例如："Undead Corridor" → `undead-corridor.md`）
- 内容来源：`introductions.content` 字段
- 命名规则：
  - 转换为小写
  - 移除特殊字符（只保留字母、数字、空格和连字符）
  - 空格替换为连字符
  - 处理连续的连字符为单个连字符

### 8.3 导出逻辑

1. **API端**：
   - 查询所有游戏及其介绍内容
   - 解析category/tag的UUID为名称
   - 将游戏名称转换为 kebab-case 作为文件名
   - 生成 `contentPath` 字段：`content/{name-in-kebab-case}.md`
   - 返回包含 `content` 字段的完整数据

2. **前端**：
   - 接收API返回的数据
   - 生成 `games.json`（移除 `content` 字段）
   - 使用同样的 kebab-case 转换逻辑处理游戏名称
   - 为每个游戏创建 `content/{name-in-kebab-case}.md` 文件
   - 使用JSZip打包成ZIP文件
   - 自动下载ZIP包

**关键点**：
- 前后端使用相同的 kebab-case 转换逻辑，确保文件名一致
- 使用游戏名称而非 slug，避免 slug 为空的问题
- `contentPath` 字段与实际文件路径完全匹配

### 8.4 Web界面导出优势

- ✅ 自动复用管理员登录态，无需配置API Key
- ✅ 点击按钮即可导出，无需运行命令
- ✅ 实时显示导出进度和统计信息
- ✅ 自动生成ZIP包，无需手动打包
- ✅ 支持单独导出或批量导出所有数据

## 九、注意事项

1. **文件命名安全**：使用游戏名称转 kebab-case 而非 slug，避免空 slug 导致的文件名问题
2. **前后端一致性**：前后端使用相同的 kebab-case 转换逻辑，确保 contentPath 与实际文件名匹配
3. **API Key安全**：不要将API Key提交到代码仓库（Web界面无此问题）
4. **数据隐私**：确保导出的数据不包含敏感信息
5. **性能影响**：避免在高峰期执行全量导出
6. **版本控制**：导出文件建议加入版本号或时间戳
7. **备份策略**：导出前备份现有数据
8. **ZIP文件大小**：游戏数据较多时，ZIP文件可能较大，注意浏览器下载限制

## 十、相关文档

- [Demo JSON文件示例](./demo/)
- [API接口文档](../../../api-docs.md)
- [数据库Schema](../../../db/schema.ts)
- [服务层实现](../../../services/content/)
- [Web导出界面](../../../src/app/[locale]/admin/export/)

---

*文档版本：1.2.0*
*最后更新：2024-11-18*
*更新内容：*
- *v1.2.0: 使用游戏名称转 kebab-case 而非 slug 生成文件名*
- *v1.1.0: 添加游戏内容导出和Web界面支持*
- *v1.0.0: 初始版本*
*作者：Claude Assistant*