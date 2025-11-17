# 数据库多语言支持实现方案

## 一、方案概述

### 1.1 混合存储策略

| 数据类型 | 存储方式 | 表 | 理由 |
|---------|---------|---|------|
| 短文本（games.name） | JSON 字段 | 主表 | 高频查询，避免 JOIN，性能优先 |
| SEO 长文本 | 翻译表 | 独立表 | 支持状态管理、版本历史、灵活扩展 |
| 主表原字段 | 保留 | 主表 | 承载默认语言（英语），零迁移成本 |

### 1.2 核心原则

- **方案A**: 原表保留英文，翻译表存其他语言（向后兼容，低风险）
- **渐进式**: 逐个语言添加，无需预定义所有语言
- **字段级回退**: 部分字段翻译，其余回退到英文
- **性能优先**: 默认语言（80%+ 用户）无额外查询开销
- **代码配置**: 语言列表维护在 `src/i18n/language.ts`，不使用数据库表
- **自动化翻译**: 通过队列系统实现批量 AI 翻译

### 1.3 开发规范

#### UI 组件优先级

采用本地已有组件 > 安装并采用缺少的 Shadcn UI 组件 > 采用 Magic UI 组件 > 创建新组件

#### 配置驱动式生成

- **Table 组件**: 使用配置驱动式生成，避免重复编写大量类似标签
- **表单组件**: 使用配置驱动式生成，减少打包体积
- **存量组件**: 根据新经验逐渐更新替换

#### 数据库迁移

- **只修改** `src/db/schema.ts` 文件
- **自动生成**: 运行 `pnpm drizzle:generate` 生成 SQL 文件
- **禁止**: 手动创建 SQL 文件

#### 代码质量

- **SOLID 原则**: 所有代码必须遵循 SOLID 原则
  - 单一职责原则（SRP）
  - 开闭原则（OCP）
  - 里氏替换原则（LSP）
  - 接口隔离原则（ISP）
  - 依赖倒置原则（DIP）

#### 队列处理

- **服务封装**: 消费任务队列的逻辑封装为独立服务，存放到 `src/services/` 目录
- **环境区分**:
  - 本地开发：直接调用服务函数
  - 线上环境：通过 Cloudflare Queues 异步处理

---

## 二、数据库设计

### 2.1 需要多语言支持的表

| 表 | 需要翻译的字段 | 策略 |
|---|---------------|------|
| **games** | `name` | JSON 字段 `name_i18n` |
| **categories** | `metadataTitle`, `metadataDescription`, `content` | 翻译表 |
| **tags** | `metadataTitle`, `metadataDescription`, `content` | 翻译表 |
| **featured** | `metadataTitle`, `metadataDescription`, `content` | 翻译表 |
| **introductions** | `metadataTitle`, `metadataDescription`, `content` | 翻译表 |

### 2.2 JSON 字段设计 (games.name_i18n)

#### Schema 定义
```typescript
// src/db/schema.ts
export const games = sqliteTable('games', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  name: text('name'),  // 保留，作为默认显示名（通常为英文）
  nameI18n: text('name_i18n', { mode: 'json' })
    .$type<Record<string, string>>()
    .notNull(),  // {"en": "Super Mario", "zh": "超级马里奥"}
  slug: text('slug').notNull().unique(),
  // ...其他字段
});
```

#### 数据示例
```json
{
  "id": 1,
  "uuid": "game-001",
  "name": "Super Mario Bros",
  "name_i18n": "{\"en\": \"Super Mario Bros\", \"zh\": \"超级马里奥兄弟\", \"ja\": \"スーパーマリオブラザーズ\"}",
  "slug": "super-mario-bros"
}
```

#### TypeScript 类型
```typescript
type Game = {
  uuid: string;
  name?: string;
  nameI18n: {
    en: string;
    zh?: string;
    ja?: string;
    [locale: string]: string | undefined;
  };
  slug: string;
};
```

### 2.3 翻译表设计

#### Schema 定义
```typescript
// category_translations (同理适用于 tags, featured, introductions)
export const categoryTranslations = sqliteTable(
  'category_translations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    categoryUuid: text('category_uuid').notNull(),
    locale: text('locale').notNull(),  // 'zh', 'ja', 'es' 等（不包括 'en'）
    metadataTitle: text('metadata_title').notNull(),
    metadataDescription: text('metadata_description').notNull(),
    content: text('content'),  // Markdown
    createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
  },
  (table) => ({
    uniqueTranslation: uniqueIndex('category_translations_unique')
      .on(table.categoryUuid, table.locale),
    categoryUuidIdx: index('category_translations_uuid_idx').on(table.categoryUuid),
    localeIdx: index('category_translations_locale_idx').on(table.locale),
  })
);

// 关系定义
export const categoriesRelations = relations(categories, ({ many }) => ({
  translations: many(categoryTranslations),
}));

export const categoryTranslationsRelations = relations(categoryTranslations, ({ one }) => ({
  category: one(categories, {
    fields: [categoryTranslations.categoryUuid],
    references: [categories.uuid],
  }),
}));
```

#### 主表保留字段（承载英文）
```typescript
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  name: text('name').notNull(),           // 分类名称（不翻译）
  slug: text('slug').notNull().unique(),  // URL slug（不翻译）
  iconUrl: text('icon_url'),
  // 以下字段保留，承载英文内容
  metadataTitle: text('metadata_title').notNull(),
  metadataDescription: text('metadata_description').notNull(),
  content: text('content'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at'),
});
```

#### 数据示例

**categories 表：**
```json
{
  "uuid": "cat-001",
  "name": "Action",
  "slug": "action",
  "metadataTitle": "Action Games - Play Free Online",
  "metadataDescription": "Discover the best action games online...",
  "content": "# Action Games\n\nAction games are..."
}
```

**category_translations 表：**
```json
[
  {
    "id": 1,
    "category_uuid": "cat-001",
    "locale": "zh",
    "metadata_title": "动作游戏 - 免费在线玩",
    "metadata_description": "探索最佳在线动作游戏...",
    "content": "# 动作游戏\n\n动作游戏是..."
  },
  {
    "id": 2,
    "category_uuid": "cat-001",
    "locale": "ja",
    "metadata_title": "アクションゲーム - 無料でオンラインプレイ",
    "metadata_description": "最高のオンラインアクションゲームを発見...",
    "content": "# アクションゲーム\n\nアクションゲームは..."
  }
]
```

### 2.4 翻译任务表设计

用于管理自动化翻译任务的进度和状态追踪。

#### Schema 定义
```typescript
export const translationTasks = sqliteTable('translation_tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  languageCode: text('language_code').notNull(),  // 'zh', 'ja' 等
  type: text('type').notNull(),  // 'full' | 'supplement'
  status: text('status').notNull(),  // 'pending' | 'running' | 'completed' | 'failed'

  // 进度详情（JSON 格式）
  progress: text('progress', { mode: 'json' })
    .$type<{
      games: { done: number; total: number };
      categories: { done: number; total: number };
      tags: { done: number; total: number };
      featured: { done: number; total: number };
    }>(),

  // 错误信息（失败时）
  error: text('error'),

  // 时间戳
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  startedAt: integer('started_at'),
  completedAt: integer('completed_at'),
}, (table) => ({
  languageCodeIdx: index('translation_tasks_language_code_idx').on(table.languageCode),
  statusIdx: index('translation_tasks_status_idx').on(table.status),
}));
```

#### 数据示例
```json
{
  "uuid": "task-001",
  "language_code": "zh",
  "type": "supplement",
  "status": "running",
  "progress": {
    "games": { "done": 50, "total": 200 },
    "categories": { "done": 8, "total": 10 },
    "tags": { "done": 0, "total": 50 },
    "featured": { "done": 0, "total": 5 }
  },
  "created_at": 1704067200,
  "started_at": 1704067210
}
```

---

## 三、Service 层实现

### 3.1 查询逻辑（字段级回退）

```typescript
// src/services/content/categories.ts

const DEFAULT_LOCALE = 'en';

async function getCategoryBySlug(slug: string, locale: string = 'en') {
  // 1. 查询主表
  const category = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .get();

  if (!category) return null;

  // 2. 英语直接返回主表数据（性能优化）
  if (locale === DEFAULT_LOCALE) {
    return {
      uuid: category.uuid,
      name: category.name,
      slug: category.slug,
      iconUrl: category.iconUrl,
      metadataTitle: category.metadataTitle,
      metadataDescription: category.metadataDescription,
      content: category.content,
      _locale: locale,
      _fallback: false,
    };
  }

  // 3. 其他语言查询翻译表
  const translation = await db
    .select()
    .from(categoryTranslations)
    .where(
      and(
        eq(categoryTranslations.categoryUuid, category.uuid),
        eq(categoryTranslations.locale, locale)
      )
    )
    .get();

  // 4. 字段级回退
  const fallbackFields = !translation ? ['metadataTitle', 'metadataDescription', 'content'] : [
    !translation.metadataTitle && 'metadataTitle',
    !translation.metadataDescription && 'metadataDescription',
    !translation.content && 'content',
  ].filter(Boolean);

  return {
    uuid: category.uuid,
    name: category.name,
    slug: category.slug,
    iconUrl: category.iconUrl,
    metadataTitle: translation?.metadataTitle || category.metadataTitle,
    metadataDescription: translation?.metadataDescription || category.metadataDescription,
    content: translation?.content || category.content,
    _locale: locale,
    _fallback: !translation,
    _fallbackFields: fallbackFields,
    _translation: {
      available: !!translation,
      partial: !!translation && fallbackFields.length > 0,
      completeness: translation
        ? 1 - (fallbackFields.length / 3)
        : 0,
    },
  };
}

// 封装通用查询逻辑
async function getCategoryWithTranslation(
  category: Category,
  locale: string
): Promise<CategoryWithTranslation> {
  if (locale === DEFAULT_LOCALE) {
    return {
      ...category,
      metadataTitle: category.metadataTitle,
      metadataDescription: category.metadataDescription,
      content: category.content,
      _fallback: false,
    };
  }

  const translation = await getTranslation('category', category.uuid, locale);

  return {
    ...category,
    metadataTitle: translation?.metadataTitle || category.metadataTitle,
    metadataDescription: translation?.metadataDescription || category.metadataDescription,
    content: translation?.content || category.content,
    _fallback: !translation,
    _fallbackFields: calculateFallbackFields(translation, category),
  };
}
```

### 3.2 创建/更新操作

```typescript
async function updateCategory(uuid: string, data: UpdateCategoryData) {
  // 1. 更新主表（英文 + 基础信息）
  await db.update(categories)
    .set({
      name: data.name,
      slug: data.slug,
      iconUrl: data.iconUrl,
      metadataTitle: data.translations.en.metadataTitle,
      metadataDescription: data.translations.en.metadataDescription,
      content: data.translations.en.content,
      updatedAt: sql`(unixepoch())`,
    })
    .where(eq(categories.uuid, uuid));

  // 2. 更新翻译表（其他语言）
  for (const [locale, translation] of Object.entries(data.translations)) {
    if (locale === 'en') continue;  // 跳过英语

    if (!translation.metadataTitle && !translation.metadataDescription && !translation.content) {
      // 如果所有字段都为空，删除翻译记录（使用英文回退）
      await db.delete(categoryTranslations)
        .where(
          and(
            eq(categoryTranslations.categoryUuid, uuid),
            eq(categoryTranslations.locale, locale)
          )
        );
      continue;
    }

    await db.insert(categoryTranslations)
      .values({
        categoryUuid: uuid,
        locale,
        metadataTitle: translation.metadataTitle,
        metadataDescription: translation.metadataDescription,
        content: translation.content,
      })
      .onConflictDoUpdate({
        target: [categoryTranslations.categoryUuid, categoryTranslations.locale],
        set: {
          metadataTitle: translation.metadataTitle,
          metadataDescription: translation.metadataDescription,
          content: translation.content,
          updatedAt: sql`(unixepoch())`,
        },
      });
  }
}
```

### 3.3 列表查询（批量）

```typescript
async function listCategories(locale: string = 'en', options: ListOptions = {}) {
  const { page = 1, limit = 20 } = options;

  if (locale === DEFAULT_LOCALE) {
    // 英语直接查主表
    return await db
      .select()
      .from(categories)
      .where(isNull(categories.deletedAt))
      .limit(limit)
      .offset((page - 1) * limit);
  }

  // 其他语言 JOIN 翻译表
  const results = await db
    .select({
      category: categories,
      translation: categoryTranslations,
    })
    .from(categories)
    .leftJoin(
      categoryTranslations,
      and(
        eq(categoryTranslations.categoryUuid, categories.uuid),
        eq(categoryTranslations.locale, locale)
      )
    )
    .where(isNull(categories.deletedAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return results.map(r => ({
    ...r.category,
    metadataTitle: r.translation?.metadataTitle || r.category.metadataTitle,
    metadataDescription: r.translation?.metadataDescription || r.category.metadataDescription,
    content: r.translation?.content || r.category.content,
    _fallback: !r.translation,
  }));
}
```

---

## 四、API 设计

### 4.1 管理后台 API（包含所有翻译）

**GET `/api/admin/categories/:uuid`**

```typescript
// Response
{
  "success": true,
  "data": {
    "uuid": "cat-001",
    "name": "Action",
    "slug": "action",
    "iconUrl": "https://example.com/icons/action.svg",
    "translations": {
      "en": {
        "metadataTitle": "Action Games - Play Free Online",
        "metadataDescription": "Discover the best action games...",
        "content": "# Action Games\n\nAction games are..."
      },
      "zh": {
        "metadataTitle": "动作游戏 - 免费在线玩",
        "metadataDescription": "探索最佳在线动作游戏...",
        "content": "# 动作游戏\n\n动作游戏是..."
      },
      "ja": {
        "metadataTitle": "アクションゲーム - 無料でオンラインプレイ",
        "metadataDescription": "最高のオンラインアクションゲームを発見...",
        "content": "# アクションゲーム\n\nアクションゲームは..."
      }
    },
    "createdAt": 1704067200,
    "updatedAt": 1704067200
  }
}
```

**PUT `/api/admin/categories/:uuid`**

```typescript
// Request Body
{
  "name": "Action",
  "slug": "action",
  "iconUrl": "https://...",
  "translations": {
    "en": {
      "metadataTitle": "...",
      "metadataDescription": "...",
      "content": "..."
    },
    "zh": {
      "metadataTitle": "...",
      "metadataDescription": "...",
      "content": "..."
    }
  }
}
```

### 4.2 前端 API（只返回当前语言）

**GET `/api/categories/:slug?locale=zh`**

```typescript
// Response
{
  "success": true,
  "data": {
    "uuid": "cat-001",
    "name": "Action",
    "slug": "action",
    "iconUrl": "https://...",
    "metadataTitle": "动作游戏 - 免费在线玩",
    "metadataDescription": "探索最佳在线动作游戏...",
    "content": "# 动作游戏\n\n动作游戏是...",

    // 元信息（用于回退提示和分析）
    "_locale": "zh",
    "_translation": {
      "available": true,
      "partial": false,
      "fallbackFields": [],
      "completeness": 1.0
    }
  }
}
```

### 4.3 API 实现示例

```typescript
// src/app/api/admin/categories/[uuid]/route.ts

export async function GET(
  request: Request,
  { params }: { params: { uuid: string } }
) {
  await requireAdmin();

  const category = await db.query.categories.findFirst({
    where: eq(categories.uuid, params.uuid),
    with: {
      translations: true,  // 获取所有翻译
    },
  });

  if (!category) {
    return APIErrors.notFound('Category not found');
  }

  // 转换为管理后台格式
  const response = {
    uuid: category.uuid,
    name: category.name,
    slug: category.slug,
    iconUrl: category.iconUrl,
    translations: {
      en: {
        metadataTitle: category.metadataTitle,
        metadataDescription: category.metadataDescription,
        content: category.content,
      },
      ...category.translations.reduce((acc, t) => ({
        ...acc,
        [t.locale]: {
          metadataTitle: t.metadataTitle,
          metadataDescription: t.metadataDescription,
          content: t.content,
        },
      }), {}),
    },
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };

  return NextResponse.json({ success: true, data: response });
}
```

---

## 五、CMS 多语言管理 UI

### 5.0 UI 设计总览

**说明**: 语言的增删改在独立的「多语言管理页面」中进行，编辑对话框仅负责内容翻译。

#### 5.0.1 编辑对话框 - 英语标签页（默认语言）

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Edit Category: Action                                                  ✕ │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ [✓ English]  [! 中文]  [- 日本語]  [- Español]                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│    ↑ Active     ↑ Partial  ↑ Fallback   ↑ Fallback                       │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Basic Information (Shared across all languages)                      │ │
│  ├──────────────────────────────────────────────────────────────────────┤ │
│  │                                                                       │ │
│  │  Name *                                                               │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ Action                                                           │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                       │ │
│  │  Slug * (auto-generated from name)                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ action                                                           │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                       │ │
│  │  Icon URL                                                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ https://example.com/icons/action.svg                            │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ SEO & Content for English                                            │ │
│  ├──────────────────────────────────────────────────────────────────────┤ │
│  │                                                                       │ │
│  │  SEO Title * (Required for all languages)                            │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ Action Games - Play Free Online                                 │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │  33/60 characters                                                     │ │
│  │                                                                       │ │
│  │  SEO Description * (Required for all languages)                      │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ Discover the best action games online. Play free action-packed  │ │ │
│  │  │ adventures with stunning graphics and exciting gameplay.        │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │  127/160 characters                                                   │ │
│  │                                                                       │ │
│  │  Content (Markdown)                                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ # Action Games                                                   │ │ │
│  │  │                                                                   │ │ │
│  │  │ Action games are thrilling adventures that test your reflexes   │ │ │
│  │  │ and strategic thinking. Our collection features...              │ │ │
│  │  │                                                                   │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌ [Cancel] ─────────────────────────────────── [Save All Languages] ─┐ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

#### 5.0.2 编辑对话框 - 中文标签页（已部分翻译）

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Edit Category: Action                                                  ✕ │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ [✓ English]  [! 中文]  [- 日本語]  [- Español]                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                   ↑ Active (Partial)                                       │
│                                                                            │
│  ⚠️  Notice: Basic info (name, slug, icon) is shared across all languages │
│              and can only be edited in the English tab.                   │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ SEO & Content for 中文                                               │ │
│  ├──────────────────────────────────────────────────────────────────────┤ │
│  │                                                                       │ │
│  │  SEO Title *                                                          │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ 动作游戏 - 免费在线玩                                           │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │  12/60 characters                                                     │ │
│  │                                                                       │ │
│  │  SEO Description *                                                    │ │
│  │  (Using English: "Discover the best action games online...")         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ ⚠️  [Empty - Will fallback to English]                           │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │  0/160 characters                                                     │ │
│  │  ⚠️  This field is empty. English version will be shown on frontend. │ │
│  │                                                                       │ │
│  │  Content (Markdown)                                                   │ │
│  │  (Using English: "# Action Games\n\nAction games are...")            │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ ⚠️  [Empty - Will fallback to English]                           │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                       │ │
│  ├──────────────────────────────────────────────────────────────────────┤ │
│  │ Quick Actions                                                         │ │
│  │                                                                       │ │
│  │  [📋 Copy from English]  [🗑️ Clear & Use Fallback]  [🤖 AI Translate] │ │
│  │                                                                       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  Translation Status: ⚠️  1/3 fields completed (33%)                        │
│                                                                            │
│  ┌ [Cancel] ─────────────────────────────────── [Save All Languages] ─┐ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

#### 5.0.3 编辑对话框 - 日本語标签页（完全未翻译，回退到英文）

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Edit Category: Action                                                  ✕ │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ [✓ English]  [! 中文]  [- 日本語]  [- Español]                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                             ↑ Active (Fallback Mode)                      │
│                                                                            │
│  ℹ️  This language has no translation. All content will use English.      │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ SEO & Content for 日本語                                             │ │
│  ├──────────────────────────────────────────────────────────────────────┤ │
│  │                                                                       │ │
│  │  SEO Title *                                                          │ │
│  │  (Fallback: "Action Games - Play Free Online")                       │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ [Empty - Enter Japanese translation or leave for English]       │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │  0/60 characters                                                      │ │
│  │                                                                       │ │
│  │  SEO Description *                                                    │ │
│  │  (Fallback: "Discover the best action games online...")              │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ [Empty - Enter Japanese translation or leave for English]       │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │  0/160 characters                                                     │ │
│  │                                                                       │ │
│  │  Content (Markdown)                                                   │ │
│  │  (Fallback: "# Action Games\n\nAction games are...")                 │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ [Empty - Enter Japanese translation or leave for English]       │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                       │ │
│  ├──────────────────────────────────────────────────────────────────────┤ │
│  │ Quick Actions                                                         │ │
│  │                                                                       │ │
│  │  [📋 Copy from English]  [🤖 AI Translate from English]               │ │
│  │                                                                       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  Translation Status: - 0/3 fields completed (0%) - Using English fallback │
│                                                                            │
│  ┌ [Cancel] ─────────────────────────────────── [Save All Languages] ─┐ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

#### 5.0.4 分类列表页面（管理后台）

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Categories                                                                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────┐  [🔍 Search...]    [+ Add Category]    │
│  │ Filters                      │                                         │
│  │ ☐ Show deleted               │                                         │
│  │ ☐ Only untranslated          │                                         │
│  └──────────────────────────────┘                                         │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ ☐ │ Icon │ Name      │ Slug      │ Translations     │ Updated    │ ⋮ │ │
│  ├──────────────────────────────────────────────────────────────────────┤ │
│  │ ☐ │ 🎮  │ Action    │ action    │ ✓ EN  ! ZH  - JA │ 2h ago     │ ⋮ │ │
│  │   │      │           │           │ ✓ ES             │            │   │ │
│  ├──────────────────────────────────────────────────────────────────────┤ │
│  │ ☐ │ 🧩  │ Puzzle    │ puzzle    │ ✓ EN  ✓ ZH  ✓ JA │ 5h ago     │ ⋮ │ │
│  │   │      │           │           │ - ES             │            │   │ │
│  ├──────────────────────────────────────────────────────────────────────┤ │
│  │ ☐ │ 🏃  │ Sports    │ sports    │ ✓ EN  - ZH  - JA │ 1d ago     │ ⋮ │ │
│  │   │      │           │           │ - ES             │            │   │ │
│  ├──────────────────────────────────────────────────────────────────────┤ │
│  │ ☐ │ 🧠  │ Strategy  │ strategy  │ ✓ EN  ✓ ZH  ! JA │ 2d ago     │ ⋮ │ │
│  │   │      │           │           │ ✓ ES             │            │   │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  Translation Legend:                                                      │
│  ✓ Complete   ! Partial   - Not translated (using English)               │
│                                                                            │
│  [ 2 selected ]  [🗑️ Delete]  [🌐 Batch Translate]  [📤 Export]           │
│                                                                            │
│  Showing 1-4 of 25                                   [← 1 2 3 4 5 →]      │
└────────────────────────────────────────────────────────────────────────────┘
```

#### 5.0.5 翻译状态标识详解

```
┌─────────────────────────────────────────────────────────────────────┐
│  Language Tab Status Indicators                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ✓  Complete (绿色)                                                 │
│     所有必填字段已填写，翻译完整                                     │
│     - metadataTitle: ✓                                              │
│     - metadataDescription: ✓                                        │
│     - content: ✓ (optional, 不影响状态)                             │
│                                                                     │
│  !  Partial (黄色)                                                  │
│     部分必填字段已填写，其余字段将回退到英文                         │
│     - metadataTitle: ✓                                              │
│     - metadataDescription: ✗ (will use English)                    │
│     - content: ✗ (will use English)                                │
│                                                                     │
│  -  Fallback (灰色)                                                 │
│     该语言无任何翻译，完全使用英文内容                               │
│     - metadataTitle: ✗ (fallback to English)                       │
│     - metadataDescription: ✗ (fallback to English)                 │
│     - content: ✗ (fallback to English)                             │
│                                                                     │
│  ✕  Empty/Error (红色)                                             │
│     英语（默认语言）必填字段未填写，这是错误状态                     │
│     - 仅在英语标签页可能出现                                        │
│     - 其他语言不会显示此状态（会显示为 Fallback）                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 5.0.6 字段回退提示样式

```
┌─────────────────────────────────────────────────────────────────────┐
│  Field States in Non-English Tabs                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1️⃣  已填写字段（正常状态）                                         │
│     ┌───────────────────────────────────────────────────────────┐  │
│     │ SEO Title *                                               │  │
│     │ ┌───────────────────────────────────────────────────────┐ │  │
│     │ │ 动作游戏 - 免费在线玩                    [white bg]   │ │  │
│     │ └───────────────────────────────────────────────────────┘ │  │
│     │ 12/60 characters                                          │  │
│     └───────────────────────────────────────────────────────────┘  │
│                                                                     │
│  2️⃣  未填写字段（回退提示）                                         │
│     ┌───────────────────────────────────────────────────────────┐  │
│     │ SEO Description *                                         │  │
│     │ (Using English: "Discover the best action games...")     │  │
│     │ ┌───────────────────────────────────────────────────────┐ │  │
│     │ │ [Empty - Enter translation or...]    [yellow bg]     │ │  │
│     │ └───────────────────────────────────────────────────────┘ │  │
│     │ 0/160 characters                                          │  │
│     │ ⚠️  This field is empty. English version will be shown.  │  │
│     └───────────────────────────────────────────────────────────┘  │
│                                                                     │
│  3️⃣  可选字段（未填写，无警告）                                     │
│     ┌───────────────────────────────────────────────────────────┐  │
│     │ Content (Markdown)                                        │  │
│     │ (Optional: Using English if left empty)                  │  │
│     │ ┌───────────────────────────────────────────────────────┐ │  │
│     │ │ [Empty - Enter markdown content...]   [normal bg]    │ │  │
│     │ └───────────────────────────────────────────────────────┘ │  │
│     └───────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.1 多语言管理页面（独立页面）

**路径**: `/admin/languages`
**说明**: 集中管理已启用的语言、查看审计数据、触发自动化翻译

#### 5.1.1 页面整体布局

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Admin / 多语言管理                                                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  已启用语言 (3)                                          [+ 新增语言]    │
│                                                                          │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐   │
│  │ English          │  │ 简体中文          │  │ 日本語            │   │
│  │ 英语             │  │ 简体中文          │  │ 日语              │   │
│  │                  │  │                   │  │                   │   │
│  │ (默认语言)       │  │ ⋮ 更多            │  │ ⋮ 更多            │   │
│  │                  │  │                   │  │                   │   │
│  │ 🎮 游戏翻译      │  │ 🎮 游戏翻译       │  │ 🎮 游戏翻译       │   │
│  │ 200/200  100%    │  │ 150/200   75%     │  │ 0/200     0%      │   │
│  │ ████████████     │  │ █████████░░░      │  │ ░░░░░░░░░░░░      │   │
│  │                  │  │                   │  │                   │   │
│  │ 📁 分类翻译      │  │ 📁 分类翻译       │  │ 📁 分类翻译       │   │
│  │ 10/10    100%    │  │ 8/10      80%     │  │ 0/10      0%      │   │
│  │ ████████████     │  │ ██████████░░      │  │ ░░░░░░░░░░░░      │   │
│  │                  │  │                   │  │                   │   │
│  │ 🏷️ 标签翻译      │  │ 🏷️ 标签翻译       │  │ 🏷️ 标签翻译       │   │
│  │ 50/50    100%    │  │ 45/50     90%     │  │ 0/50      0%      │   │
│  │ ████████████     │  │ ███████████░      │  │ ░░░░░░░░░░░░      │   │
│  │                  │  │                   │  │                   │   │
│  │ ⭐ 特性翻译     │  │ ⭐ 特性翻译      │  │ ⭐ 特性翻译      │   │
│  │ 5/5      100%    │  │ 5/5       100%    │  │ 0/5       0%      │   │
│  │ ████████████     │  │ ████████████      │  │ ░░░░░░░░░░░░      │   │
│  │                  │  │                   │  │                   │   │
│  │ 整体完成度: 100% │  │ 整体完成度: 79%   │  │ 整体完成度: 0%    │   │
│  │                  │  │                   │  │                   │   │
│  │ 更新: 2h ago     │  │ 更新: 5h ago      │  │ 更新: Never       │   │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘   │
│                                                                          │
│  说明：                                                                  │
│  - 审计数据每次打开页面时自动刷新（客户端加载态）                       │
│  - 点击卡片进入详细审计报告（列出具体哪些条目未翻译）                   │
│  - 默认语言卡片只有「编辑」功能                                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 5.1.2 语言卡片 - 更多菜单（非默认语言）

```
┌───────────────────┐
│ 简体中文         │
│ 简体中文         │
│                  │
│ ⋮ 更多  ◄────── 点击展开
│                  │
│ 🎮 游戏翻译      │
│ 150/200   75%    │
└───────────────────┘
      │
      ▼
┌─────────────────────┐
│ 编辑               │
│ 删除               │
│ 刷新审计           │
│ 自动化翻译         │
└─────────────────────┘
```

#### 5.1.3 语言卡片 - 更多菜单（默认语言）

```
┌───────────────────┐
│ English          │
│ 英语             │
│ (默认语言)       │
│ ⋮ 更多  ◄────── 点击展开
│                  │
│ 🎮 游戏翻译      │
│ 200/200  100%    │
└───────────────────┘
      │
      ▼
┌─────────────────────┐
│ 编辑               │
└─────────────────────┘
```

#### 5.1.4 新增语言 - 表单弹窗

```
┌────────────────────────────────────────────────────────────┐
│  新增语言                                               ✕ │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  语言代码 *                                                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ zh                                                   │ │
│  └──────────────────────────────────────────────────────┘ │
│  示例: en, zh, ja, es, ko, pl, zh-Hant                     │
│                                                            │
│  当地语言名称 *                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 简体中文                                             │ │
│  └──────────────────────────────────────────────────────┘ │
│  用该语言书写的名称                                        │
│                                                            │
│  简体中文名称 *                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 简体中文                                             │ │
│  └──────────────────────────────────────────────────────┘ │
│  用简体中文描述该语言                                      │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ℹ️  注意：新增语言后，您可以通过「自动化翻译」功能   │ │
│  │    批量翻译所有内容，或在各个编辑页面手动添加翻译。   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌ [取消] ──────────────────────────── [确认新增] ──────┐ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

#### 5.1.5 编辑语言 - 表单弹窗

```
┌────────────────────────────────────────────────────────────┐
│  编辑语言: 简体中文                                     ✕ │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  语言代码 *                                                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ zh                                     [只读，不可修改] │ │
│  └──────────────────────────────────────────────────────┘ │
│  ⚠️  语言代码创建后不可修改                               │
│                                                            │
│  当地语言名称 *                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 简体中文                                             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  简体中文名称 *                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 简体中文                                             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌ [取消] ────────────────────────────── [保存修改] ────┐ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

#### 5.1.6 自动化翻译 - 选项弹窗

```
┌────────────────────────────────────────────────────────────┐
│  自动化翻译: 简体中文                                   ✕ │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  请选择翻译模式：                                          │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ⭘ 全部翻译                                          │ │
│  │                                                      │ │
│  │   不管是否已有翻译，一律重新全部翻译所有内容         │ │
│  │   适用于：语言切换、重大内容更新、翻译质量不佳       │ │
│  │                                                      │ │
│  │   预计翻译：                                         │
│  │   - 游戏: 200 条                                     │ │
│  │   - 分类: 10 条                                      │ │
│  │   - 标签: 50 条                                      │ │
│  │   - 特性: 5 条                                       │ │
│  │   总计: 265 条                                       │ │
│  │   预计耗时: ~13 分钟 (按 2条/分钟 计算)             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ● 补充翻译 (推荐)                                    │ │
│  │                                                      │ │
│  │   仅针对空白字段进行补充翻译                         │ │
│  │   适用于：新增内容、部分翻译缺失                     │ │
│  │                                                      │ │
│  │   预计翻译：                                         │ │
│  │   - 游戏: 50 条 (已有 150 条)                        │ │
│  │   - 分类: 2 条 (已有 8 条)                           │ │
│  │   - 标签: 5 条 (已有 45 条)                          │ │
│  │   - 特性: 0 条 (已有 5 条)                           │ │
│  │   总计: 57 条                                        │ │
│  │   预计耗时: ~3 分钟                                  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ⚠️  注意事项：                                        │ │
│  │  - 翻译任务将在后台执行，您可以关闭此页面            │ │
│  │  - 任务执行期间可以继续其他操作                      │ │
│  │  - 任务完成后会在通知中心提醒                        │ │
│  │  - 可以在「任务中心」查看详细进度                    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌ [取消] ──────────────────────────── [开始翻译] ──────┐ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

#### 5.1.7 翻译任务进度 - Toast 通知

```
┌────────────────────────────────────────────────────────────┐
│  🤖 翻译任务已启动                                      ✕ │
├────────────────────────────────────────────────────────────┤
│  正在翻译「简体中文」，补充模式                            │
│                                                            │
│  进度: 15/57 (26%)                                         │
│  ████░░░░░░░░░░░░░░░░░░░░                                  │
│                                                            │
│  当前: 正在翻译游戏 #15                                    │
│  预计剩余时间: 2 分钟                                      │
│                                                            │
│  [查看详情]  [在后台运行]                                  │
└────────────────────────────────────────────────────────────┘
```

#### 5.1.8 翻译任务详情页面

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Admin / 多语言管理 / 翻译任务 #task-001                [返回]          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  任务信息                                                                │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 语言: 简体中文 (zh)              模式: 补充翻译                    │ │
│  │ 状态: ⏳ 进行中                  创建: 2025-01-15 14:30            │ │
│  │ 开始: 14:30                      预计完成: 14:33                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  整体进度                                                                │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 15/57 (26%)                                                        │ │
│  │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  分类进度                                                                │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 🎮 游戏翻译                15/50 (30%)   ████████░░░░░░░░          │ │
│  │ 📁 分类翻译                0/2   (0%)    ░░░░░░░░░░░░              │ │
│  │ 🏷️ 标签翻译                0/5   (0%)    ░░░░░░░░░░░░              │ │
│  │ ⭐ 特性翻译                0/0   (100%)  ████████████              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  实时日志 (最近 20 条)                                                   │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 14:31:23  ✅ 游戏 #15 翻译成功 (Super Mario → 超级马里奥)          │ │
│  │ 14:31:20  ✅ 游戏 #14 翻译成功 (Tetris → 俄罗斯方块)              │ │
│  │ 14:31:17  ✅ 游戏 #13 翻译成功 (Pac-Man → 吃豆人)                 │ │
│  │ 14:31:14  ❌ 游戏 #12 翻译失败 (API rate limit)                   │ │
│  │ 14:31:11  ✅ 游戏 #11 翻译成功                                    │ │
│  │ ...                                                                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌ [暂停任务] ────────────────────────── [取消任务] ─────────────────┐ │
│  └────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 语言状态指示器

```typescript
type LanguageStatus = 'complete' | 'partial' | 'empty' | 'fallback';

const getLanguageStatus = (locale: string, translations: TranslationData): LanguageStatus => {
  if (locale === DEFAULT_LOCALE) {
    // 英语检查主表字段
    return 'complete';
  }

  const translation = translations[locale];
  if (!translation) return 'fallback';

  const requiredFields = ['metadataTitle', 'metadataDescription'];
  const filledCount = requiredFields.filter(f => translation[f]?.trim()).length;

  if (filledCount === requiredFields.length) return 'complete';   // ✓
  if (filledCount > 0) return 'partial';                          // !
  return 'fallback';                                               // -
};

const STATUS_CONFIG = {
  complete: { icon: '✓', color: 'text-green-600', label: 'Complete' },
  partial: { icon: '!', color: 'text-yellow-600', label: 'Partial' },
  empty: { icon: '✕', color: 'text-red-600', label: 'Empty' },
  fallback: { icon: '-', color: 'text-gray-400', label: 'Using English' },
};
```

### 5.2 Tabs 组件实现

```tsx
// src/components/admin/taxonomy-management.tsx

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LANGUAGES } from '@/i18n/language';

export function TaxonomyManagementDialog({ editingItem, type }) {
  const [currentLanguage, setCurrentLanguage] = useState(DEFAULT_LOCALE);
  const [i18nData, setI18nData] = useState<Record<string, TranslationFields>>({});

  // 基础字段（仅英语显示）
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [iconUrl, setIconUrl] = useState('');

  return (
    <Dialog>
      <DialogContent className="max-h-[90vh] !max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? `Edit ${type}` : `Create ${type}`}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={currentLanguage} onValueChange={setCurrentLanguage}>
          <TabsList className="grid w-full grid-cols-auto">
            {LANGUAGES.map(lang => {
              const status = getLanguageStatus(lang.lang, i18nData);
              const config = STATUS_CONFIG[status];

              return (
                <TabsTrigger key={lang.lang} value={lang.lang}>
                  <span className={config.color}>{config.icon}</span>
                  <span className="ml-2">{lang.language}</span>
                </TabsTrigger>
              );
            })}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {AVAILABLE_LANGUAGES
                  .filter(lang => !activeLanguages.includes(lang.code))
                  .map(lang => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => addLanguage(lang.code)}
                    >
                      {lang.language}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </TabsList>

          {LANGUAGES.map(lang => (
            <TabsContent key={lang.lang} value={lang.lang} className="space-y-4">
              {/* 基础信息（仅默认语言显示） */}
              {lang.lang === DEFAULT_LOCALE && (
                <div className="space-y-4 rounded-lg border p-4">
                  <h3 className="font-medium">Basic Information</h3>

                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!editingItem) {
                          setSlug(generateSlug(e.target.value));
                        }
                      }}
                      required
                      maxLength={50}
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      pattern="[a-z0-9-]+"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="iconUrl">Icon URL</Label>
                    <Input
                      id="iconUrl"
                      value={iconUrl}
                      onChange={(e) => setIconUrl(e.target.value)}
                      type="url"
                    />
                  </div>
                </div>
              )}

              {/* 多语言内容 */}
              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="font-medium">
                  SEO & Content for {lang.language}
                </h3>

                <div>
                  <Label htmlFor={`title-${lang.lang}`}>
                    SEO Title *
                    {lang.lang !== DEFAULT_LOCALE &&
                     !i18nData[lang.lang]?.metadataTitle && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Using English: "{i18nData.en?.metadataTitle}")
                      </span>
                    )}
                  </Label>
                  <Input
                    id={`title-${lang.lang}`}
                    value={i18nData[lang.lang]?.metadataTitle || ''}
                    onChange={(e) => updateTranslation(lang.lang, 'metadataTitle', e.target.value)}
                    maxLength={60}
                    placeholder={
                      lang.lang === DEFAULT_LOCALE
                        ? "Enter SEO title"
                        : "Leave empty to use English"
                    }
                    className={
                      lang.lang !== DEFAULT_LOCALE &&
                      !i18nData[lang.lang]?.metadataTitle
                        ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20'
                        : ''
                    }
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {i18nData[lang.lang]?.metadataTitle?.length || 0}/60 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor={`desc-${lang.lang}`}>SEO Description *</Label>
                  <Textarea
                    id={`desc-${lang.lang}`}
                    value={i18nData[lang.lang]?.metadataDescription || ''}
                    onChange={(e) => updateTranslation(lang.lang, 'metadataDescription', e.target.value)}
                    maxLength={160}
                    rows={3}
                    placeholder={
                      lang.lang === DEFAULT_LOCALE
                        ? "Enter SEO description"
                        : "Leave empty to use English"
                    }
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {i18nData[lang.lang]?.metadataDescription?.length || 0}/160 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor={`content-${lang.lang}`}>
                    Content (Markdown)
                  </Label>
                  <Textarea
                    id={`content-${lang.lang}`}
                    value={i18nData[lang.lang]?.content || ''}
                    onChange={(e) => updateTranslation(lang.lang, 'content', e.target.value)}
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>

                {/* 快捷操作（非英语） */}
                {lang.lang !== DEFAULT_LOCALE && (
                  <div className="flex gap-2 border-t pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyFromLanguage(DEFAULT_LOCALE, lang.lang)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy from English
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => clearLanguage(lang.lang)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Clear & Use Fallback
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save All Languages'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 5.3 表单数据处理

```typescript
// 提交处理
const handleSubmit = async () => {
  setIsSubmitting(true);
  setError('');

  try {
    const payload = {
      name,
      slug,
      iconUrl,
      translations: {
        en: {
          metadataTitle: i18nData.en?.metadataTitle || '',
          metadataDescription: i18nData.en?.metadataDescription || '',
          content: i18nData.en?.content || '',
        },
        // 其他语言（过滤空数据）
        ...Object.entries(i18nData)
          .filter(([locale]) => locale !== 'en')
          .reduce((acc, [locale, data]) => {
            if (data.metadataTitle || data.metadataDescription || data.content) {
              acc[locale] = data;
            }
            return acc;
          }, {}),
      },
    };

    const url = editingItem
      ? `/api/admin/categories/${editingItem.uuid}`
      : '/api/admin/categories';

    const response = await fetch(url, {
      method: editingItem ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error('Failed to save');

    toast.success(`${type} saved successfully`);
    onClose();
    mutate(); // SWR revalidate
  } catch (err) {
    setError(err.message);
  } finally {
    setIsSubmitting(false);
  }
};

// 复制语言
const copyFromLanguage = (fromLocale: string, toLocale: string) => {
  setI18nData(prev => ({
    ...prev,
    [toLocale]: { ...prev[fromLocale] },
  }));
  toast.success(`Copied from ${LANGUAGES.find(l => l.lang === fromLocale)?.language}`);
};

// 清除语言
const clearLanguage = (locale: string) => {
  setI18nData(prev => ({
    ...prev,
    [locale]: { metadataTitle: '', metadataDescription: '', content: '' },
  }));
};

// 更新翻译字段
const updateTranslation = (locale: string, field: string, value: string) => {
  setI18nData(prev => ({
    ...prev,
    [locale]: {
      ...prev[locale],
      [field]: value,
    },
  }));
};
```

---

## 六、自动化翻译系统

### 6.1 翻译任务队列设计

#### 6.1.1 队列消息格式

```typescript
// src/types/services/queue.ts

export interface TranslationQueueMessage {
  type: 'TRANSLATION_TASK';
  data: {
    taskUuid: string;           // 任务 UUID
    languageCode: string;        // 目标语言代码
    translationType: 'full' | 'supplement';  // 翻译类型
    categories: {
      games: boolean;            // 是否翻译游戏
      categories: boolean;       // 是否翻译分类
      tags: boolean;             // 是否翻译标签
      featured: boolean;         // 是否翻译特性
    };
  };
}
```

#### 6.1.2 任务创建流程

```typescript
// src/app/api/admin/languages/[code]/translate/route.ts

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  await requireAdmin();

  const body = await request.json();
  const { type } = body;  // 'full' | 'supplement'

  // 1. 创建任务记录
  const taskUuid = generateUUID();
  await db.insert(translationTasks).values({
    uuid: taskUuid,
    languageCode: params.code,
    type,
    status: 'pending',
    progress: {
      games: { done: 0, total: 0 },
      categories: { done: 0, total: 0 },
      tags: { done: 0, total: 0 },
      featured: { done: 0, total: 0 },
    },
  });

  // 2. 发送队列消息
  const message: TranslationQueueMessage = {
    type: 'TRANSLATION_TASK',
    data: {
      taskUuid,
      languageCode: params.code,
      translationType: type,
      categories: {
        games: true,
        categories: true,
        tags: true,
        featured: true,
      },
    },
  };

  await env.TRANSLATION_QUEUE.send(message);

  return NextResponse.json({
    success: true,
    data: { taskUuid },
  });
}
```

#### 6.1.3 队列消费逻辑

**架构说明**:

- **服务封装**: 翻译任务处理逻辑封装在 `src/services/translation/processor.ts`
- **环境区分**:
  - 本地开发：直接调用 `processTranslationTask()` 函数
  - 线上环境：通过 Cloudflare Queues 异步处理

**线上队列消费** (worker/index.ts):

```typescript
// worker/index.ts

import { processTranslationTask } from '@/services/translation/processor';

export default {
  fetch: handler.fetch,

  async queue(batch: QueueEvent<QueueMessage>, env: CloudflareEnv, ctx: CloudflareContext) {
    console.log('消费队列');
    setCachedEnv(env);

    const { messages } = batch;
    for (const message of messages) {
      console.log('消费队列消息：', JSON.stringify(message.body, null, 2));

      // 处理翻译任务
      if (message.body.type === 'TRANSLATION_TASK') {
        const { taskUuid, languageCode, translationType, categories } = message.body.data;

        try {
          await processTranslationTask({
            taskUuid,
            languageCode,
            translationType,
            categories,
            env,
          });
          console.log(`翻译任务 ${taskUuid} 完成`);
        } catch (error) {
          console.error(`翻译任务 ${taskUuid} 失败:`, error);
          // 更新任务状态为 failed
          await db.update(translationTasks)
            .set({
              status: 'failed',
              error: error.message,
            })
            .where(eq(translationTasks.uuid, taskUuid));
        }
      }
    }
  }
} satisfies ExportedHandler<CloudflareEnv>;
```

**本地开发直接调用**:

```typescript
// src/app/api/admin/languages/[code]/translate/route.ts

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  await requireAdmin();

  const body = await request.json();
  const { type } = body;

  const taskUuid = generateUUID();
  await db.insert(translationTasks).values({
    uuid: taskUuid,
    languageCode: params.code,
    type,
    status: 'pending',
    progress: { games: { done: 0, total: 0 }, ... },
  });

  // 环境区分
  if (process.env.NODE_ENV === 'development') {
    // 本地开发：直接调用服务函数
    await processTranslationTask({
      taskUuid,
      languageCode: params.code,
      translationType: type,
      categories: { games: true, categories: true, tags: true, featured: true },
      env: getEnv(),
    });
  } else {
    // 线上环境：发送队列消息
    const message: TranslationQueueMessage = {
      type: 'TRANSLATION_TASK',
      data: { taskUuid, languageCode: params.code, translationType: type, ... },
    };
    await env.TRANSLATION_QUEUE.send(message);
  }

  return NextResponse.json({ success: true, data: { taskUuid } });
}
```

### 6.2 AI 翻译实现

#### 6.2.1 翻译处理器核心逻辑

```typescript
// src/services/translation/processor.ts

import { generateText } from 'ai';
import { openrouter } from '@openrouter/ai-sdk-provider';

interface ProcessTaskParams {
  taskUuid: string;
  languageCode: string;
  translationType: 'full' | 'supplement';
  categories: {
    games: boolean;
    categories: boolean;
    tags: boolean;
    featured: boolean;
  };
  env: CloudflareEnv;
}

export async function processTranslationTask(params: ProcessTaskParams) {
  const { taskUuid, languageCode, translationType, categories, env } = params;

  // 更新任务状态为 running
  await db.update(translationTasks)
    .set({
      status: 'running',
      startedAt: sql`(unixepoch())`,
    })
    .where(eq(translationTasks.uuid, taskUuid));

  const targetLanguage = LANGUAGES.find(l => l.lang === languageCode);
  if (!targetLanguage) throw new Error(`Language ${languageCode} not found`);

  // 处理每个分类
  if (categories.games) {
    await translateGames(taskUuid, languageCode, targetLanguage, translationType, env);
  }

  if (categories.categories) {
    await translateCategories(taskUuid, languageCode, targetLanguage, translationType, env);
  }

  if (categories.tags) {
    await translateTags(taskUuid, languageCode, targetLanguage, translationType, env);
  }

  if (categories.featured) {
    await translateFeatured(taskUuid, languageCode, targetLanguage, translationType, env);
  }

  // 更新任务状态为 completed
  await db.update(translationTasks)
    .set({
      status: 'completed',
      completedAt: sql`(unixepoch())`,
    })
    .where(eq(translationTasks.uuid, taskUuid));
}
```

#### 6.2.2 游戏名称翻译（JSON 字段）

```typescript
async function translateGames(
  taskUuid: string,
  languageCode: string,
  targetLanguage: Language,
  translationType: 'full' | 'supplement',
  env: CloudflareEnv
) {
  // 查询需要翻译的游戏（已上线）
  const games = await db
    .select()
    .from(gamesTable)
    .where(isNull(gamesTable.deletedAt))
    .all();

  const total = games.length;
  let done = 0;

  for (const game of games) {
    const nameI18n = game.nameI18n || {};

    // 判断是否需要翻译
    const needsTranslation = translationType === 'full' || !nameI18n[languageCode];

    if (!needsTranslation) {
      done++;
      continue;
    }

    try {
      // 调用 AI 翻译
      const translatedName = await translateWithAI(
        game.name,
        'game_name',
        targetLanguage,
        env
      );

      // 更新 JSON 字段
      const updatedNameI18n = {
        ...nameI18n,
        [languageCode]: translatedName,
      };

      await db.update(gamesTable)
        .set({ nameI18n: updatedNameI18n })
        .where(eq(gamesTable.uuid, game.uuid));

      done++;

      // 更新任务进度
      await updateTaskProgress(taskUuid, 'games', { done, total });

    } catch (error) {
      console.error(`翻译游戏 ${game.uuid} 失败:`, error);
      // 继续下一个
    }
  }
}
```

#### 6.2.3 分类/标签/特性翻译（翻译表）

```typescript
async function translateCategories(
  taskUuid: string,
  languageCode: string,
  targetLanguage: Language,
  translationType: 'full' | 'supplement',
  env: CloudflareEnv
) {
  const categories = await db
    .select()
    .from(categoriesTable)
    .where(isNull(categoriesTable.deletedAt))
    .all();

  const total = categories.length;
  let done = 0;

  for (const category of categories) {
    // 查询是否已有翻译
    const existing = await db
      .select()
      .from(categoryTranslations)
      .where(
        and(
          eq(categoryTranslations.categoryUuid, category.uuid),
          eq(categoryTranslations.locale, languageCode)
        )
      )
      .get();

    // 判断是否需要翻译
    const needsTranslation = translationType === 'full' || !existing;

    if (!needsTranslation) {
      done++;
      continue;
    }

    try {
      // 调用 AI 翻译
      const translated = await translateSEOContent(
        {
          metadataTitle: category.metadataTitle,
          metadataDescription: category.metadataDescription,
          content: category.content || '',
        },
        targetLanguage,
        env
      );

      // 插入或更新翻译表
      await db.insert(categoryTranslations)
        .values({
          categoryUuid: category.uuid,
          locale: languageCode,
          metadataTitle: translated.metadataTitle,
          metadataDescription: translated.metadataDescription,
          content: translated.content,
        })
        .onConflictDoUpdate({
          target: [categoryTranslations.categoryUuid, categoryTranslations.locale],
          set: {
            metadataTitle: translated.metadataTitle,
            metadataDescription: translated.metadataDescription,
            content: translated.content,
            updatedAt: sql`(unixepoch())`,
          },
        });

      done++;
      await updateTaskProgress(taskUuid, 'categories', { done, total });

    } catch (error) {
      console.error(`翻译分类 ${category.uuid} 失败:`, error);
    }
  }
}
```

#### 6.2.4 AI 翻译提示词

**说明**: 使用英文提示词可以获得更好的翻译质量和一致性。

```typescript
// src/services/translation/prompts.ts

export const TRANSLATION_PROMPTS = {
  game_name: (name: string, targetLang: Language) => `
You are a professional game localization expert. Translate the following game name to ${targetLang.language}.

Requirements:
- Keep the translation concise and natural
- Preserve brand names and proper nouns when appropriate
- Follow local gaming community conventions
- Use official translations for well-known games
- **Output ONLY the translated name, no explanations or extra content**

Game name: ${name}

Translation:`,

  seo_content: (data: { title: string; desc: string; content: string }, targetLang: Language) => `
You are a professional SEO and localization expert. Translate the following content to ${targetLang.language}.

Requirements:
- Maintain SEO optimization principles with natural keyword distribution
- Use idiomatic and natural native expressions
- Preserve all HTML tags and Markdown formatting
- Keep consistent tone and style
- Accurately convey the original meaning

Original content:
SEO Title: ${data.title}
SEO Description: ${data.desc}
Content: ${data.content}

Output the translation in JSON format:
{
  "metadataTitle": "translated SEO title",
  "metadataDescription": "translated SEO description",
  "content": "translated content"
}

**Output ONLY valid JSON, no explanations or extra content**`,
};

// AI 翻译核心函数
async function translateWithAI(
  text: string,
  type: 'game_name',
  targetLang: Language,
  env: CloudflareEnv
): Promise<string> {
  const prompt = TRANSLATION_PROMPTS[type](text, targetLang);

  const { text: result } = await generateText({
    model: openrouter('openai/gpt-4.1', {
      apiKey: env.OPENROUTER_API_KEY,
    }),
    prompt,
    temperature: 0.3,  // 降低随机性，提高一致性
    maxTokens: 200,
  });

  return result.trim();
}

async function translateSEOContent(
  data: { metadataTitle: string; metadataDescription: string; content: string },
  targetLang: Language,
  env: CloudflareEnv
): Promise<{ metadataTitle: string; metadataDescription: string; content: string }> {
  const prompt = TRANSLATION_PROMPTS.seo_content(data, targetLang);

  const { text: result } = await generateText({
    model: openrouter('openai/gpt-4.1', {
      apiKey: env.OPENROUTER_API_KEY,
    }),
    prompt,
    temperature: 0.3,
    maxTokens: 2000,
  });

  // 解析 JSON 响应
  try {
    const parsed = JSON.parse(result.trim());
    return {
      metadataTitle: parsed.metadataTitle || data.metadataTitle,
      metadataDescription: parsed.metadataDescription || data.metadataDescription,
      content: parsed.content || data.content,
    };
  } catch (error) {
    console.error('AI 翻译响应解析失败:', error);
    throw new Error('AI translation response parsing failed');
  }
}
```

#### 6.2.5 任务进度更新

```typescript
async function updateTaskProgress(
  taskUuid: string,
  category: 'games' | 'categories' | 'tags' | 'featured',
  progress: { done: number; total: number }
) {
  const task = await db
    .select()
    .from(translationTasks)
    .where(eq(translationTasks.uuid, taskUuid))
    .get();

  if (!task) return;

  const updatedProgress = {
    ...task.progress,
    [category]: progress,
  };

  await db.update(translationTasks)
    .set({ progress: updatedProgress })
    .where(eq(translationTasks.uuid, taskUuid));
}
```

### 6.3 错误处理和重试机制

```typescript
// 带重试的 AI 翻译
async function translateWithRetry(
  translateFn: () => Promise<string>,
  maxRetries: number = 3
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await translateFn();
    } catch (error) {
      console.error(`翻译尝试 ${attempt}/${maxRetries} 失败:`, error);

      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        throw error;
      }

      // 指数退避
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  throw new Error('All retry attempts failed');
}
```

---

## 七、审计数据实时计算

### 7.1 API 设计

#### 7.1.1 获取语言审计数据

```typescript
// GET /api/admin/languages/[code]/audit

export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  await requireAdmin();

  const { code } = params;
  const language = LANGUAGES.find(l => l.lang === code);
  if (!language) {
    return APIErrors.notFound('Language not found');
  }

  // 实时计算审计数据
  const audit = await calculateLanguageAudit(code);

  return NextResponse.json({
    success: true,
    data: {
      languageCode: code,
      language: language.language,
      zhLanguage: language.zhLanguage,
      audit,
      lastUpdated: Date.now(),
    },
  });
}
```

#### 7.1.2 批量获取所有语言审计数据

```typescript
// GET /api/admin/languages/audit

export async function GET(request: Request) {
  await requireAdmin();

  // 并行计算所有语言的审计数据
  const audits = await Promise.all(
    LANGUAGES.map(async (lang) => ({
      languageCode: lang.lang,
      language: lang.language,
      zhLanguage: lang.zhLanguage,
      isDefault: lang.lang === DEFAULT_LOCALE,
      audit: await calculateLanguageAudit(lang.lang),
    }))
  );

  return NextResponse.json({
    success: true,
    data: audits,
  });
}
```

### 7.2 审计计算逻辑

```typescript
// src/services/audit/language-audit.ts

export interface LanguageAudit {
  games: { translated: number; total: number; percentage: number };
  categories: { translated: number; total: number; percentage: number };
  tags: { translated: number; total: number; percentage: number };
  featured: { translated: number; total: number; percentage: number };
  overall: { translated: number; total: number; percentage: number };
}

async function calculateLanguageAudit(languageCode: string): Promise<LanguageAudit> {
  // 默认语言（英语）全部已翻译
  if (languageCode === DEFAULT_LOCALE) {
    const [gamesCount, categoriesCount, tagsCount, featuredCount] = await Promise.all([
      countGames(),
      countCategories(),
      countTags(),
      countFeatured(),
    ]);

    const total = gamesCount + categoriesCount + tagsCount + featuredCount;

    return {
      games: { translated: gamesCount, total: gamesCount, percentage: 1.0 },
      categories: { translated: categoriesCount, total: categoriesCount, percentage: 1.0 },
      tags: { translated: tagsCount, total: tagsCount, percentage: 1.0 },
      featured: { translated: featuredCount, total: featuredCount, percentage: 1.0 },
      overall: { translated: total, total, percentage: 1.0 },
    };
  }

  // 其他语言：并行计算各分类的翻译情况
  const [gamesAudit, categoriesAudit, tagsAudit, featuredAudit] = await Promise.all([
    auditGames(languageCode),
    auditCategories(languageCode),
    auditTags(languageCode),
    auditFeatured(languageCode),
  ]);

  const totalTranslated =
    gamesAudit.translated +
    categoriesAudit.translated +
    tagsAudit.translated +
    featuredAudit.translated;

  const totalItems =
    gamesAudit.total +
    categoriesAudit.total +
    tagsAudit.total +
    featuredAudit.total;

  return {
    games: gamesAudit,
    categories: categoriesAudit,
    tags: tagsAudit,
    featured: featuredAudit,
    overall: {
      translated: totalTranslated,
      total: totalItems,
      percentage: totalItems > 0 ? totalTranslated / totalItems : 0,
    },
  };
}

// 游戏翻译审计（JSON 字段）
async function auditGames(languageCode: string) {
  const games = await db
    .select({ uuid: gamesTable.uuid, nameI18n: gamesTable.nameI18n })
    .from(gamesTable)
    .where(isNull(gamesTable.deletedAt))
    .all();

  const total = games.length;
  const translated = games.filter(game => {
    const nameI18n = game.nameI18n || {};
    return !!nameI18n[languageCode];
  }).length;

  return {
    translated,
    total,
    percentage: total > 0 ? translated / total : 0,
  };
}

// 分类翻译审计（翻译表）
async function auditCategories(languageCode: string) {
  // 查询所有已上线的分类
  const allCategories = await db
    .select({ uuid: categoriesTable.uuid })
    .from(categoriesTable)
    .where(isNull(categoriesTable.deletedAt))
    .all();

  const total = allCategories.length;

  if (total === 0) {
    return { translated: 0, total: 0, percentage: 0 };
  }

  // 查询该语言已翻译的分类
  const translatedCategories = await db
    .select({ categoryUuid: categoryTranslations.categoryUuid })
    .from(categoryTranslations)
    .where(eq(categoryTranslations.locale, languageCode))
    .all();

  const translated = translatedCategories.length;

  return {
    translated,
    total,
    percentage: translated / total,
  };
}

// 同理实现 auditTags 和 auditFeatured
async function auditTags(languageCode: string) {
  const allTags = await db
    .select({ uuid: tagsTable.uuid })
    .from(tagsTable)
    .where(isNull(tagsTable.deletedAt))
    .all();

  const total = allTags.length;
  if (total === 0) return { translated: 0, total: 0, percentage: 0 };

  const translatedTags = await db
    .select({ tagUuid: tagTranslations.tagUuid })
    .from(tagTranslations)
    .where(eq(tagTranslations.locale, languageCode))
    .all();

  const translated = translatedTags.length;

  return { translated, total, percentage: translated / total };
}

async function auditFeatured(languageCode: string) {
  const allFeatured = await db
    .select({ uuid: featuredTable.uuid })
    .from(featuredTable)
    .where(isNull(featuredTable.deletedAt))
    .all();

  const total = allFeatured.length;
  if (total === 0) return { translated: 0, total: 0, percentage: 0 };

  const translatedFeatured = await db
    .select({ featuredUuid: featuredTranslations.featuredUuid })
    .from(featuredTranslations)
    .where(eq(featuredTranslations.locale, languageCode))
    .all();

  const translated = translatedFeatured.length;

  return { translated, total, percentage: translated / total };
}

// 辅助函数：统计各类总数
async function countGames() {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(gamesTable)
    .where(isNull(gamesTable.deletedAt))
    .get();
  return result?.count || 0;
}

async function countCategories() {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(categoriesTable)
    .where(isNull(categoriesTable.deletedAt))
    .get();
  return result?.count || 0;
}

async function countTags() {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(tagsTable)
    .where(isNull(tagsTable.deletedAt))
    .get();
  return result?.count || 0;
}

async function countFeatured() {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(featuredTable)
    .where(isNull(featuredTable.deletedAt))
    .get();
  return result?.count || 0;
}
```

### 7.3 性能优化

```typescript
// 使用 SWR 缓存审计数据（前端）
const { data: audits, isLoading } = useSWR(
  '/api/admin/languages/audit',
  fetcher,
  {
    revalidateOnFocus: false,
    dedupingInterval: 60000,  // 1 分钟内不重复请求
  }
);

// 手动刷新审计
const refreshAudit = async (languageCode: string) => {
  setRefreshing(true);
  await mutate(`/api/admin/languages/${languageCode}/audit`);
  setRefreshing(false);
};
```

---

## 八、回退策略

### 8.1 四层回退机制

```
用户请求内容（locale=zh）
    │
    ├─ 1️⃣ 数据库层回退
    │   └─ Service 查询时自动回退到英文字段
    │
    ├─ 2️⃣ API 层标注
    │   └─ 返回 _translation 元信息
    │
    ├─ 3️⃣ 前端展示策略
    │   ├─ SEO 页面：静默使用回退（用户无感知）
    │   └─ 交互页面：根据完整度显示提示
    │
    └─ 4️⃣ 用户配置
        └─ 允许用户选择回退行为
```

### 6.2 回退配置

```typescript
// src/config/i18n.ts

export const I18N_CONFIG = {
  fallback: {
    enabled: true,
    defaultLocale: 'en',
    mode: 'mixed',  // 'strict' | 'mixed' | 'auto'
    showNoticeThreshold: 0.5,  // 翻译完整度 < 50% 时显示提示
  },
  seo: {
    alwaysFallback: true,  // SEO 页面始终使用回退
    // hreflang 标签已在 src/app/[locale]/layout.tsx 中通过 <HrefLangs /> 组件实现
  },
  admin: {
    highlightMissing: true,     // 高亮缺失翻译
    suggestTranslation: true,   // 建议 AI 翻译
  },
};
```

### 8.3 C端页面重定向策略

**重要**: C端用户页面不显示回退内容，翻译完成度不达标时直接302重定向到默认语言。

```tsx
// src/app/[locale]/category/[slug]/page.tsx

export default async function CategoryPage({ params }: Props) {
  const { locale, slug } = await params;
  const category = await getCategoryBySlug(slug, locale);

  if (!category) {
    notFound();
  }

  // 【关键】非默认语言且翻译完成度不达标时，重定向到默认语言
  if (locale !== DEFAULT_LOCALE) {
    const completeness = category._translation?.completeness || 0;

    // 翻译完成度 < 50% 时重定向到英语版本
    if (completeness < I18N_CONFIG.fallback.showNoticeThreshold) {
      redirect(`/${DEFAULT_LOCALE}/category/${slug}`);
    }
  }

  // 正常渲染页面（翻译完成度达标或默认语言）
  return (
    <>
      <h1>{category.metadataTitle}</h1>
      <div className="prose" dangerouslySetInnerHTML={{ __html: markdownToHtml(category.content) }} />
    </>
  );
}
```

**配置说明**：

```typescript
// src/config/i18n.ts
export const I18N_CONFIG = {
  fallback: {
    enabled: true,
    defaultLocale: 'en',
    showNoticeThreshold: 0.5,  // 完成度 < 50% 时重定向
  },
};
```

**优点**：
- ✅ 避免展示不完整的翻译内容给用户
- ✅ SEO 友好（302 临时重定向，告诉搜索引擎翻译尚未完成）
- ✅ 用户体验好（直接看到完整内容，无需手动切换）
- ✅ 减少客户端逻辑复杂度

---

## 九、实施步骤

### Phase 1: 数据库迁移

**重要原则**: 只修改 `src/db/schema.ts`，不手动创建 SQL 文件。

#### 1.1 修改 Schema

```bash
# 1. 修改 src/db/schema.ts
# - 添加 games.name_i18n (JSON 字段)
# - 添加 4 个翻译表（category_translations, tag_translations, featured_translations, introduction_translations）
# - 添加翻译任务表（translation_tasks）
# - 添加关系映射

# 2. 自动生成迁移 SQL（禁止手动创建 SQL 文件）
pnpm drizzle:generate
```

**生成的文件**：
- `drizzle/000X_add_i18n_support.sql` - 自动生成
- `drizzle/meta/000X_snapshot.json` - 元数据快照

#### 1.2 数据迁移脚本
```typescript
// scripts/migrate-to-i18n.ts
import { db } from '@/db/client';
import { categories, categoryTranslations } from '@/db/schema';

async function migrateCategories() {
  const allCategories = await db.select().from(categories);

  for (const category of allCategories) {
    // 主表数据已经是英文，无需修改
    // 仅需在后续手动添加其他语言的翻译
    console.log(`Category ${category.name} ready for translation`);
  }
}

migrateCategories();
```

#### 1.3 执行迁移
```bash
pnpm d1:apply          # 本地
pnpm d1:apply:remote   # 生产环境
```

### Phase 2: Service 层改造

修改以下文件：
- `src/services/content/categories.ts`
- `src/services/content/tags.ts`
- `src/services/content/featured.ts`
- `src/services/content/introductions.ts`
- `src/services/content/games.ts`

关键改动：
- 添加语言参数到查询函数
- 实现字段级回退逻辑
- 封装通用翻译查询方法

### Phase 3: API 更新

修改管理后台 API：
- `src/app/api/admin/categories/route.ts` (GET/POST)
- `src/app/api/admin/categories/[uuid]/route.ts` (GET/PUT/DELETE)
- 同理修改 tags, featured, games API

关键改动：
- GET: 返回所有语言的翻译（管理后台）
- POST/PUT: 接收 translations 对象，分别处理英文和其他语言
- DELETE: 软删除时同时处理翻译表

**代码质量要求**：
- ✅ 遵循 SOLID 原则
- ✅ 单一职责：API 层只负责参数验证和响应，业务逻辑在 Service 层
- ✅ 依赖倒置：依赖接口而非具体实现
- ✅ 开闭原则：扩展新语言无需修改现有代码

### Phase 4: CMS UI 实现

修改管理后台组件：
- `src/components/admin/taxonomy-management.tsx`
- `src/components/admin/game-form.tsx`

关键改动：
- 添加 Tabs 组件（使用 Shadcn UI）
- 实现语言状态指示器
- 添加快捷操作按钮
- 表单数据结构改造

**UI 组件优先级**：
1. ✅ 优先使用项目已有组件
2. ✅ 安装并使用缺少的 Shadcn UI 组件
3. ✅ 使用 Magic UI 组件（动画、复杂交互）
4. ❌ 最后才考虑创建新组件

**配置驱动式设计**：
```typescript
// 表单配置示例
const LANGUAGE_FORM_CONFIG = {
  fields: [
    { name: 'code', label: 'Language Code', type: 'text', required: true },
    { name: 'language', label: 'Native Name', type: 'text', required: true },
    { name: 'zhLanguage', label: 'Chinese Name', type: 'text', required: true },
  ],
};

// Table 配置示例
const LANGUAGE_TABLE_CONFIG = {
  columns: [
    { key: 'code', label: 'Code', width: '100px' },
    { key: 'language', label: 'Language', width: 'auto' },
    { key: 'audit', label: 'Completion', render: (row) => `${row.audit.overall.percentage * 100}%` },
  ],
};
```

**优点**：
- 减少重复代码，降低打包体积
- 易于维护和扩展
- 统一 UI 风格

### Phase 5: 多语言管理页面

新建管理页面和API：
- `src/app/admin/languages/page.tsx` - 多语言管理主页
- `src/app/api/admin/languages/route.ts` - 语言列表 CRUD
- `src/app/api/admin/languages/[code]/route.ts` - 单个语言管理
- `src/app/api/admin/languages/[code]/audit/route.ts` - 审计数据API
- `src/app/api/admin/languages/[code]/translate/route.ts` - 翻译任务创建

关键功能：
- 语言卡片展示和管理
- 实时审计数据计算和展示
- 语言增删改功能
- 自动化翻译入口

### Phase 6: 自动化翻译系统

**架构设计**：

实现翻译任务队列和处理：
- `src/services/translation/processor.ts` - 翻译任务处理器（**核心服务**）
- `src/services/translation/prompts.ts` - AI 翻译提示词
- `src/services/audit/language-audit.ts` - 审计逻辑
- `worker/index.ts` - 队列消费逻辑增强

**环境区分**：
- **本地开发**: API 直接调用 `processTranslationTask()` 服务函数
- **线上环境**: API 发送队列消息，Worker 异步消费

关键功能：
- 队列消息定义和发送
- AI 翻译调用（OpenRouter + GPT-4.1，英文提示词）
- 任务进度实时更新
- 错误处理和重试机制
- 翻译任务详情页面

**服务封装原则**：
```typescript
// ✅ 正确：业务逻辑封装在 services 目录
// src/services/translation/processor.ts
export async function processTranslationTask(params: ProcessTaskParams) {
  // 核心翻译逻辑
}

// ✅ 正确：API 层调用服务
// src/app/api/admin/languages/[code]/translate/route.ts
if (isDevelopment) {
  await processTranslationTask({ ... });  // 本地直接调用
} else {
  await queue.send(message);  // 线上发队列
}

// ✅ 正确：Worker 调用服务
// worker/index.ts
import { processTranslationTask } from '@/services/translation/processor';
await processTranslationTask({ ... });
```

依赖安装：
```bash
pnpm add ai @openrouter/ai-sdk-provider
```

环境变量配置：
```bash
# .env.local
OPENROUTER_API_KEY=your_openrouter_api_key
```

### Phase 7: 前端集成

修改前端展示页面：
- 分类列表页 `/[locale]/category/[slug]`
- 标签列表页 `/[locale]/tag/[slug]`
- 游戏详情页 `/[locale]/game/[slug]`

关键改动：
- 从 `useLocale()` 获取当前语言
- API 请求传递 locale 参数
- **C端页面**: 翻译完成度不达标时 302 重定向到默认语言（参见 8.3 节）
- SEO 元标签处理（hreflang 已在 layout.tsx 全局实现）

**重定向实现**：
```typescript
// src/app/[locale]/category/[slug]/page.tsx
export default async function CategoryPage({ params }: Props) {
  const { locale, slug } = await params;
  const category = await getCategoryBySlug(slug, locale);

  // 翻译完成度检查，不达标则重定向
  if (locale !== DEFAULT_LOCALE && category._translation?.completeness < 0.5) {
    redirect(`/${DEFAULT_LOCALE}/category/${slug}`);
  }

  return <CategoryContent category={category} />;
}
```

---

## 十、最佳实践

### 10.1 性能优化

#### 缓存策略
```typescript
// 使用 SWR 缓存翻译数据
const { data: category } = useSWR(
  `/api/categories/${slug}?locale=${locale}`,
  fetcher,
  {
    revalidateOnFocus: false,
    dedupingInterval: 60000,  // 1分钟内不重复请求
  }
);
```

#### 批量查询优化
```typescript
// 使用 DataLoader 或批量查询避免 N+1 问题
async function getGamesWithTranslations(gameUuids: string[], locale: string) {
  // 一次性查询所有游戏的翻译
  const translations = await db
    .select()
    .from(introductionTranslations)
    .where(
      and(
        inArray(introductionTranslations.gameUuid, gameUuids),
        eq(introductionTranslations.locale, locale)
      )
    );

  // 映射回游戏
  const translationMap = new Map(
    translations.map(t => [t.gameUuid, t])
  );

  return games.map(game => ({
    ...game,
    introduction: translationMap.get(game.uuid) || defaultIntroduction,
  }));
}
```

### 10.2 SEO 最佳实践

#### Hreflang 标签

**说明**: 项目已在 `src/app/[locale]/layout.tsx` 中通过 `<HrefLangs locale={locale} />` 组件全局实现 hreflang 标签，无需在各个页面重复实现。

```tsx
// src/app/[locale]/layout.tsx (已实现)
<head>
  <Canonical locale={locale} />
  <HrefLangs locale={locale} />  {/* 自动为所有页面添加 hreflang */}
  <GoogleTag />
</head>
```

**注意**: 只需确保页面元数据（title、description）正确设置即可：

```tsx
// src/app/[locale]/category/[slug]/page.tsx
export async function generateMetadata({ params }: Props) {
  const { locale, slug } = params;
  const category = await getCategoryBySlug(slug, locale);

  return {
    title: category.metadataTitle,
    description: category.metadataDescription,
    // hreflang 已在 layout.tsx 全局处理，无需在此设置
  };
}
```

#### 结构化数据
```tsx
<script type="application/ld+json">
  {JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": category.metadataTitle,
    "description": category.metadataDescription,
    "inLanguage": locale,
  })}
</script>
```

### 10.3 代码封装模式

#### 通用翻译 Hook
```typescript
// src/hooks/use-translation-data.ts

export function useTranslationData<T extends Record<string, any>>(
  data: T & { _translation?: TranslationMeta },
  options: UseTranslationOptions = {}
) {
  const locale = useLocale();
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    const shouldShow =
      locale !== 'en' &&
      data._translation?.completeness < I18N_CONFIG.fallback.showNoticeThreshold;
    setShowNotice(shouldShow);
  }, [data, locale]);

  return {
    data,
    showNotice,
    isFallback: data._translation?.available === false,
    completeness: data._translation?.completeness || 1,
    switchToEnglish: () => router.push(`/en${pathname}`),
  };
}
```

### 10.4 测试策略

#### 单元测试
```typescript
// __tests__/services/categories.test.ts

describe('getCategoryBySlug', () => {
  it('should return English content for en locale', async () => {
    const result = await getCategoryBySlug('action', 'en');
    expect(result._fallback).toBe(false);
    expect(result.metadataTitle).toBe('Action Games - Play Free Online');
  });

  it('should fallback to English if translation missing', async () => {
    const result = await getCategoryBySlug('action', 'fr');
    expect(result._fallback).toBe(true);
    expect(result.metadataTitle).toBe('Action Games - Play Free Online');
  });

  it('should use translation if available', async () => {
    const result = await getCategoryBySlug('action', 'zh');
    expect(result._fallback).toBe(false);
    expect(result.metadataTitle).toBe('动作游戏 - 免费在线玩');
  });
});
```

#### E2E 测试
```typescript
// e2e/admin/categories.spec.ts

test('should create category with multiple languages', async ({ page }) => {
  await page.goto('/admin/categories');
  await page.click('button:has-text("Add Category")');

  // 填写英文
  await page.fill('[name="name"]', 'Test Category');
  await page.fill('[id="title-en"]', 'Test Title');

  // 切换到中文
  await page.click('button:has-text("中文")');
  await page.fill('[id="title-zh"]', '测试标题');

  // 保存
  await page.click('button:has-text("Save All Languages")');

  // 验证
  await expect(page.locator('text=Category saved successfully')).toBeVisible();
});
```

---

## 十一、附录

### 11.1 完整类型定义

```typescript
// src/types/i18n.ts

export type LanguageCode = 'en' | 'zh' | 'ja' | 'es' | 'ko' | 'zh-Hant' | 'pl';

export interface TranslationFields {
  metadataTitle: string;
  metadataDescription: string;
  content?: string;
}

export interface TranslationMeta {
  available: boolean;      // 是否有该语言的翻译
  partial: boolean;        // 是否部分翻译
  fallbackFields: string[]; // 使用回退的字段列表
  completeness: number;    // 完整度 0-1
}

export interface I18nData {
  [locale: string]: TranslationFields;
}

export interface CategoryWithTranslation extends Category {
  _locale: string;
  _fallback: boolean;
  _fallbackFields?: string[];
  _translation?: TranslationMeta;
}

export interface UpdateCategoryData {
  name: string;
  slug: string;
  iconUrl?: string;
  translations: I18nData;
}
```

### 11.2 SQL 迁移示例

```sql
-- drizzle/0002_add_i18n_support.sql

-- 1. 添加 games 表的 JSON 字段
ALTER TABLE games ADD COLUMN name_i18n TEXT;

-- 2. 迁移现有 name 数据为 JSON 格式
UPDATE games SET name_i18n = json_object('en', name);

-- 3. 创建翻译表
CREATE TABLE category_translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_uuid TEXT NOT NULL,
  locale TEXT NOT NULL,
  metadata_title TEXT NOT NULL,
  metadata_description TEXT NOT NULL,
  content TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(category_uuid, locale)
);

CREATE INDEX idx_category_translations_uuid ON category_translations(category_uuid);
CREATE INDEX idx_category_translations_locale ON category_translations(locale);

-- 同理创建其他翻译表
CREATE TABLE tag_translations (...);
CREATE TABLE featured_translations (...);
CREATE TABLE introduction_translations (...);
```

### 11.3 常用工具函数

```typescript
// src/lib/i18n-utils.ts

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function calculateCompleteness(
  translation: Partial<TranslationFields>,
  requiredFields: string[] = ['metadataTitle', 'metadataDescription']
): number {
  const filledCount = requiredFields.filter(
    field => translation[field as keyof TranslationFields]?.trim()
  ).length;
  return filledCount / requiredFields.length;
}

export function mergeWithFallback<T extends Record<string, any>>(
  translation: Partial<T>,
  fallback: T
): T {
  return Object.keys(fallback).reduce((acc, key) => ({
    ...acc,
    [key]: translation[key] || fallback[key],
  }), {} as T);
}
```

---

## 总结

本方案采用**混合存储策略**和**方案A（原表承载默认语言）**，实现了完整的多语言管理系统：

### 核心功能

✅ **零迁移成本** - 现有英文数据无需迁移
✅ **向后兼容** - 不影响现有功能
✅ **性能优化** - 默认语言无额外查询开销
✅ **灵活扩展** - 支持渐进式添加语言
✅ **用户友好** - 自动回退，总是有内容显示
✅ **SEO 优化** - 完整的多语言 SEO 支持

### 创新特性

✅ **独立语言管理页面** - 统一管理所有启用语言
✅ **实时审计数据** - 客户端加载，透明展示翻译完成度
✅ **自动化 AI 翻译** - 使用 GPT-4.1 批量翻译，支持全量/补充模式，英文提示词
✅ **任务队列系统** - Cloudflare Queues 后台处理，支持进度追踪
✅ **代码配置优先** - 语言列表保持在代码中，不与数据库联动
✅ **智能重定向** - C端翻译完成度不达标时自动302重定向到默认语言
✅ **环境区分处理** - 本地开发直接调用服务，线上才走队列

### 技术架构

- **数据库**: 混合存储（JSON字段 + 翻译表）+ 任务表，仅修改 schema.ts
- **队列**: Cloudflare Queues + Worker 消费，服务封装在 `src/services/`
- **AI**: OpenRouter + GPT-4.1 (temperature=0.3)，英文提示词
- **审计**: 实时计算，并行查询优化
- **缓存**: SWR 客户端缓存，1分钟去重
- **UI**: 组件优先级（已有 > Shadcn > Magic UI > 新建），配置驱动式生成
- **代码质量**: 严格遵循 SOLID 原则

### 预估工作量

- **Phase 1-3**: 2-3 天（数据库 + Service + API）
- **Phase 4**: 1-2 天（编辑对话框 Tabs）
- **Phase 5**: 2 天（多语言管理页面 + 审计API）
- **Phase 6**: 2-3 天（翻译任务队列 + AI 集成）
- **Phase 7**: 1 天（前端集成）
- **测试**: 1-2 天

**总计**: 9-13 天完整实现（含测试）

### 风险评估

- **技术风险**: 低（保留原有字段，可随时回滚）
- **性能风险**: 低（审计数据客户端加载，默认语言无额外开销）
- **AI 风险**: 中（依赖第三方服务，需要监控费用和质量）
- **队列风险**: 低（Cloudflare Queues 成熟稳定）

### 后续优化方向

1. **翻译质量审核** - 添加人工审核流程
2. **批量导入导出** - 支持 CSV/Excel 批量管理翻译
3. **翻译记忆库** - 建立术语库，提高一致性
4. **多模型支持** - 支持切换不同AI模型
5. **成本监控** - 实时监控翻译API费用
6. **A/B测试** - 测试不同翻译版本效果
