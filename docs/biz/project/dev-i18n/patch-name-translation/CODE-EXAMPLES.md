# 翻译表添加 `name` 字段 - 代码示例

本文档提供关键修改点的代码示例，方便复制粘贴和参考。

---

## 1️⃣ 数据库 Schema

### src/db/schema.ts

```typescript
// L643-664: Category Translations
export const categoryTranslations = sqliteTable(
  'category_translations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    categoryUuid: text('category_uuid').notNull(),
    locale: text('locale').notNull(),
    name: text('name').notNull(),  // ✅ 添加此行
    metadataTitle: text('metadata_title').notNull(),
    metadataDescription: text('metadata_description').notNull(),
    content: text('content'),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uniqueTranslation: uniqueIndex('category_translations_unique').on(table.categoryUuid, table.locale),
    categoryUuidIdx: index('category_translations_uuid_idx').on(table.categoryUuid),
    localeIdx: index('category_translations_locale_idx').on(table.locale),
  }),
);

// L667-688: Tag Translations
export const tagTranslations = sqliteTable(
  'tag_translations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tagUuid: text('tag_uuid').notNull(),
    locale: text('locale').notNull(),
    name: text('name').notNull(),  // ✅ 添加此行
    metadataTitle: text('metadata_title').notNull(),
    metadataDescription: text('metadata_description').notNull(),
    content: text('content'),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uniqueTranslation: uniqueIndex('tag_translations_unique').on(table.tagUuid, table.locale),
    tagUuidIdx: index('tag_translations_uuid_idx').on(table.tagUuid),
    localeIdx: index('tag_translations_locale_idx').on(table.locale),
  }),
);

// L691-712: Featured Translations
export const featuredTranslations = sqliteTable(
  'featured_translations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    featuredUuid: text('featured_uuid').notNull(),
    locale: text('locale').notNull(),
    name: text('name').notNull(),  // ✅ 添加此行
    metadataTitle: text('metadata_title').notNull(),
    metadataDescription: text('metadata_description').notNull(),
    content: text('content'),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uniqueTranslation: uniqueIndex('featured_translations_unique').on(table.featuredUuid, table.locale),
    featuredUuidIdx: index('featured_translations_uuid_idx').on(table.featuredUuid),
    localeIdx: index('featured_translations_locale_idx').on(table.locale),
  }),
);
```

---

## 2️⃣ 类型定义

### src/services/i18n/types.ts

```typescript
// L18-22
export interface SeoTranslationFields {
  name?: string;  // ✅ 添加此行
  metadataTitle: string;
  metadataDescription: string;
  content?: string;
}
```

---

## 3️⃣ 共享逻辑

### src/lib/translation-completeness.ts

```typescript
// L9-15
export const TRANSLATABLE_FIELDS: Record<string, string[]> = {
  category: ['name', 'metadataTitle', 'metadataDescription', 'content'],  // ✅ 添加 'name'
  tag: ['name', 'metadataTitle', 'metadataDescription', 'content'],       // ✅ 添加 'name'
  featured: ['name', 'metadataTitle', 'metadataDescription', 'content'],  // ✅ 添加 'name'
  introduction: ['metadataTitle', 'metadataDescription', 'content'],
  game: ['name'],
} as const;
```

### src/services/i18n/translation.ts

```typescript
// L184-195: getAllTranslations 函数
const result: Record<string, SeoTranslationFields> = {};

for (const translation of translations) {
  result[(translation as any).locale] = {
    name: (translation as any).name,  // ✅ 添加此行
    metadataTitle: (translation as any).metadataTitle,
    metadataDescription: (translation as any).metadataDescription,
    content: (translation as any).content,
  };
}

return result;
```

---

## 4️⃣ 分类服务

### src/services/content/categories.ts

#### createCategory 函数 (L51-95)

```typescript
// L76-89: 保存翻译
if (input.translations) {
  for (const [locale, translation] of Object.entries(input.translations)) {
    if (locale === DEFAULT_LOCALE) continue;

    if (translation.name || translation.metadataTitle || translation.metadataDescription || translation.content) {  // ✅ 添加 name 检查
      await upsertTranslation(
        categoryTranslations,
        categoryTranslations.categoryUuid,
        categoryTranslations.locale,
        uuid,
        locale,
        {
          name: translation.name || input.name,  // ✅ 添加此行
          metadataTitle: translation.metadataTitle || '',
          metadataDescription: translation.metadataDescription || '',
          content: translation.content,
        },
        db,
      );
    }
  }
}
```

#### getCategoryByUuidWithLocale 函数 (L120-146)

```typescript
// L132 和 L145: mergeWithTranslation 调用
return mergeWithTranslation(
  category,
  translation,
  locale,
  ['name', 'metadataTitle', 'metadataDescription', 'content']  // ✅ 添加 'name'
);
```

#### getCategoryBySlugWithLocale 函数 (L171-197)

```typescript
// L183 和 L196: mergeWithTranslation 调用
return mergeWithTranslation(
  category,
  translation,
  locale,
  ['name', 'metadataTitle', 'metadataDescription', 'content']  // ✅ 添加 'name'
);
```

#### getCategoryWithAllTranslations 函数 (L293-311)

```typescript
// L301-305: 默认语言翻译
translations[DEFAULT_LOCALE] = {
  name: category.name,  // ✅ 添加此行
  metadataTitle: category.metadataTitle,
  metadataDescription: category.metadataDescription,
  content: category.content || undefined,
};
```

#### updateCategory 函数 (L316-373)

```typescript
// L337-352: 更新默认语言
if (translations) {
  for (const [locale, translation] of Object.entries(translations)) {
    if (locale === DEFAULT_LOCALE) {
      const defaultUpdate: any = {};
      if (translation.name) defaultUpdate.name = translation.name;  // ✅ 添加此行
      if (translation.metadataTitle) defaultUpdate.metadataTitle = translation.metadataTitle;
      if (translation.metadataDescription) defaultUpdate.metadataDescription = translation.metadataDescription;
      if (translation.content !== undefined) defaultUpdate.content = translation.content;

      if (Object.keys(defaultUpdate).length > 0) {
        defaultUpdate.updatedAt = now;
        await client
          .update(categories)
          .set(defaultUpdate)
          .where(and(eq(categories.uuid, uuid), isNull(categories.deletedAt)));
      }
    } else {
      // L353-368: 更新翻译表
      await upsertTranslation(
        categoryTranslations,
        categoryTranslations.categoryUuid,
        categoryTranslations.locale,
        uuid,
        locale,
        {
          name: translation.name || '',  // ✅ 添加此行
          metadataTitle: translation.metadataTitle || '',
          metadataDescription: translation.metadataDescription || '',
          content: translation.content,
        },
        db,
      );
    }
  }
}
```

---

## 5️⃣ 翻译生成器

### src/services/content/translation-generator.ts

#### getSourceContent 函数 - Category (L42-63)

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
      name: result.name as string,  // ✅ 添加此行
      metadataTitle: (result.metadata_title as string) || (result.name as string),
      metadataDescription: (result.metadata_description as string) || '',
      content: (result.content as string) || '',
    },
    context: 'This is a game category name and description for SEO purposes.',
  };
}
```

#### getSourceContent 函数 - Tag (L65-86)

```typescript
case 'tag': {
  const result = await db
    .prepare('SELECT uuid, name, metadata_title, metadata_description, content FROM tags WHERE uuid = ? AND deleted_at IS NULL')
    .bind(contentUuid)
    .first();

  if (!result) throw new Error('Tag not found');

  return {
    name: result.name as string,
    fields: {
      name: result.name as string,  // ✅ 添加此行
      metadataTitle: (result.metadata_title as string) || (result.name as string),
      metadataDescription: (result.metadata_description as string) || '',
      content: (result.content as string) || '',
    },
    context: 'This is a game tag name and description for SEO purposes.',
  };
}
```

#### getSourceContent 函数 - Featured (L88-109)

```typescript
case 'featured': {
  const result = await db
    .prepare('SELECT uuid, name, metadata_title, metadata_description, content FROM featured WHERE uuid = ? AND deleted_at IS NULL')
    .bind(contentUuid)
    .first();

  if (!result) throw new Error('Featured collection not found');

  return {
    name: result.name as string,
    fields: {
      name: result.name as string,  // ✅ 添加此行
      metadataTitle: (result.metadata_title as string) || (result.name as string),
      metadataDescription: (result.metadata_description as string) || '',
      content: (result.content as string) || '',
    },
    context: 'This is a featured game collection name and description for SEO purposes.',
  };
}
```

#### AI 翻译调用 (L186-216)

```typescript
export async function generateTranslation(
  request: GenerateTranslationRequest,
  db: D1Database,
): Promise<GenerateTranslationResponse> {
  const { contentType, contentUuid, targetLocale } = request;

  // ... 获取 languageRecord 和 sourceContent

  const textsToTranslate: Record<string, string> = {};
  Object.entries(sourceContent.fields).forEach(([field, value]) => {
    if (value) {
      textsToTranslate[field] = value;
    }
  });

  const translations: Record<string, string> = {};

  // ✅ 添加此段逻辑：为 category/tag/featured 翻译 name
  if (
    (contentType === 'category' || contentType === 'tag' || contentType === 'featured') &&
    textsToTranslate.name
  ) {
    const translatedName = await translateGameName(textsToTranslate.name, languageRecord.englishName);
    translations.name = translatedName;
  }

  // For games, translate name separately
  if (contentType === 'game' && textsToTranslate.name) {
    const translatedName = await translateGameName(textsToTranslate.name, languageRecord.englishName);
    translations.name = translatedName;
  }

  // Translate SEO content
  const seoResult = await translateSEOContent(
    {
      metadataTitle: textsToTranslate.metadataTitle || textsToTranslate.name || '',
      metadataDescription: textsToTranslate.metadataDescription || '',
      content: textsToTranslate.content || '',
    },
    languageRecord.englishName,
  );

  // Map results
  if (textsToTranslate.metadataTitle || textsToTranslate.name) {
    translations.metadataTitle = seoResult.metadataTitle;
  }
  if (textsToTranslate.metadataDescription) {
    translations.metadataDescription = seoResult.metadataDescription;
  }
  if (textsToTranslate.content) {
    translations.content = seoResult.content;
  }

  return {
    translations,
    cost: 0,
    tokensUsed: 0,
    sourceContent: {
      uuid: contentUuid,
      name: sourceContent.name,
      type: contentType,
    },
  };
}
```

---

## 6️⃣ 批量翻译处理器

### src/services/translation/processor.ts

#### translateCategories 函数 (约 L250-300)

```typescript
async function translateCategories(
  languageCode: string,
  translationType: 'full' | 'supplement',
  db: D1Database,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  // ... 查询分类列表

  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    const categoryUuid = category.uuid as string;
    const categoryName = category.name as string;
    const categoryMetadataTitle = category.metadata_title as string;
    const categoryMetadataDescription = category.metadata_description as string;
    const categoryContent = category.content as string | null;

    // ✅ 检查是否需要翻译
    const translations = await getAllTranslations(
      categoryTranslations,
      categoryTranslations.categoryUuid,
      categoryUuid,
      db,
    );
    const existing = translations[languageCode] || null;

    const sourceContent = {
      name: categoryName,  // ✅ 添加此行
      metadataTitle: categoryMetadataTitle,
      metadataDescription: categoryMetadataDescription,
      content: categoryContent || undefined,
    };

    const translationComplete = isTranslationComplete(
      sourceContent,
      existing,
      TRANSLATABLE_FIELDS.category,
    );

    if (translationType === 'supplement' && translationComplete) {
      // 已完成，跳过
      console.log(`[translateCategories] Category ${categoryName} already translated to ${languageCode}, skipping`);
      if (onProgress) onProgress(i + 1, categories.length);
      continue;
    }

    // ✅ 生成翻译
    console.log(`[translateCategories] Translating category: ${categoryName} to ${languageCode}`);

    const result = await generateTranslation(
      {
        contentType: 'category',
        contentUuid: categoryUuid,
        targetLocale: languageCode,
      },
      db,
    );

    // ✅ 保存翻译
    await upsertTranslation(
      categoryTranslations,
      categoryTranslations.categoryUuid,
      categoryTranslations.locale,
      categoryUuid,
      languageCode,
      {
        name: result.translations.name || categoryName,  // ✅ 添加此行
        metadataTitle: result.translations.metadataTitle || categoryMetadataTitle,
        metadataDescription: result.translations.metadataDescription || categoryMetadataDescription,
        content: result.translations.content || categoryContent || undefined,
      },
      db,
    );

    if (onProgress) onProgress(i + 1, categories.length);

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
```

#### translateTags 和 translateFeatured

完全相同的模式，替换为对应的 tag/featured 相关表和字段。

---

## 7️⃣ Migration 脚本

### drizzle/[XXXX]_add_name_to_translations.sql

```sql
-- Add name column to category_translations
ALTER TABLE category_translations ADD COLUMN name TEXT;

-- Set default values from parent table
UPDATE category_translations
SET name = (
  SELECT name FROM categories
  WHERE categories.uuid = category_translations.category_uuid
);

-- Make column NOT NULL
-- Note: SQLite doesn't support ALTER COLUMN directly, so we recreate the table
CREATE TABLE category_translations_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_uuid TEXT NOT NULL,
  locale TEXT NOT NULL,
  name TEXT NOT NULL,  -- Now NOT NULL
  metadata_title TEXT NOT NULL,
  metadata_description TEXT NOT NULL,
  content TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Copy data
INSERT INTO category_translations_new
SELECT id, category_uuid, locale, name, metadata_title, metadata_description, content, created_at, updated_at
FROM category_translations;

-- Drop old table
DROP TABLE category_translations;

-- Rename new table
ALTER TABLE category_translations_new RENAME TO category_translations;

-- Recreate indexes
CREATE UNIQUE INDEX category_translations_unique ON category_translations(category_uuid, locale);
CREATE INDEX category_translations_uuid_idx ON category_translations(category_uuid);
CREATE INDEX category_translations_locale_idx ON category_translations(locale);

-- Repeat for tag_translations
-- ... (同样的逻辑)

-- Repeat for featured_translations
-- ... (同样的逻辑)
```

---

## 8️⃣ CMS 表单数据结构

### 分类新增/编辑表单

```typescript
// 表单 state 数据结构
interface CategoryFormData {
  // 默认语言（英文）字段
  name: string;
  slug: string;
  iconUrl?: string;
  metadataTitle: string;
  metadataDescription: string;
  content?: string;

  // 翻译字段
  translations: {
    [locale: string]: {
      name?: string;  // ✅ 添加此字段
      metadataTitle?: string;
      metadataDescription?: string;
      content?: string;
    };
  };
}

// 示例数据
const exampleFormData: CategoryFormData = {
  name: "Action",
  slug: "action",
  metadataTitle: "Action Games",
  metadataDescription: "Play the best action games online",
  content: "## Action Games\n\n...",

  translations: {
    zh: {
      name: "动作",  // ✅ 中文名称
      metadataTitle: "动作游戏",
      metadataDescription: "在线玩最好的动作游戏",
      content: "## 动作游戏\n\n...",
    },
    ja: {
      name: "アクション",  // ✅ 日文名称
      metadataTitle: "アクションゲーム",
      metadataDescription: "最高のアクションゲームをオンラインでプレイ",
      content: "## アクションゲーム\n\n...",
    },
  },
};
```

### 表单 JSX 示例

```tsx
<Tabs defaultValue="en">
  {/* 英文标签页 */}
  <TabsContent value="en">
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Category Name</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
        </FormItem>
      )}
    />
    {/* 其他英文字段... */}
  </TabsContent>

  {/* 中文标签页 */}
  <TabsContent value="zh">
    {/* ✅ 添加 name 字段 */}
    <FormField
      control={form.control}
      name="translations.zh.name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>分类名称 (中文)</FormLabel>
          <FormControl>
            <Input {...field} placeholder="例如：动作" />
          </FormControl>
        </FormItem>
      )}
    />

    <FormField
      control={form.control}
      name="translations.zh.metadataTitle"
      render={({ field }) => (
        <FormItem>
          <FormLabel>SEO 标题 (中文)</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
        </FormItem>
      )}
    />
    {/* 其他中文字段... */}
  </TabsContent>

  {/* 其他语言标签页同理... */}
</Tabs>
```

---

## 📝 完整示例：分类创建流程

### 1. 用户填写表单

```typescript
const formData = {
  name: "Puzzle",
  slug: "puzzle",
  metadataTitle: "Puzzle Games",
  metadataDescription: "Challenge your mind with puzzle games",
  content: "## Puzzle Games\n\nTest your logic...",

  translations: {
    zh: {
      name: "益智",
      metadataTitle: "益智游戏",
      metadataDescription: "用益智游戏挑战你的思维",
      content: "## 益智游戏\n\n测试你的逻辑...",
    },
  },
};
```

### 2. API 接收并保存

```typescript
// src/app/api/admin/categories/route.ts
export async function POST(request: NextRequest) {
  const db = env.DB;
  const body = await request.json();

  const category = await createCategory(
    {
      name: body.name,
      slug: body.slug,
      metadataTitle: body.metadataTitle,
      metadataDescription: body.metadataDescription,
      content: body.content,
      translations: body.translations,  // 包含 name 字段
    },
    db,
  );

  return NextResponse.json({ success: true, data: category });
}
```

### 3. 服务层保存到数据库

```typescript
// src/services/content/categories.ts
export async function createCategory(input: CreateCategoryInput, db: D1Database) {
  // ... 创建主记录

  // 保存翻译
  if (input.translations) {
    for (const [locale, translation] of Object.entries(input.translations)) {
      await upsertTranslation(
        categoryTranslations,
        categoryTranslations.categoryUuid,
        categoryTranslations.locale,
        uuid,
        locale,
        {
          name: translation.name || input.name,  // 使用翻译的 name，如果没有则用英文
          metadataTitle: translation.metadataTitle || '',
          metadataDescription: translation.metadataDescription || '',
          content: translation.content,
        },
        db,
      );
    }
  }

  return newCategory;
}
```

### 4. 前端读取并显示

```typescript
// src/app/[locale]/categories/[slug]/page.tsx
export default async function CategoryPage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  const db = env.DB;

  // 获取分类数据（包含翻译）
  const category = await getCategoryBySlugWithLocale(
    params.slug,
    params.locale,
    db,
  );

  if (!category) {
    notFound();
  }

  return (
    <div>
      {/* 显示翻译后的名称 */}
      <h1>{category.name}</h1>  {/* 自动使用翻译后的 name */}
      <p>{category.metadataDescription}</p>
      {/* ... */}
    </div>
  );
}
```

---

**文档版本**: v1.0
**创建日期**: 2025-01-14
