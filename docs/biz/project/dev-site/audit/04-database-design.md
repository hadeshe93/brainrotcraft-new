# 数据表设计审阅

**审阅日期**: 2025-10-31
**项目**: gamesramp.com
**审阅人**: Claude Code
**数据库**: Cloudflare D1 (SQLite)
**ORM**: Drizzle ORM

---

## 一、现有数据表分析

### 1.1 继承的数据表

根据 @src/db/schema.ts，项目继承了以下数据表：

| 表名                  | 用途     | 游戏站是否需要 | 处理建议            |
| --------------------- | -------- | -------------- | ------------------- |
| `users`               | 用户信息 | ✅ 需要        | 保留并扩展          |
| `orders`              | 订单记录 | ⚠️ 可选        | 保留（VIP会员功能） |
| `user_works`          | 用户作品 | ❌ 不需要      | 删除或不迁移        |
| `user_credit_income`  | 积分收入 | ❌ 不需要      | 删除或不迁移        |
| `user_credit_expense` | 积分消耗 | ❌ 不需要      | 删除或不迁移        |

**评级**: ⭐⭐⭐ (3/5)

**评语**: 现有表结构设计良好，但大部分与游戏聚合站业务无关。`users` 表可以复用，`orders` 表如果计划推出 VIP 会员功能可以保留，其他表建议不迁移。

---

## 二、规划中的数据表审阅

### 2.1 表结构概览

根据 plan.md，提出了以下数据表：

```typescript
// 基础接口
interface RowBase {
  id: number;              // 自增ID
  uuid: string;            // 唯一UUID
  row_status: ERowStatus;  // 数据状态
  created_at: number;      // 创建时间戳（秒）
  updated_at: number;      // 更新时间戳（秒）
  deleted_at: number;      // 删除时间戳（秒）- 软删除
}

interface SeoBase {
  metadata_title: string;        // 元标题
  metadata_description: string;  // 元描述
}

// 核心表
1. Detail (游戏详情)
2. Comment (游戏评论)
3. Introduction (游戏介绍)
4. Category (分类)
5. Tag (标签)
6. Featured (特性)
```

---

## 三、逐表详细审阅

### 3.1 Detail（游戏详情表）

#### 当前设计

```typescript
interface Detail extends RowBase {
  name: string; // 游戏名称
  thumbnail: string; // 缩略图 url
  source: string; // 资源地址 url
  interact: number; // 交互次数
  score: number; // 评分
  upvote: number; // 赞成数
  downvote: number; // 反对数
  save: number; // 收藏数
  share: number; // 分享数
  categories: string[]; // 所属的分类 UUID 列表
  tags: string[]; // 所属的标签 UUID 列表
  created_at: number; // 创建时间戳
  updated_at: number; // 更新时间戳
}
```

#### 问题分析

| 问题                               | 严重程度 | 说明                                        |
| ---------------------------------- | -------- | ------------------------------------------- |
| ❌ 缺少 `slug` 字段                | 🔴 高    | URL友好的唯一标识符（如 "super-mario-run"） |
| ❌ `categories` 和 `tags` 设计不当 | 🔴 高    | SQLite 不支持数组，存储为 JSON 字符串性能差 |
| ⚠️ `interact` 语义不清             | 🟡 中    | 不明确"交互"指什么，建议拆分                |
| ⚠️ `score` 缺少评分数量            | 🟡 中    | 只有平均分，无法计算加权评分                |
| ⚠️ 缺少游戏状态字段                | 🟡 中    | 需要区分草稿、已发布、已下架                |
| ⚠️ 缺少发布时间字段                | 🟢 低    | 方便按发布时间排序                          |
| ⚠️ 缺少游戏元信息                  | 🟢 低    | 如宽高比、平台兼容性                        |

#### 改进后的设计

```typescript
// Drizzle ORM schema
export const games = sqliteTable(
  'games',
  {
    // 主键和标识
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),
    slug: text('slug').notNull().unique(), // ✅ 新增：URL友好标识

    // 基础信息
    name: text('name').notNull(),
    thumbnail: text('thumbnail').notNull(), // 缩略图 URL
    source: text('source').notNull(), // 游戏资源 URL

    // SEO 优化
    metadataTitle: text('metadata_title'),
    metadataDescription: text('metadata_description'),

    // 统计数据（非规范化，性能优化）
    viewCount: integer('view_count').default(0), // ✅ 明确：浏览次数
    playCount: integer('play_count').default(0), // ✅ 明确：游玩次数
    rating: real('rating').default(0), // 平均评分（0-10）
    ratingCount: integer('rating_count').default(0), // ✅ 新增：评分次数
    upvoteCount: integer('upvote_count').default(0),
    downvoteCount: integer('downvote_count').default(0),
    saveCount: integer('save_count').default(0),
    shareCount: integer('share_count').default(0),
    commentCount: integer('comment_count').default(0), // ✅ 新增：评论数

    // 状态管理
    status: text('status', {
      enum: ['draft', 'published', 'unpublished', 'deleted'],
    })
      .default('draft')
      .notNull(), // ✅ 新增：游戏状态

    // 游戏元信息
    aspectRatio: text('aspect_ratio', {
      enum: ['16:9', '4:3', '1:1', 'custom'],
    }).default('16:9'), // ✅ 新增：宽高比
    platform: text('platform').default('["desktop","mobile"]'), // JSON: 支持的平台

    // 时间字段
    publishedAt: integer('published_at'), // ✅ 新增：发布时间
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
    deletedAt: integer('deleted_at'), // 软删除
  },
  (table) => ({
    uuidIdx: uniqueIndex('games_uuid_idx').on(table.uuid),
    slugIdx: uniqueIndex('games_slug_idx').on(table.slug),
    statusIdx: index('games_status_idx').on(table.status),
    ratingIdx: index('games_rating_idx').on(table.rating),
    playCountIdx: index('games_play_count_idx').on(table.playCount),
    publishedAtIdx: index('games_published_at_idx').on(table.publishedAt),
  }),
);
```

**关系表设计（categories 和 tags）**:

```typescript
// 游戏-分类关联表（多对多）
export const gamesToCategories = sqliteTable(
  'games_to_categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    gameUuid: text('game_uuid').notNull(),
    categoryUuid: text('category_uuid').notNull(),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    gameUuidIdx: index('games_to_categories_game_uuid_idx').on(table.gameUuid),
    categoryUuidIdx: index('games_to_categories_category_uuid_idx').on(table.categoryUuid),
    uniquePairIdx: uniqueIndex('games_to_categories_unique_pair_idx').on(table.gameUuid, table.categoryUuid),
  }),
);

// 游戏-标签关联表（多对多）
export const gamesToTags = sqliteTable(
  'games_to_tags',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    gameUuid: text('game_uuid').notNull(),
    tagUuid: text('tag_uuid').notNull(),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    gameUuidIdx: index('games_to_tags_game_uuid_idx').on(table.gameUuid),
    tagUuidIdx: index('games_to_tags_tag_uuid_idx').on(table.tagUuid),
    uniquePairIdx: uniqueIndex('games_to_tags_unique_pair_idx').on(table.gameUuid, table.tagUuid),
  }),
);
```

**评级**: ⭐⭐⭐ (3/5) → 改进后 ⭐⭐⭐⭐⭐ (5/5)

---

### 3.2 Comment（评论表）

#### 当前设计

```typescript
interface Comment extends RowBase {
  content: string; // 评论内容
  user_uuid: string; // 用户 UUID
}
```

#### 问题分析

| 问题                | 严重程度 | 说明                     |
| ------------------- | -------- | ------------------------ |
| ❌ 缺少关联游戏字段 | 🔴 高    | 必须知道评论属于哪个游戏 |
| ❌ 缺少审核状态     | 🔴 高    | 需要内容审核功能         |
| ⚠️ 缺少评分字段     | 🟡 中    | 用户评论时可能同时打分   |
| ⚠️ 缺少点赞/举报    | 🟡 中    | 评论互动功能             |
| ⚠️ 缺少回复关联     | 🟢 低    | 支持评论回复             |

#### 改进后的设计

```typescript
export const comments = sqliteTable(
  'comments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),

    // 关联字段
    gameUuid: text('game_uuid').notNull(), // ✅ 新增：关联游戏
    userUuid: text('user_uuid').notNull(), // 关联用户
    parentCommentUuid: text('parent_comment_uuid'), // ✅ 新增：父评论（回复功能）

    // 内容
    content: text('content').notNull(),
    rating: integer('rating'), // ✅ 新增：可选评分（0-10）

    // 审核状态
    moderationStatus: text('moderation_status', {
      enum: ['pending', 'approved', 'rejected', 'spam'],
    })
      .default('pending')
      .notNull(), // ✅ 新增：审核状态

    // 互动数据
    upvoteCount: integer('upvote_count').default(0), // ✅ 新增：点赞数
    downvoteCount: integer('downvote_count').default(0), // ✅ 新增：点踩数
    reportCount: integer('report_count').default(0), // ✅ 新增：举报次数

    // 元信息
    ipAddress: text('ip_address'), // ✅ 新增：IP地址（防刷）
    userAgent: text('user_agent'), // ✅ 新增：User Agent
    isEdited: integer('is_edited', { mode: 'boolean' }).default(false), // ✅ 是否编辑过

    // 时间字段
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
    deletedAt: integer('deleted_at'),
  },
  (table) => ({
    uuidIdx: uniqueIndex('comments_uuid_idx').on(table.uuid),
    gameUuidIdx: index('comments_game_uuid_idx').on(table.gameUuid),
    userUuidIdx: index('comments_user_uuid_idx').on(table.userUuid),
    parentCommentIdx: index('comments_parent_comment_idx').on(table.parentCommentUuid),
    moderationStatusIdx: index('comments_moderation_status_idx').on(table.moderationStatus),
    gameCreatedIdx: index('comments_game_created_idx').on(table.gameUuid, table.createdAt),
  }),
);
```

**评级**: ⭐⭐ (2/5) → 改进后 ⭐⭐⭐⭐⭐ (5/5)

---

### 3.3 Introduction（游戏介绍表）

#### 当前设计

```typescript
interface Introduction extends RowBase, SeoBase {
  content: string; // Markdown 格式的游戏详情和玩法介绍，长文本
}
```

#### 问题分析

| 问题                | 严重程度 | 说明                     |
| ------------------- | -------- | ------------------------ |
| ❌ 缺少关联游戏字段 | 🔴 高    | 必须知道介绍属于哪个游戏 |
| ⚠️ 表结构冗余       | 🟡 中    | 可以合并到 games 表      |
| ⚠️ SEO字段重复      | 🟡 中    | games 表已有 SEO 字段    |

#### 建议：合并到 games 表

**理由**:

- 一个游戏只有一个介绍（1对1关系）
- 单独一张表增加查询复杂度
- SEO 字段在 games 表已存在

**改进方案**:

```typescript
// 在 games 表中添加
export const games = sqliteTable('games', {
  // ... 其他字段

  // 游戏介绍（合并 Introduction 表）
  introduction: text('introduction'), // Markdown 格式
  howToPlay: text('how_to_play'), // 玩法说明
  features: text('features'), // JSON: 特色功能列表

  // ... 其他字段
});
```

**如果坚持分表**（仅在以下情况推荐）:

- 介绍内容超大（>10KB）
- 需要多语言版本
- 需要版本历史记录

```typescript
export const gameIntroductions = sqliteTable(
  'game_introductions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),
    gameUuid: text('game_uuid').notNull().unique(), // ✅ 1对1关联
    locale: text('locale').default('en').notNull(), // ✅ 多语言支持

    content: text('content').notNull(), // Markdown
    howToPlay: text('how_to_play'),
    features: text('features'), // JSON

    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    gameLocaleIdx: uniqueIndex('game_introductions_game_locale_idx').on(table.gameUuid, table.locale),
  }),
);
```

**评级**: ⭐⭐ (2/5) - 建议合并到 games 表

---

### 3.4 Category（分类表）

#### 当前设计

```typescript
interface Category extends RowBase, SeoBase {
  name: string; // 分类名称
  content: string; // Markdown 格式的内容，长文本
}
```

#### 问题分析

| 问题                | 严重程度 | 说明                 |
| ------------------- | -------- | -------------------- |
| ⚠️ 缺少 `slug` 字段 | 🟡 中    | URL友好标识符        |
| ⚠️ 缺少图标字段     | 🟡 中    | 前端展示需要         |
| ⚠️ 缺少排序字段     | 🟡 中    | 控制显示顺序         |
| ⚠️ 缺少游戏计数     | 🟢 低    | 性能优化（非规范化） |

#### 改进后的设计

```typescript
export const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),
    slug: text('slug').notNull().unique(), // ✅ 新增

    // 基础信息
    name: text('name').notNull(),
    description: text('description'), // 简短描述
    content: text('content'), // Markdown 详细内容
    icon: text('icon'), // ✅ 新增：图标 URL 或 emoji
    thumbnail: text('thumbnail'), // ✅ 新增：分类缩略图
    color: text('color'), // ✅ 新增：主题颜色（hex）

    // SEO
    metadataTitle: text('metadata_title'),
    metadataDescription: text('metadata_description'),

    // 统计（非规范化）
    gameCount: integer('game_count').default(0), // ✅ 新增：游戏数量

    // 管理
    isVisible: integer('is_visible', { mode: 'boolean' }).default(true), // ✅ 前端是否显示
    sortOrder: integer('sort_order').default(0), // ✅ 新增：排序权重

    // 时间字段
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
    deletedAt: integer('deleted_at'),
  },
  (table) => ({
    uuidIdx: uniqueIndex('categories_uuid_idx').on(table.uuid),
    slugIdx: uniqueIndex('categories_slug_idx').on(table.slug),
    sortOrderIdx: index('categories_sort_order_idx').on(table.sortOrder),
    isVisibleIdx: index('categories_is_visible_idx').on(table.isVisible),
  }),
);
```

**评级**: ⭐⭐⭐ (3/5) → 改进后 ⭐⭐⭐⭐⭐ (5/5)

---

### 3.5 Tag（标签表）

#### 当前设计

```typescript
interface Tag extends RowBase, SeoBase {
  name: string; // 标签名称
  content: string; // Markdown 格式的内容，长文本
}
```

#### 问题分析

与 Category 表类似，但标签通常更简单：

| 问题                      | 严重程度 | 说明                   |
| ------------------------- | -------- | ---------------------- |
| ⚠️ 缺少 `slug` 字段       | 🟡 中    | URL友好标识符          |
| ⚠️ `content` 字段可能多余 | 🟡 中    | 标签通常不需要详细内容 |
| ⚠️ SEO字段可能多余        | 🟡 中    | 标签页面SEO优先级较低  |

#### 改进后的设计

```typescript
export const tags = sqliteTable(
  'tags',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),
    slug: text('slug').notNull().unique(), // ✅ 新增

    // 基础信息
    name: text('name').notNull(),
    description: text('description'), // 简短描述即可

    // SEO（可选）
    metadataTitle: text('metadata_title'),
    metadataDescription: text('metadata_description'),

    // 统计
    gameCount: integer('game_count').default(0), // 游戏数量

    // 管理
    isVisible: integer('is_visible', { mode: 'boolean' }).default(true),

    // 时间字段
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
    deletedAt: integer('deleted_at'),
  },
  (table) => ({
    uuidIdx: uniqueIndex('tags_uuid_idx').on(table.uuid),
    slugIdx: uniqueIndex('tags_slug_idx').on(table.slug),
    isVisibleIdx: index('tags_is_visible_idx').on(table.isVisible),
  }),
);
```

**简化建议**: 标签不需要 `content` 字段（Markdown内容），保持简单即可。

**评级**: ⭐⭐⭐ (3/5) → 改进后 ⭐⭐⭐⭐⭐ (5/5)

---

### 3.6 Featured（特性表）

#### 当前设计

```typescript
interface Featured extends RowBase, SeoBase {
  name: string; // 特性名称，例如：Hot、New 等等
  content: string; // Markdown 格式的内容，长文本
  detail_uuid: string[]; // 反向关联到具体 detail 下的 uuid
}
```

#### 问题分析

| 问题                | 严重程度 | 说明                          |
| ------------------- | -------- | ----------------------------- |
| ❌ 数组字段设计不当 | 🔴 高    | SQLite 不支持数组             |
| ⚠️ 缺少更新规则字段 | 🟡 中    | 如何自动更新（每小时/每天？） |
| ⚠️ 缺少 `slug` 字段 | 🟡 中    | URL友好标识符                 |

#### 设计方案对比

**方案A：独立表 + 关联表（推荐）**

```typescript
// Featured 定义表
export const featuredTypes = sqliteTable(
  'featured_types',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),
    slug: text('slug').notNull().unique(), // "hot", "new", "popular"

    name: text('name').notNull(), // "Hot Games", "New Games"
    description: text('description'),

    // SEO
    metadataTitle: text('metadata_title'),
    metadataDescription: text('metadata_description'),

    // 更新规则
    updateFrequency: text('update_frequency', {
      enum: ['hourly', 'daily', 'weekly', 'manual'],
    }).default('daily'), // ✅ 新增：更新频率

    updateRule: text('update_rule', {
      enum: ['hot_score', 'latest', 'rating', 'play_count'],
    }).notNull(), // ✅ 新增：更新规则

    maxGames: integer('max_games').default(50), // ✅ 新增：最多包含游戏数

    // 管理
    isVisible: integer('is_visible', { mode: 'boolean' }).default(true),
    sortOrder: integer('sort_order').default(0),

    // 时间字段
    lastUpdatedAt: integer('last_updated_at'), // ✅ 新增：最后更新时间
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uuidIdx: uniqueIndex('featured_types_uuid_idx').on(table.uuid),
    slugIdx: uniqueIndex('featured_types_slug_idx').on(table.slug),
  }),
);

// Featured 游戏关联表
export const featuredGames = sqliteTable(
  'featured_games',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    featuredTypeUuid: text('featured_type_uuid').notNull(),
    gameUuid: text('game_uuid').notNull(),
    rank: integer('rank').notNull(), // ✅ 排名（1-50）
    score: real('score'), // ✅ 计算得分（用于排序）

    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    featuredTypeIdx: index('featured_games_featured_type_idx').on(table.featuredTypeUuid),
    gameUuidIdx: index('featured_games_game_uuid_idx').on(table.gameUuid),
    uniquePairIdx: uniqueIndex('featured_games_unique_pair_idx').on(table.featuredTypeUuid, table.gameUuid),
    rankIdx: index('featured_games_rank_idx').on(table.featuredTypeUuid, table.rank),
  }),
);
```

**方案B：简化版（存储 JSON）**

```typescript
// 仅适用于数据量小、更新不频繁的场景
export const featuredCollections = sqliteTable('featured_collections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  slug: text('slug').notNull().unique(),

  name: text('name').notNull(),
  gameUuids: text('game_uuids').notNull(), // JSON 数组: ["uuid1", "uuid2"]

  lastUpdatedAt: integer('last_updated_at'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch())`),
});
```

**推荐**: 方案A，更灵活、可扩展性强。

**评级**: ⭐⭐ (2/5) → 改进后 ⭐⭐⭐⭐⭐ (5/5)

---

## 四、缺失的数据表

### 4.1 用户互动表（必须）

**用途**: 记录用户对游戏的互动行为

```typescript
// 用户游戏互动表
export const userGameInteractions = sqliteTable(
  'user_game_interactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),

    userUuid: text('user_uuid').notNull(),
    gameUuid: text('game_uuid').notNull(),

    // 互动类型
    hasPlayed: integer('has_played', { mode: 'boolean' }).default(false),
    hasSaved: integer('has_saved', { mode: 'boolean' }).default(false),
    hasUpvoted: integer('has_upvoted', { mode: 'boolean' }).default(false),
    hasDownvoted: integer('has_downvoted', { mode: 'boolean' }).default(false),
    hasShared: integer('has_shared', { mode: 'boolean' }).default(false),

    userRating: integer('user_rating'), // 用户个人评分（0-10）

    // 统计
    playCount: integer('play_count').default(0), // 游玩次数
    totalPlayTime: integer('total_play_time').default(0), // 总游玩时间（秒）
    lastPlayedAt: integer('last_played_at'),

    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uuidIdx: uniqueIndex('user_game_interactions_uuid_idx').on(table.uuid),
    userGameIdx: uniqueIndex('user_game_interactions_user_game_idx').on(table.userUuid, table.gameUuid),
    userIdx: index('user_game_interactions_user_idx').on(table.userUuid),
    gameIdx: index('user_game_interactions_game_idx').on(table.gameUuid),
    savedIdx: index('user_game_interactions_saved_idx').on(table.userUuid, table.hasSaved),
    lastPlayedIdx: index('user_game_interactions_last_played_idx').on(table.userUuid, table.lastPlayedAt),
  }),
);
```

**理由**:

- 用户收藏、点赞、评分等行为需要独立记录
- 支持个性化推荐
- 防止用户重复投票

---

### 4.2 用户评论互动表（推荐）

**用途**: 记录用户对评论的点赞/举报行为

```typescript
export const commentInteractions = sqliteTable(
  'comment_interactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),

    userUuid: text('user_uuid').notNull(),
    commentUuid: text('comment_uuid').notNull(),

    interactionType: text('interaction_type', {
      enum: ['upvote', 'downvote', 'report'],
    }).notNull(),

    reportReason: text('report_reason', {
      enum: ['spam', 'inappropriate', 'harassment', 'other'],
    }), // 仅 report 类型需要

    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uuidIdx: uniqueIndex('comment_interactions_uuid_idx').on(table.uuid),
    userCommentTypeIdx: uniqueIndex('comment_interactions_user_comment_type_idx').on(
      table.userUuid,
      table.commentUuid,
      table.interactionType,
    ),
    userIdx: index('comment_interactions_user_idx').on(table.userUuid),
    commentIdx: index('comment_interactions_comment_idx').on(table.commentUuid),
  }),
);
```

---

### 4.3 操作日志表（推荐）

**用途**: 记录管理员操作，用于审计

```typescript
export const activityLogs = sqliteTable(
  'activity_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),

    // 操作人
    userUuid: text('user_uuid').notNull(),
    userRole: text('user_role').notNull(), // 操作时的角色

    // 操作信息
    action: text('action', {
      enum: ['create', 'update', 'delete', 'publish', 'unpublish', 'approve', 'reject'],
    }).notNull(),

    resourceType: text('resource_type', {
      enum: ['game', 'category', 'tag', 'comment', 'user', 'setting'],
    }).notNull(),

    resourceUuid: text('resource_uuid').notNull(),
    resourceName: text('resource_name'), // 资源名称快照

    // 变更内容
    changes: text('changes'), // JSON: { before: {}, after: {} }

    // 元信息
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),

    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uuidIdx: uniqueIndex('activity_logs_uuid_idx').on(table.uuid),
    userIdx: index('activity_logs_user_idx').on(table.userUuid),
    resourceTypeIdx: index('activity_logs_resource_type_idx').on(table.resourceType),
    resourceUuidIdx: index('activity_logs_resource_uuid_idx').on(table.resourceUuid),
    actionIdx: index('activity_logs_action_idx').on(table.action),
    createdAtIdx: index('activity_logs_created_at_idx').on(table.createdAt),
  }),
);
```

---

### 4.4 举报表（推荐）

**用途**: 统一管理所有举报内容

```typescript
export const reports = sqliteTable(
  'reports',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),

    // 举报人
    reporterUuid: text('reporter_uuid').notNull(),

    // 被举报内容
    resourceType: text('resource_type', {
      enum: ['game', 'comment', 'user'],
    }).notNull(),
    resourceUuid: text('resource_uuid').notNull(),

    // 举报原因
    reason: text('reason', {
      enum: ['spam', 'inappropriate', 'copyright', 'harassment', 'other'],
    }).notNull(),
    description: text('description'), // 详细说明

    // 处理状态
    status: text('status', {
      enum: ['pending', 'investigating', 'resolved', 'dismissed'],
    })
      .default('pending')
      .notNull(),

    resolvedBy: text('resolved_by'), // 处理人 UUID
    resolution: text('resolution'), // 处理结果说明
    resolvedAt: integer('resolved_at'),

    // 优先级
    priority: text('priority', {
      enum: ['low', 'medium', 'high'],
    }).default('medium'),

    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uuidIdx: uniqueIndex('reports_uuid_idx').on(table.uuid),
    reporterIdx: index('reports_reporter_idx').on(table.reporterUuid),
    resourceTypeIdx: index('reports_resource_type_idx').on(table.resourceType),
    resourceUuidIdx: index('reports_resource_uuid_idx').on(table.resourceUuid),
    statusIdx: index('reports_status_idx').on(table.status),
    priorityIdx: index('reports_priority_idx').on(table.priority),
  }),
);
```

---

### 4.5 网站设置表（可选）

**用途**: 存储全局配置

```typescript
export const siteSettings = sqliteTable(
  'site_settings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    key: text('key').notNull().unique(),
    value: text('value').notNull(), // JSON格式
    description: text('description'),
    category: text('category', {
      enum: ['general', 'seo', 'features', 'ads', 'security'],
    }).notNull(),

    updatedBy: text('updated_by'), // 最后更新人
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    keyIdx: uniqueIndex('site_settings_key_idx').on(table.key),
    categoryIdx: index('site_settings_category_idx').on(table.category),
  }),
);

// 示例数据
/*
{
  key: "site_name",
  value: "\"GamesRamp\"",
  category: "general"
},
{
  key: "enable_comments",
  value: "true",
  category: "features"
},
{
  key: "google_analytics_id",
  value: "\"UA-XXXXXXXXX-X\"",
  category: "seo"
}
*/
```

---

## 五、现有 users 表优化建议

### 5.1 当前 users 表分析

当前 users 表设计良好，已包含：

- ✅ UUID 标识
- ✅ 第三方登录支持
- ✅ 账号状态管理
- ✅ 合理的索引

### 5.2 建议补充字段

```typescript
export const users = sqliteTable(
  'users',
  {
    // ... 现有字段保持不变

    // 新增字段（游戏站特定）
    role: text('role', {
      enum: ['user', 'moderator', 'admin', 'super_admin'],
    }).default('user'), // ✅ 新增：用户角色

    reputation: integer('reputation').default(0), // ✅ 新增：信誉分

    preferences: text('preferences'), // ✅ 新增：JSON - 用户偏好设置
    /*
    {
      language: "en",
      theme: "dark",
      emailNotifications: true,
      savedGamesPrivate: false
    }
  */

    lastLoginAt: integer('last_login_at'), // ✅ 新增：最后登录时间

    // ... 现有时间字段保持不变
  },
  (table) => ({
    // ... 现有索引保持不变
    roleIdx: index('users_role_idx').on(table.role), // ✅ 新增索引
  }),
);
```

---

## 六、数据库性能优化建议

### 6.1 索引策略

**已有的索引** (Good):

- ✅ 唯一索引：uuid, slug, email
- ✅ 外键索引：userUuid, gameUuid
- ✅ 状态索引：status, moderationStatus

**建议补充的组合索引**:

```typescript
// games 表
{
  // 前端列表页常用查询：按状态 + 发布时间排序
  statusPublishedIdx: index('games_status_published_idx')
    .on(table.status, table.publishedAt),

  // 热门游戏：按状态 + 游玩次数排序
  statusPlayCountIdx: index('games_status_play_count_idx')
    .on(table.status, table.playCount)
}

// comments 表
{
  // 游戏详情页评论列表：按游戏 + 审核状态 + 创建时间
  gameStatusCreatedIdx: index('comments_game_status_created_idx')
    .on(table.gameUuid, table.moderationStatus, table.createdAt)
}
```

### 6.2 非规范化（Denormalization）

**已实现的非规范化**:

- ✅ games 表存储计数器（playCount, saveCount等）
- ✅ categories/tags 表存储 gameCount

**为什么非规范化**:

- Cloudflare D1 免费额度有限（每天5百万次读取）
- 减少 JOIN 查询
- 提高列表页性能

**更新策略**:

```typescript
// 示例：更新游戏播放次数
async function incrementGamePlayCount(gameUuid: string) {
  // 方案1：直接更新（推荐）
  await db
    .update(games)
    .set({
      playCount: sql`${games.playCount} + 1`,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(games.uuid, gameUuid));

  // 方案2：定时批量更新（更高效，但有延迟）
  // 先记录到缓存（Redis），每5分钟批量写入数据库
}
```

### 6.3 缓存策略

**建议使用 Cloudflare KV 或 Durable Objects 缓存**:

```typescript
// 缓存热点数据
const cacheStrategy = {
  // 首页数据（5分钟）
  homepage: {
    ttl: 300,
    keys: ['featured_games', 'hot_games', 'new_games'],
  },

  // 分类列表（1小时）
  categories: {
    ttl: 3600,
    keys: ['all_categories'],
  },

  // 游戏详情（5分钟）
  gameDetails: {
    ttl: 300,
    keyPattern: 'game:{uuid}',
  },

  // 评论列表（1分钟）
  comments: {
    ttl: 60,
    keyPattern: 'comments:{gameUuid}:page:{page}',
  },
};
```

---

## 七、数据迁移计划

### 7.1 Phase 1: 清理现有表

```sql
-- 删除或不迁移以下表（游戏站不需要）
-- DROP TABLE IF EXISTS user_works;
-- DROP TABLE IF EXISTS user_credit_income;
-- DROP TABLE IF EXISTS user_credit_expense;

-- 保留 users 和 orders 表
```

### 7.2 Phase 2: 创建新表

**创建顺序**（考虑外键依赖）:

```
1. users (已存在，补充字段)
2. categories
3. tags
4. games
5. gamesToCategories (关联表)
6. gamesToTags (关联表)
7. featuredTypes
8. featuredGames
9. comments
10. userGameInteractions
11. commentInteractions
12. reports
13. activityLogs
14. siteSettings
```

### 7.3 Phase 3: 初始数据

```sql
-- 插入默认分类
INSERT INTO categories (uuid, slug, name, icon) VALUES
  ('cat-uuid-001', 'action', 'Action', '🎮'),
  ('cat-uuid-002', 'puzzle', 'Puzzle', '🧩'),
  ('cat-uuid-003', 'adventure', 'Adventure', '🗺️'),
  ('cat-uuid-004', 'sports', 'Sports', '⚽'),
  ('cat-uuid-005', 'racing', 'Racing', '🏎️');

-- 插入 Featured 类型
INSERT INTO featured_types (uuid, slug, name, update_rule) VALUES
  ('feat-uuid-001', 'hot', 'Hot Games', 'hot_score'),
  ('feat-uuid-002', 'new', 'New Games', 'latest'),
  ('feat-uuid-003', 'popular', 'Popular Games', 'play_count'),
  ('feat-uuid-004', 'best', 'Best Rated', 'rating');
```

---

## 八、总体评分与建议

### 8.1 各表评分汇总

| 表名           | 原始设计评分 | 改进后评分 | 说明                |
| -------------- | ------------ | ---------- | ------------------- |
| Detail (games) | ⭐⭐⭐       | ⭐⭐⭐⭐⭐ | 需要大量补充字段    |
| Comment        | ⭐⭐         | ⭐⭐⭐⭐⭐ | 缺少关键字段        |
| Introduction   | ⭐⭐         | ⭐⭐⭐⭐   | 建议合并到 games 表 |
| Category       | ⭐⭐⭐       | ⭐⭐⭐⭐⭐ | 需要补充管理字段    |
| Tag            | ⭐⭐⭐       | ⭐⭐⭐⭐⭐ | 简化内容字段        |
| Featured       | ⭐⭐         | ⭐⭐⭐⭐⭐ | 需要重新设计        |
| 缺失表         | ❌           | ⭐⭐⭐⭐⭐ | 必须补充            |

### 8.2 核心问题总结

**严重问题（P0 - 必须修复）**:

1. ❌ `games.categories` 和 `games.tags` 数组字段 → 使用关联表
2. ❌ `comments` 缺少 `gameUuid` 字段 → 必须添加
3. ❌ `featured` 数组字段 → 使用关联表
4. ❌ 所有表缺少 `slug` 字段 → 必须添加（SEO关键）

**重要问题（P1 - 应该修复）**:

1. ⚠️ 缺少用户互动表 → 影响个性化功能
2. ⚠️ 缺少审核状态管理 → 影响内容质量
3. ⚠️ 缺少非规范化计数器 → 影响性能

**次要问题（P2 - 可以优化）**:

1. ⚠️ `introduction` 表独立 → 建议合并
2. ⚠️ 缺少操作日志 → 影响安全审计
3. ⚠️ 缺少举报管理 → 影响内容监管

### 8.3 最终建议

**立即执行（0-1周）**:

1. ✅ 修正数组字段设计，创建关联表
2. ✅ 为所有表添加 `slug` 字段
3. ✅ 补充 `games` 表缺失字段
4. ✅ 修正 `comments` 表设计
5. ✅ 重新设计 `featured` 表结构

**1个月内执行**:

1. 🎯 创建用户互动表
2. 🎯 创建评论互动表
3. 🎯 实现非规范化计数器更新逻辑
4. 🎯 添加必要的索引

**3个月内考虑**:

1. 🚀 实现操作日志系统
2. 🚀 实现举报管理系统
3. 🚀 引入缓存层（KV Store）
4. 🚀 数据库性能监控

### 8.4 Drizzle ORM 实践建议

**使用 Relations API**:

```typescript
// 定义关系
export const gamesRelations = relations(games, ({ many }) => ({
  categories: many(gamesToCategories),
  tags: many(gamesToTags),
  comments: many(comments),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  games: many(gamesToCategories),
}));

// 查询示例
const gameWithCategories = await db.query.games.findFirst({
  where: eq(games.slug, 'super-mario-run'),
  with: {
    categories: {
      with: {
        category: true,
      },
    },
  },
});
```

**使用事务**:

```typescript
// 创建游戏 + 关联分类（原子操作）
await db.transaction(async (tx) => {
  // 插入游戏
  const [newGame] = await tx
    .insert(games)
    .values({
      uuid: generateUuid(),
      slug: 'new-game',
      name: 'New Game',
      // ...
    })
    .returning();

  // 插入关联
  await tx.insert(gamesToCategories).values([
    { gameUuid: newGame.uuid, categoryUuid: 'cat-001' },
    { gameUuid: newGame.uuid, categoryUuid: 'cat-002' },
  ]);
});
```

---

## 九、完整的数据库 ER 图

```
┌─────────────┐         ┌──────────────────┐         ┌──────────────┐
│   users     │────────<│ userGameInter... │>────────│    games     │
│             │         └──────────────────┘         │              │
│ - uuid (PK) │                                      │ - uuid (PK)  │
│ - email     │                                      │ - slug (UK)  │
│ - role      │                                      │ - name       │
└─────────────┘                                      │ - status     │
       │                                             │ - playCount  │
       │                                             └──────────────┘
       │                                                     │
       │                                                     │
       │         ┌──────────────────┐                       │
       └────────<│    comments      │>──────────────────────┘
                 │                  │
                 │ - uuid (PK)      │
                 │ - gameUuid (FK)  │
                 │ - userUuid (FK)  │
                 │ - content        │
                 │ - moderationStatus│
                 └──────────────────┘
                         │
                         │
                         │
                 ┌──────────────────┐
                 │ commentInter...  │
                 │                  │
                 │ - commentUuid    │
                 │ - userUuid       │
                 │ - interactionType│
                 └──────────────────┘


┌──────────────┐         ┌──────────────────┐         ┌──────────────┐
│  categories  │────────<│ gamesToCateg...  │>────────│    games     │
│              │         └──────────────────┘         │              │
│ - uuid (PK)  │                                      │ - uuid (PK)  │
│ - slug (UK)  │                                      │ - slug (UK)  │
│ - name       │                                      └──────────────┘
│ - gameCount  │                                              │
└──────────────┘                                              │
                                                              │
┌──────────────┐         ┌──────────────────┐               │
│     tags     │────────<│  gamesToTags     │>──────────────┘
│              │         └──────────────────┘
│ - uuid (PK)  │
│ - slug (UK)  │
│ - name       │
│ - gameCount  │
└──────────────┘


┌──────────────┐         ┌──────────────────┐         ┌──────────────┐
│featuredTypes │────────<│  featuredGames   │>────────│    games     │
│              │         │                  │         │              │
│ - uuid (PK)  │         │ - featuredType...│         │ - uuid (PK)  │
│ - slug (UK)  │         │ - gameUuid       │         └──────────────┘
│ - name       │         │ - rank           │
│ - updateRule │         │ - score          │
└──────────────┘         └──────────────────┘


┌──────────────┐
│   reports    │
│              │
│ - uuid (PK)  │
│ - resourceType│
│ - resourceUuid│
│ - reason     │
│ - status     │
└──────────────┘

┌──────────────┐
│activityLogs  │
│              │
│ - uuid (PK)  │
│ - userUuid   │
│ - action     │
│ - resourceType│
│ - resourceUuid│
└──────────────┘
```

---

## 十、SQL 迁移脚本示例

```sql
-- migration_001_create_games_table.sql
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  thumbnail TEXT NOT NULL,
  source TEXT NOT NULL,
  metadata_title TEXT,
  metadata_description TEXT,
  view_count INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'unpublished', 'deleted')),
  aspect_ratio TEXT DEFAULT '16:9',
  platform TEXT DEFAULT '["desktop","mobile"]',
  introduction TEXT,
  how_to_play TEXT,
  features TEXT,
  published_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER
);

-- 创建索引
CREATE UNIQUE INDEX games_uuid_idx ON games(uuid);
CREATE UNIQUE INDEX games_slug_idx ON games(slug);
CREATE INDEX games_status_idx ON games(status);
CREATE INDEX games_rating_idx ON games(rating);
CREATE INDEX games_play_count_idx ON games(play_count);
CREATE INDEX games_published_at_idx ON games(published_at);
CREATE INDEX games_status_published_idx ON games(status, published_at);
```

---

**下一步**: 继续审阅技术架构设计。
