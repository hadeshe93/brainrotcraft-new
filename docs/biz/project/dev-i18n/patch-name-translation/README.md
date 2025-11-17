# 翻译表添加 `name` 字段 - 完整改造清单

## 问题描述

**核心缺陷**: 分类（Category）、标签（Tag）、特性合集（Featured）的翻译表缺少 `name` 字段，导致这些内容类型在不同语言下无法实现名称本地化，始终显示英文名称。

**影响范围**:
- 用户在非英语环境下看到的分类/标签/特性合集名称仍是英文
- 无法为不同市场提供本地化的分类/标签名称
- SEO 效果受限

## 涉及的翻译表

1. `category_translations` - 分类翻译表
2. `tag_translations` - 标签翻译表
3. `featured_translations` - 特性合集翻译表

## 完整修改清单

### 1️⃣ 数据库层 (Database Schema & Migration)

#### 1.1 Schema 定义
**文件**: `src/db/schema.ts`

修改三个翻译表，添加 `name` 字段：

```typescript
// L643-664: categoryTranslations
export const categoryTranslations = sqliteTable('category_translations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryUuid: text('category_uuid').notNull(),
  locale: text('locale').notNull(),
  name: text('name').notNull(),  // ✅ 新增
  metadataTitle: text('metadata_title').notNull(),
  metadataDescription: text('metadata_description').notNull(),
  content: text('content'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
});

// L667-688: tagTranslations - 同样添加 name 字段
// L691-712: featuredTranslations - 同样添加 name 字段
```

#### 1.2 数据库迁移
**操作**: 生成并应用 migration

```bash
# 生成 migration
pnpm drizzle:generate

# 本地应用
pnpm d1:apply

# 生产环境应用
pnpm d1:apply:remote
```

**注意事项**:
- Migration 需要设置 `name` 字段为 `NOT NULL`
- 对于已存在的翻译记录，需要设置默认值（可以使用对应的英文 name）

---

### 2️⃣ 类型定义层 (Type Definitions)

#### 2.1 翻译字段类型
**文件**: `src/services/i18n/types.ts` (L18-22)

```typescript
export interface SeoTranslationFields {
  name?: string;  // ✅ 新增 - 注意：设为可选以兼容旧代码
  metadataTitle: string;
  metadataDescription: string;
  content?: string;
}
```

**影响**: 所有使用 `SeoTranslationFields` 的地方都会自动支持 `name` 字段

---

### 3️⃣ 共享逻辑层 (Shared Translation Logic)

#### 3.1 翻译字段定义
**文件**: `src/lib/translation-completeness.ts` (L9-15)

```typescript
export const TRANSLATABLE_FIELDS: Record<string, string[]> = {
  category: ['name', 'metadataTitle', 'metadataDescription', 'content'],  // ✅ 添加 'name'
  tag: ['name', 'metadataTitle', 'metadataDescription', 'content'],       // ✅ 添加 'name'
  featured: ['name', 'metadataTitle', 'metadataDescription', 'content'],  // ✅ 添加 'name'
  introduction: ['metadataTitle', 'metadataDescription', 'content'],
  game: ['name'],
} as const;
```

#### 3.2 翻译获取函数
**文件**: `src/services/i18n/translation.ts` (L184-195)

```typescript
// getAllTranslations 函数需要返回 name 字段
for (const translation of translations) {
  result[(translation as any).locale] = {
    name: (translation as any).name,  // ✅ 新增
    metadataTitle: (translation as any).metadataTitle,
    metadataDescription: (translation as any).metadataDescription,
    content: (translation as any).content,
  };
}
```

---

### 4️⃣ 服务层 (Service Layer)

#### 4.1 分类服务
**文件**: `src/services/content/categories.ts`

**修改点 1**: `createCategory` 函数 (L51-95)
```typescript
// L76-89: 保存翻译时包含 name
if (translation.name || translation.metadataTitle || ...) {
  await upsertTranslation(
    categoryTranslations,
    categoryTranslations.categoryUuid,
    categoryTranslations.locale,
    uuid,
    locale,
    {
      name: translation.name || input.name,  // ✅ 新增 - 如果未提供翻译，使用默认名称
      metadataTitle: translation.metadataTitle || '',
      metadataDescription: translation.metadataDescription || '',
      content: translation.content,
    },
    db,
  );
}
```

**修改点 2**: `getCategoryByUuidWithLocale` 函数 (L120-146)
```typescript
// L132 和 L145: mergeWithTranslation 的字段列表
return mergeWithTranslation(
  category,
  translation,
  locale,
  ['name', 'metadataTitle', 'metadataDescription', 'content']  // ✅ 添加 'name'
);
```

**修改点 3**: `getCategoryBySlugWithLocale` 函数 (L171-197)
```typescript
// L183 和 L196: 同上
return mergeWithTranslation(
  category,
  translation,
  locale,
  ['name', 'metadataTitle', 'metadataDescription', 'content']  // ✅ 添加 'name'
);
```

**修改点 4**: `getCategoryWithAllTranslations` 函数 (L293-311)
```typescript
// L301-305: 默认语言的翻译包含 name
translations[DEFAULT_LOCALE] = {
  name: category.name,  // ✅ 新增
  metadataTitle: category.metadataTitle,
  metadataDescription: category.metadataDescription,
  content: category.content || undefined,
};
```

**修改点 5**: `updateCategory` 函数 (L316-373)
```typescript
// L342-344 和 L362-366: 更新翻译时包含 name
if (translation.name !== undefined) defaultUpdate.name = translation.name;

await upsertTranslation(
  categoryTranslations,
  categoryTranslations.categoryUuid,
  categoryTranslations.locale,
  uuid,
  locale,
  {
    name: translation.name || '',  // ✅ 新增
    metadataTitle: translation.metadataTitle || '',
    metadataDescription: translation.metadataDescription || '',
    content: translation.content,
  },
  db,
);
```

#### 4.2 标签服务
**文件**: `src/services/content/tags.ts`

所有修改点与 `categories.ts` 完全相同，替换为对应的 tag 相关表和字段：
- `createTag`
- `getTagByUuidWithLocale`
- `getTagBySlugWithLocale`
- `getTagWithAllTranslations`
- `updateTag`

#### 4.3 特性合集服务
**文件**: `src/services/content/featured.ts`

所有修改点与 `categories.ts` 完全相同，替换为对应的 featured 相关表和字段：
- `createFeatured`
- `getFeaturedByUuidWithLocale`
- `getFeaturedBySlugWithLocale`
- `getFeaturedWithAllTranslations`
- `updateFeatured`

#### 4.4 翻译生成器
**文件**: `src/services/content/translation-generator.ts`

**修改点 1**: `getSourceContent` 函数 - Category 部分 (L42-63)
```typescript
case 'category': {
  const result = await db
    .prepare('SELECT uuid, name, metadata_title, metadata_description, content FROM categories WHERE uuid = ? AND deleted_at IS NULL')
    .bind(contentUuid)
    .first();

  if (!result) throw new Error('Category not found');

  return {
    name: result.name as string,
    fields: {
      name: result.name as string,  // ✅ 新增 - name 也需要翻译
      metadataTitle: (result.metadata_title as string) || (result.name as string),
      metadataDescription: (result.metadata_description as string) || '',
      content: (result.content as string) || '',
    },
    context: 'This is a game category name and description for SEO purposes.',
  };
}
```

**修改点 2**: Tag 部分 (L65-86) - 同上
**修改点 3**: Featured 部分 (L88-109) - 同上

**修改点 4**: AI 翻译调用 (L186-216)
```typescript
// 对于 category/tag/featured，也需要单独翻译 name
if ((contentType === 'category' || contentType === 'tag' || contentType === 'featured') && textsToTranslate.name) {
  // 使用与游戏名称相同的翻译方法
  const translatedName = await translateGameName(textsToTranslate.name, languageRecord.englishName);
  translations.name = translatedName;
}
```

#### 4.5 批量翻译处理器
**文件**: `src/services/translation/processor.ts`

**修改点 1**: `translateCategories` 函数 (约 L250-300)
```typescript
// 获取现有翻译时，确保包含 name 字段
const translations = await getAllTranslations(
  categoryTranslations,
  categoryTranslations.categoryUuid,
  categoryUuid,
  db,
);
const existing = translations[languageCode] || null;

// 检查完整性
const sourceContent = {
  name: categoryName,  // ✅ 确保包含
  metadataTitle: /* ... */,
  metadataDescription: /* ... */,
  content: /* ... */,
};

const translationComplete = isTranslationComplete(
  sourceContent,
  existing,
  TRANSLATABLE_FIELDS.category,  // 已包含 'name'
);

// 如果需要翻译，生成翻译
if (!translationComplete) {
  const result = await generateTranslation(
    { contentType: 'category', contentUuid: categoryUuid, targetLocale: languageCode },
    db,
  );

  // 保存翻译（包含 name）
  await upsertTranslation(
    categoryTranslations,
    categoryTranslations.categoryUuid,
    categoryTranslations.locale,
    categoryUuid,
    languageCode,
    {
      name: result.translations.name || categoryName,  // ✅ 新增
      metadataTitle: result.translations.metadataTitle || /* ... */,
      metadataDescription: result.translations.metadataDescription || /* ... */,
      content: result.translations.content || /* ... */,
    },
    db,
  );
}
```

**修改点 2**: `translateTags` 函数 - 同上模式
**修改点 3**: `translateFeatured` 函数 - 同上模式

#### 4.6 翻译审计
**文件**: `src/services/content/translation-audit.ts`

确保审计逻辑正确检查 `name` 字段的翻译完成度（由于使用了 `TRANSLATABLE_FIELDS`，应该自动支持）

---

### 5️⃣ API 层 (API Routes)

#### 5.1 分类 API
**文件**: `src/app/api/admin/categories/route.ts`

- **POST**: 创建分类时，`translations` 对象中的每个 locale 应支持 `name` 字段
- **GET**: 列表返回时，确保翻译数据包含 `name`

**文件**: `src/app/api/admin/categories/[uuid]/route.ts`

- **GET**: 获取单个分类时，翻译数据包含 `name`
- **PUT**: 更新时，处理 `translations[locale].name`

#### 5.2 标签 API
类似分类 API 的修改

#### 5.3 特性合集 API
类似分类 API 的修改

---

### 6️⃣ CMS 前端组件层 (Admin UI)

#### 6.1 分类管理
**文件**: `src/components/admin/taxonomy-management.tsx`

**修改要点**:
- 新增/编辑弹窗中，每个语言标签页添加 `name` 字段输入
- 表单数据结构包含 `translations[locale].name`
- 保存时提交完整的翻译数据

```typescript
// 表单结构示例
{
  // 默认语言（英文）
  name: "Action",
  metadataTitle: "Action Games",
  // ...

  // 其他语言翻译
  translations: {
    zh: {
      name: "动作",  // ✅ 新增字段
      metadataTitle: "动作游戏",
      metadataDescription: "...",
      content: "...",
    },
    ja: {
      name: "アクション",  // ✅ 新增字段
      metadataTitle: "アクションゲーム",
      // ...
    }
  }
}
```

#### 6.2 标签管理
**文件**: 需要找到对应的管理组件（可能在 `src/components/admin/` 或 `src/app/[locale]/admin/tags/` 中）

同样的修改模式

#### 6.3 特性合集管理
**文件**: 需要找到对应的管理组件

同样的修改模式

#### 6.4 翻译审计仪表盘
**文件**: `src/components/admin/translation-dashboard.tsx`

- 显示翻译缺失详情时，`name` 字段应出现在缺失字段列表中
- 完成度计算应包含 `name` 字段

---

### 7️⃣ 前端展示层 (Frontend Display)

#### 7.1 数据获取和显示

所有使用以下函数获取数据的页面/组件都需要确认正确显示翻译后的 `name`:

- `getCategoryBySlugWithLocale` - 分类详情页
- `getTagBySlugWithLocale` - 标签详情页
- `getFeaturedBySlugWithLocale` - 特性合集详情页
- 任何分类/标签/特性合集列表组件

**关键点**:
- 使用 `category._locale` 判断是否是翻译版本
- 优先使用翻译后的 `name`，如果不存在则回退到英文 `name`
- `mergeWithTranslation` 已经处理了回退逻辑

---

### 8️⃣ 数据迁移和兼容性

#### 8.1 旧数据处理

**问题**: 已有的翻译记录没有 `name` 字段

**解决方案**:

**方案 1 - Migration 设置默认值**:
```sql
-- 在 migration 中，为已存在的翻译记录设置 name = 对应英文名称
UPDATE category_translations
SET name = (
  SELECT name FROM categories
  WHERE categories.uuid = category_translations.category_uuid
);

-- 类似地处理 tag_translations 和 featured_translations
```

**方案 2 - 应用层处理**:
- 在读取旧数据时，如果 `translation.name` 为空，使用英文名称作为回退
- 修改 `mergeWithTranslation` 或 `getAllTranslations` 逻辑

#### 8.2 向后兼容性

**API 兼容性**:
- `SeoTranslationFields.name` 设为可选字段 (`name?: string`)
- 现有 API 调用不会因为缺少 `name` 而失败

**逐步迁移策略**:
1. 先部署代码（支持 `name` 字段但不强制）
2. 运行数据迁移脚本
3. 后续创建/更新操作自动包含 `name` 字段

---

## 实施顺序建议

1. **Phase 1 - 基础设施** (P0)
   - 1️⃣ 数据库 Schema + Migration
   - 2️⃣ 类型定义
   - 3️⃣ 共享逻辑层

2. **Phase 2 - 后端服务** (P0)
   - 4️⃣ 服务层（categories, tags, featured, translation-generator, processor, audit）
   - 5️⃣ API 层

3. **Phase 3 - 前端界面** (P1)
   - 6️⃣ CMS 管理组件
   - 7️⃣ 前端展示页面

4. **Phase 4 - 数据迁移** (P1)
   - 8️⃣ 旧数据迁移脚本
   - 验证和测试

---

## 测试清单

### 单元测试
- [ ] `TRANSLATABLE_FIELDS` 包含 `name`
- [ ] `isTranslationComplete` 正确检查 `name` 字段
- [ ] `getAllTranslations` 返回 `name` 字段

### 集成测试
- [ ] 创建分类时保存 `name` 翻译
- [ ] 更新分类时更新 `name` 翻译
- [ ] 获取翻译数据时包含 `name`
- [ ] 批量翻译正确处理 `name` 字段
- [ ] 翻译审计正确统计 `name` 缺失情况

### 端到端测试
- [ ] CMS 创建分类 → 保存成功 → 前端显示翻译名称
- [ ] CMS 编辑分类 → 修改翻译名称 → 前端更新显示
- [ ] 自动翻译功能生成 `name` 翻译
- [ ] 翻译审计仪表盘显示 `name` 缺失
- [ ] 不同语言环境下显示对应的 `name`

### 数据验证
- [ ] 旧翻译记录的 `name` 字段已填充
- [ ] 新创建的翻译记录包含 `name`
- [ ] 不同 locale 的 `name` 不同

---

## 风险和注意事项

### 🔴 高风险
1. **数据库迁移**: 添加 NOT NULL 字段到已有数据，必须正确设置默认值
2. **API 兼容性**: 确保旧版本客户端仍能正常工作
3. **翻译成本**: `name` 字段的翻译会增加 API 调用次数和成本

### 🟡 中风险
1. **CMS 表单复杂度**: 每个语言标签页增加字段，UI 可能更复杂
2. **数据一致性**: 确保所有新建/更新操作都包含 `name` 翻译
3. **性能影响**: `getAllTranslations` 返回更多数据，可能影响性能

### 🟢 低风险
1. **类型安全**: TypeScript 会捕获大部分遗漏的字段
2. **回退机制**: `mergeWithTranslation` 已有完善的回退逻辑

---

## 补充说明

### 为什么 `name` 不在主表而在翻译表？

**主表 (categories/tags/featured)**:
- `name` 字段存储默认语言（英文）的名称
- 这是"源数据"

**翻译表 (*_translations)**:
- `name` 字段存储其他语言的翻译名称
- 这是"翻译数据"

这种设计与现有的 `metadataTitle`、`metadataDescription`、`content` 字段一致。

### 与游戏翻译的对比

**游戏 (Game)**:
- `name` 存储在主表的 JSON 字段中: `games.name->"[locale]"`
- `introduction` 的翻译存储在 `introduction_translations` 表

**分类/标签/特性合集**:
- `name` 存储在主表: `categories.name` (英文)
- `name` 的翻译存储在翻译表: `category_translations.name` (其他语言)

两种模式各有优劣，本项目采用第二种模式以保持一致性。

---

## 相关文档

- [翻译审计统计系统架构](../clarify-audit-translation/architecture.md)
- [翻译完成度计算规则](../clarify-audit-translation/README.md)

---

**文档版本**: v1.0
**创建日期**: 2025-01-14
**最后更新**: 2025-01-14
