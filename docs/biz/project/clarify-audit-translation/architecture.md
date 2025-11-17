# 翻译审计统计架构文档

## 概述

本文档详细说明项目中翻译完成度统计的实现架构，包括核心文件、数据流、CMS 页面展示等。

---

## 📊 核心文件架构

### 1. 核心服务层 (数据计算逻辑)

#### `src/services/content/translation-audit.ts` ⭐️ 核心文件

**功能**: 翻译完成度审计的核心逻辑

**主要函数**:

##### `auditTranslations(options, db): Promise<TranslationAuditResponse>`
- **功能**: 主函数，审计所有内容类型的翻译完成度
- **参数**:
  - `options.contentTypes?: ContentType[]` - 过滤内容类型
  - `options.locales?: string[]` - 过滤语言
  - `options.status?: TranslationStatus` - 过滤翻译状态
  - `options.page?: number` - 分页参数
  - `options.pageSize?: number` - 每页数量
- **返回**:
  ```typescript
  {
    stats: {
      overall: TranslationStats,      // 全局统计
      byType: {                        // 按类型统计
        category: TranslationStats,
        tag: TranslationStats,
        featured: TranslationStats,
        game: TranslationStats         // 包含 online 统计
      }
    },
    items: ContentTranslationStatus[]  // 分页后的内容列表
  }
  ```

##### `getCategoriesWithTranslationStatus(db, languages)`
- 获取所有分类的翻译状态
- 遍历所有分类，查询每个语言的翻译表数据
- 返回包含翻译状态的分类数组

##### `getTagsWithTranslationStatus(db, languages)`
- 获取所有标签的翻译状态
- 逻辑同分类

##### `getFeaturedWithTranslationStatus(db, languages)`
- 获取所有特性集合的翻译状态
- 逻辑同分类

##### `getGamesWithTranslationStatus(db, languages, onlineOnly?)`
- 获取游戏的翻译状态
- **特殊参数**: `onlineOnly` - 是否只统计在线游戏
- **游戏翻译要求**:
  - `nameI18n` 中包含该语言的游戏名称
  - `introductions` 表中有该语言的 SEO 数据
  - 完成度计算: `name (33%) + intro SEO fields (67%)`

##### `calculateStats(items): TranslationStats`
- 计算统计数据
- **统计指标**:
  - `totalItems`: 总条目数
  - `completeItems`: 所有语言完全翻译的条目数
  - `partialItems`: 部分语言翻译的条目数
  - `missingItems`: 所有语言都未翻译的条目数
  - `byLocale`: 每个语言的统计
    - `complete`: 该语言完全翻译的条目数
    - `partial`: 该语言部分翻译的条目数
    - `missing`: 该语言未翻译的条目数

##### `calculateLocaleStatus(translation, requiredFields)`
- 计算单个语言的翻译状态
- **必填字段**: `['metadataTitle', 'metadataDescription']`
- **返回**:
  ```typescript
  {
    status: 'complete' | 'partial' | 'missing',
    completeness: 0-1,  // 完成度百分比
    missingFields?: string[]  // 缺失的字段列表
  }
  ```

**关键特性**:
1. **双层统计支持**:
   - 全部内容统计 (包括草稿、离线游戏)
   - 在线内容统计 (仅在线游戏 + 其他所有内容) - **主要焦点**

2. **游戏在线/离线分离**:
   - `getGamesWithTranslationStatus(db, languages, false)` - 所有游戏
   - `getGamesWithTranslationStatus(db, languages, true)` - 仅在线游戏
   - 在线游戏统计存储在 `stats.game.online` 和 `stats.overall.online`

---

#### `src/types/services/translation-audit.ts`

**功能**: 类型定义

**主要类型**:

```typescript
// 内容类型
export type ContentType = 'category' | 'tag' | 'featured' | 'game';

// 翻译状态
export type TranslationStatus = 'complete' | 'partial' | 'missing';

// 单个语言的翻译状态
export interface LocaleTranslationStatus {
  status: TranslationStatus;
  completeness: number;      // 0-1, 完成度百分比
  missingFields?: string[];  // 缺失的必填字段
}

// 单个内容项的翻译状态
export interface ContentTranslationStatus {
  uuid: string;
  name: string;
  slug: string;
  type: ContentType;
  translations: {
    [locale: string]: LocaleTranslationStatus;
  };
}

// 统计数据结构
export interface TranslationStats {
  totalItems: number;
  completeItems: number;
  partialItems: number;
  missingItems: number;
  byLocale: {
    [locale: string]: {
      complete: number;
      partial: number;
      missing: number;
    };
  };
  // 仅游戏 & 全局统计包含此字段
  online?: {
    totalItems: number;
    completeItems: number;
    partialItems: number;
    missingItems: number;
    byLocale: {
      [locale: string]: {
        complete: number;
        partial: number;
        missing: number;
      };
    };
  };
}

// 审计响应
export interface TranslationAuditResponse {
  stats: {
    overall: TranslationStats;
    byType: {
      [type in ContentType]: TranslationStats;
    };
  };
  items: ContentTranslationStatus[];
}

// 审计选项
export interface TranslationAuditOptions {
  contentTypes?: ContentType[];
  locales?: string[];
  status?: TranslationStatus;
  page?: number;
  pageSize?: number;
}
```

---

### 2. API 路由层 (数据接口)

#### `src/app/api/admin/translations/audit/route.ts`

**路由**: `GET /api/admin/translations/audit`

**功能**: 获取全局翻译审计数据

**查询参数**:
- `contentTypes`: 内容类型过滤，逗号分隔 (例: `category,tag,featured,game`)
- `locales`: 语言过滤，逗号分隔 (例: `en,zh,ja`)
- `status`: 状态过滤 (`complete` | `partial` | `missing`)
- `page`: 页码 (默认: 1)
- `pageSize`: 每页数量 (默认: 100, 最大: 500)

**响应示例**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "overall": {
        "totalItems": 150,
        "completeItems": 100,
        "partialItems": 30,
        "missingItems": 20,
        "byLocale": {
          "zh": { "complete": 120, "partial": 20, "missing": 10 },
          "ja": { "complete": 80, "partial": 40, "missing": 30 }
        },
        "online": {
          "totalItems": 120,
          "completeItems": 90,
          ...
        }
      },
      "byType": {
        "category": { ... },
        "tag": { ... },
        "featured": { ... },
        "game": {
          ...,
          "online": { ... }
        }
      }
    },
    "items": [...]
  },
  "message": "Translation audit completed successfully"
}
```

---

#### `src/app/api/admin/languages/[code]/audit/route.ts`

**路由**: `GET /api/admin/languages/{code}/audit`

**功能**: 获取单个语言的翻译审计数据

**路径参数**:
- `code`: 语言代码 (例: `zh`, `ja`, `ko`)

**响应格式**:
```json
{
  "success": true,
  "data": {
    "overall": {
      "totalItems": 150,
      "completeItems": 120,
      "partialItems": 20,
      "missingItems": 10,
      "completeness": 0.8,  // 120/150 = 80%
      "online": {
        "completeness": 0.85  // 在线内容完成度
      }
    },
    "byModule": {
      "games": {
        "total": 100,
        "done": 80,
        "completeness": 0.8,
        "online": {
          "total": 70,
          "done": 65
        }
      },
      "categories": {
        "total": 20,
        "done": 18,
        "completeness": 0.9
      },
      "tags": {
        "total": 25,
        "done": 20,
        "completeness": 0.8
      },
      "featured": {
        "total": 5,
        "done": 5,
        "completeness": 1.0
      }
    },
    "lastUpdated": 1704067200
  },
  "message": "Language audit completed successfully"
}
```

**特点**:
1. 仅返回指定语言的统计数据
2. 包含模块级别的详细统计
3. 提供 `completeness` 百分比 (0-1)
4. 游戏模块单独显示在线游戏统计

---

### 3. CMS 页面 (UI 展示)

#### 页面 1: 多语言管理页

**文件**: `src/app/[locale]/admin/translations/page.tsx`
**路由**: `/admin/translations`

**功能**:
- 展示所有已启用语言的概览
- 每个语言以卡片形式展示统计信息
- 提供快速操作入口

**展示内容**:

1. **页面头部**
   - 标题: "多语言管理"
   - 副标题: "已启用语言 (N)"
   - 操作按钮: "新增语言"

2. **语言卡片** (使用 `LanguageCardWithStats` 组件)
   - **卡片头部**:
     - 语言原生名称 (例: "日本語")
     - 语言代码标签 (例: "JA")
     - 操作菜单 (编辑、删除、刷新、自动翻译)

   - **分模块统计** (调用 `/api/admin/languages/{code}/audit`):
     ```
     Games:       80/100 (80%)  [进度条]
     Categories:  18/20  (90%)  [进度条]
     Tags:        20/25  (80%)  [进度条]
     Featured:     5/5  (100%)  [进度条]
     ```

   - **总体完成度**:
     ```
     Overall Progress: 80%
     [=========>  ]
     ```

   - **最后更新时间**:
     ```
     Last updated: 2 hours ago
     ```

3. **快速操作卡片**
   - 链接到 "翻译审计工具" (`/admin/translations/audit`)
   - 链接到 "翻译任务列表" (`/admin/translations/tasks`)

**核心组件**:
- `LanguageCardWithStats` - 包装组件，为每个语言获取统计数据
  - 使用 SWR 从 `/api/admin/languages/${language.code}/audit` 获取数据
  - 传递给 `LanguageCard` 组件显示

**数据流**:
```
LanguageCardWithStats
  ↓ useSWR
GET /api/admin/languages/{code}/audit
  ↓
LanguageCard 组件渲染
  - 显示分模块统计
  - 显示总体完成度
  - 提供操作按钮
```

---

#### 页面 2: 翻译审计仪表盘

**文件**: `src/app/[locale]/admin/translations/audit/page.tsx`
**路由**: `/admin/translations/audit`

**功能**:
- 全局翻译完成度概览
- 按内容类型和语言的详细统计
- 支持过滤和查看具体内容项的翻译状态

**展示内容**:

1. **页面头部**
   ```
   Translation Management
   Monitor and manage translation completeness across all content types
   ```

2. **全局统计卡片** (优先显示 online 数据)
   ```
   ┌────────────────┬────────────────┬────────────────┬────────────────┐
   │ Total Items    │ Complete       │ Partial        │ Missing        │
   │ 150            │ 120 (80%)      │ 20 (13%)       │ 10 (7%)        │
   │ (Online focus) │                │                │                │
   └────────────────┴────────────────┴────────────────┴────────────────┘
   ```
   - 如果有 online 数据，优先显示
   - 标注 "(Online focus)" 表示主要关注在线内容

3. **过滤器**
   ```
   Content Type: [All ▼]  [Category] [Tag] [Featured] [Game]
   Status:       [All ▼]  [Complete] [Partial] [Missing]
   ```

4. **按内容类型统计** (Tabs)
   ```
   [All] [Categories] [Tags] [Featured] [Games]

   Category Statistics:
   Total: 20  |  Complete: 18 (90%)  |  Partial: 2 (10%)  |  Missing: 0 (0%)
   ```
   - 每个 tab 显示该类型的统计
   - 游戏 tab 额外显示 online 游戏统计

5. **按语言统计**
   ```
   Chinese (zh)   [=================>    ] 90%  (180/200)
   Japanese (ja)  [==============>       ] 80%  (160/200)
   Korean (ko)    [=========>            ] 60%  (120/200)
   ```
   - 每个语言显示进度条
   - 显示完成数/总数
   - 可点击查看该语言的详细信息

6. **内容项列表** (可过滤)
   ```
   ┌──────────────┬──────┬───────────────────────────────┐
   │ Name         │ Type │ Translations                  │
   ├──────────────┼──────┼───────────────────────────────┤
   │ Action       │ CAT  │ EN✓ ZH✓ JA✓ KO⚠️             │
   │ Adventure    │ CAT  │ EN✓ ZH✓ JA⚠️ KO✗             │
   │ Super Mario  │ GAME │ EN✓ ZH✓ JA✓ KO✓              │
   └──────────────┴──────┴───────────────────────────────┘

   Legend: ✓ Complete  ⚠️ Partial  ✗ Missing
   ```
   - 显示每个内容项在各语言中的翻译状态
   - 支持分页
   - 点击可查看/编辑翻译

**核心组件**:
- `TranslationDashboard` (`src/components/admin/translation-dashboard.tsx`)
  - 使用 SWR 从 `/api/admin/translations/audit` 获取数据
  - 根据过滤器动态构建 API URL
  - 渲染统计卡片、图表和内容列表

**数据流**:
```
TranslationDashboard
  ↓ useSWR
GET /api/admin/translations/audit?contentTypes=...&status=...
  ↓
渲染仪表盘
  - 全局统计卡片
  - 按类型统计 (Tabs)
  - 按语言统计 (进度条)
  - 内容项列表 (表格)
```

---

## 📈 完整数据流

```
┌─────────────────────────────────────────────────────────────┐
│                         数据库 (D1)                          │
│  - categories, categoryTranslations                         │
│  - tags, tagTranslations                                    │
│  - featured, featuredTranslations                           │
│  - games, introductions, introductionTranslations           │
│  - languages                                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              核心服务 (translation-audit.ts)                 │
│  - auditTranslations() 主函数                               │
│  - getXxxWithTranslationStatus() 获取各类型数据             │
│  - calculateStats() 计算统计                                │
│  - calculateLocaleStatus() 计算单语言状态                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        API 路由层                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ GET /api/admin/translations/audit                    │  │
│  │ - 全局审计                                           │  │
│  │ - 支持过滤 (contentTypes, locales, status)          │  │
│  │ - 支持分页                                           │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ GET /api/admin/languages/{code}/audit                │  │
│  │ - 单语言审计                                         │  │
│  │ - 返回分模块统计                                     │  │
│  │ - 包含 completeness 百分比                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        CMS 页面层                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ /admin/translations                                  │  │
│  │ - 多语言管理                                         │  │
│  │ - 语言卡片视图                                       │  │
│  │ - 每个语言显示分模块统计                             │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ /admin/translations/audit                            │  │
│  │ - 翻译审计仪表盘                                     │  │
│  │ - 全局统计概览                                       │  │
│  │ - 按类型/语言详细统计                                │  │
│  │ - 内容项翻译状态列表                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 关键特性

### 1. 双层统计系统

**目的**: 区分所有内容和在线内容的翻译完成度

**实现**:
- **All content**: 包括所有内容（草稿、离线、在线游戏 + 其他所有内容）
- **Online focus**: 仅在线游戏 + 其他所有内容（主要焦点）

**数据结构**:
```typescript
TranslationStats {
  totalItems: 150,        // 所有内容
  completeItems: 100,
  ...
  online?: {              // 在线内容统计
    totalItems: 120,
    completeItems: 90,
    ...
  }
}
```

**应用场景**:
- 全局统计 (`stats.overall.online`)
- 游戏类型统计 (`stats.byType.game.online`)
- CMS 页面优先显示 online 数据

---

### 2. 完成度计算规则

#### 必填字段定义
```typescript
const REQUIRED_SEO_FIELDS = ['metadataTitle', 'metadataDescription'];
```

#### 分类/标签/特性
- **必填**: `metadataTitle`, `metadataDescription`
- **完成度**: (已填字段数 / 2)

#### 游戏
- **必填**:
  - 游戏名称: `nameI18n[locale]`
  - 介绍 SEO: `metadataTitle`, `metadataDescription` (从 introductions 表)
- **完成度计算**:
  ```typescript
  const nameCompleteness = hasName ? 0.33 : 0;
  const introCompleteness = introStatus.completeness * 0.67;
  const totalCompleteness = nameCompleteness + introCompleteness;
  ```

#### 状态判定
```typescript
if (missingFields.length === 0) {
  status = 'complete';     // 全部填写
  completeness = 1.0;
} else if (missingFields.length === requiredFields.length) {
  status = 'missing';      // 全部缺失
  completeness = 0.0;
} else {
  status = 'partial';      // 部分填写
  completeness = 1 - (missingFields.length / requiredFields.length);
}
```

---

### 3. 实时数据更新

#### 数据获取策略
- 使用 **SWR** 进行数据获取和缓存
- 自动重新验证和刷新

#### 手动刷新
```typescript
// 刷新单个语言的审计数据
await mutate(`/api/admin/languages/${language.code}/audit`);

// 刷新全局审计数据
await mutate(`/api/admin/translations/audit?${params}`);
```

#### 缓存策略
- 语言卡片: 独立缓存每个语言的统计数据
- 审计仪表盘: 根据过滤参数缓存不同的查询结果

---

## 📝 使用示例

### 示例 1: 获取中文翻译统计

```bash
GET /api/admin/languages/zh/audit
```

响应:
```json
{
  "success": true,
  "data": {
    "overall": {
      "totalItems": 150,
      "completeItems": 135,
      "completeness": 0.9,
      "online": {
        "completeness": 0.95
      }
    },
    "byModule": {
      "games": {
        "total": 100,
        "done": 90,
        "completeness": 0.9,
        "online": {
          "total": 70,
          "done": 68
        }
      },
      "categories": {
        "total": 20,
        "done": 20,
        "completeness": 1.0
      },
      ...
    }
  }
}
```

### 示例 2: 查询缺失翻译的游戏

```bash
GET /api/admin/translations/audit?contentTypes=game&status=missing&locales=ja
```

响应:
```json
{
  "success": true,
  "data": {
    "stats": { ... },
    "items": [
      {
        "uuid": "game-uuid-1",
        "name": "Super Mario",
        "slug": "super-mario",
        "type": "game",
        "translations": {
          "en": { "status": "complete", "completeness": 1 },
          "ja": {
            "status": "missing",
            "completeness": 0,
            "missingFields": ["name", "metadataTitle", "metadataDescription"]
          }
        }
      },
      ...
    ]
  }
}
```

---

## 🔧 扩展指南

### 添加新的内容类型

1. **更新类型定义** (`src/types/services/translation-audit.ts`):
   ```typescript
   export type ContentType = 'category' | 'tag' | 'featured' | 'game' | 'newtype';
   ```

2. **实现获取函数** (`src/services/content/translation-audit.ts`):
   ```typescript
   async function getNewTypeWithTranslationStatus(
     db: D1Database,
     languages: LanguageItem[]
   ): Promise<ContentTranslationStatus[]> {
     // 实现逻辑
   }
   ```

3. **集成到主函数**:
   ```typescript
   if (contentTypesToFetch.includes('newtype')) {
     const newTypeItems = await getNewTypeWithTranslationStatus(db, languages);
     allItems.push(...newTypeItems);
   }
   ```

### 自定义完成度计算

修改 `calculateLocaleStatus` 函数以支持不同的必填字段:

```typescript
function calculateLocaleStatus(
  translation: Record<string, any> | null,
  requiredFields: string[] = REQUIRED_SEO_FIELDS,
  customWeights?: Record<string, number>  // 新增权重参数
): LocaleTranslationStatus {
  // 使用权重计算完成度
  if (customWeights) {
    const totalWeight = Object.values(customWeights).reduce((a, b) => a + b, 0);
    const filledWeight = Object.entries(customWeights)
      .filter(([field]) => translation?.[field])
      .reduce((sum, [, weight]) => sum + weight, 0);

    return {
      status: filledWeight === totalWeight ? 'complete' :
              filledWeight > 0 ? 'partial' : 'missing',
      completeness: filledWeight / totalWeight,
      missingFields: requiredFields.filter(f => !translation?.[f])
    };
  }

  // 原有逻辑...
}
```

---

## 📚 相关文档

- [多语言实现方案](../dev-i18n/)
- [翻译任务系统](../dev-i18n/phase-6-translation-tasks.md)
- [数据库 Schema](../../../db/schema.md)

---

## 更新日志

- 2025-01-14: 初始版本，记录当前翻译审计统计架构
