# 翻译表添加 `name` 字段 - 额外发现的问题

## 🔴 重要发现

在 review 代码时，发现了一个**关键 Bug**，必须在实施 `name` 字段改造时一并修复。

---

## 问题 1: `upsertTranslation` 函数的空值检查逻辑

### 当前代码 (有 Bug)

**文件**: `src/services/i18n/translation.ts` (L126-132)

```typescript
export async function upsertTranslation(
  translationTable: SQLiteTable,
  entityUuidField: any,
  localeField: any,
  entityUuid: string,
  locale: string,
  translationData: SeoTranslationFields,
  db: D1Database,
): Promise<void> {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  // ❌ BUG: 只检查了 metadataTitle、metadataDescription、content
  // 如果只提供了 name 而其他字段为空，翻译会被删除！
  const isEmpty = !translationData.metadataTitle && !translationData.metadataDescription && !translationData.content;

  if (isEmpty) {
    // Delete translation if all fields are empty (fallback to default)
    await client.delete(translationTable).where(and(eq(entityUuidField, entityUuid), eq(localeField, locale)));
    return;
  }

  // ... insert/update logic
}
```

### 问题描述

**场景**: 用户只填写了翻译的 `name` 字段，其他字段（`metadataTitle`、`metadataDescription`、`content`）都留空。

**预期行为**: 保存 `name` 翻译，其他字段使用默认语言回退。

**实际行为**:
1. `isEmpty` 检查通过（因为没检查 `name`）
2. 翻译记录被删除
3. 用户填写的 `name` 翻译丢失

### 修复方案

**文件**: `src/services/i18n/translation.ts` (L126)

```typescript
// ✅ 修复后：检查所有字段，包括 name
const isEmpty =
  !translationData.name &&
  !translationData.metadataTitle &&
  !translationData.metadataDescription &&
  !translationData.content;
```

### 影响范围

这个 Bug 会影响：
- 分类翻译保存
- 标签翻译保存
- 特性合集翻译保存
- 游戏介绍翻译保存（如果只填写部分字段）

**优先级**: 🔴 **P0** - 必须修复，否则 `name` 字段翻译会丢失

---

## 问题 2: 标签和特性合集管理组件位置

### 文件路径确认

通过 Glob 搜索，确认了以下文件路径：

#### 标签 API
- `src/app/api/admin/tags/route.ts` - 列表和创建
- `src/app/api/admin/tags/[uuid]/route.ts` - 获取和更新
- `src/app/api/admin/tags/import/route.ts` - 批量导入

#### 特性合集 API
- `src/app/api/admin/featured/route.ts` - 列表和创建
- `src/app/api/admin/featured/[uuid]/route.ts` - 获取和更新
- `src/app/api/admin/featured/import/route.ts` - 批量导入

#### 管理组件
需要查找：
- 标签管理组件（可能在 `src/components/admin/` 或 `src/app/[locale]/admin/tags/` 中）
- 特性合集管理组件（可能在 `src/components/admin/` 或 `src/app/[locale]/admin/featured/` 中）

---

## 问题 3: `mergeWithTranslation` 函数对 `name` 的处理

### 当前代码分析

**文件**: `src/services/i18n/translation.ts` (L69-108)

```typescript
export function mergeWithTranslation<T extends Record<string, any>>(
  baseEntity: T,
  translation: Partial<SeoTranslationFields> | null,
  locale: string,
  translationFields: (keyof SeoTranslationFields)[],
): T & { _locale: string; _fallback: boolean; _fallbackFields: string[]; _translation: TranslationMetadata } {
  // ... 默认语言处理

  const { fallbackFields, metadata } = calculateTranslationMetadata(translation, translationFields);

  const merged: any = { ...baseEntity };

  // Apply translations or fallback to base fields
  for (const field of translationFields) {
    if (translation && translation[field]) {
      merged[field] = translation[field];  // ✅ 使用翻译值
    }
    // else: keep the base field value (fallback)  // ✅ 使用默认值
  }

  return {
    ...merged,
    _locale: locale,
    _fallback: !translation,
    _fallbackFields: fallbackFields,
    _translation: metadata,
  };
}
```

### 分析结果

✅ **无需修改** - 这个函数已经正确处理了字段级回退：
- 如果翻译中有 `name` 字段，使用翻译的值
- 如果翻译中没有 `name` 字段，使用 `baseEntity.name` (英文名称)

只要调用时正确传递 `translationFields` 参数（包含 `'name'`），就能正确工作。

---

## 问题 4: `calculateTranslationMetadata` 函数对 `name` 的处理

### 当前代码分析

**文件**: `src/services/i18n/translation.ts` (L15-40)

```typescript
export function calculateTranslationMetadata(
  translation: Partial<SeoTranslationFields> | null,
  requiredFields: (keyof SeoTranslationFields)[],
): { fallbackFields: string[]; metadata: TranslationMetadata } {
  if (!translation) {
    return {
      fallbackFields: requiredFields as string[],
      metadata: {
        available: false,
        partial: false,
        completeness: 0,
      },
    };
  }

  const fallbackFields = requiredFields.filter((field) => !translation[field]);

  return {
    fallbackFields: fallbackFields as string[],
    metadata: {
      available: true,
      partial: fallbackFields.length > 0,
      completeness: 1 - fallbackFields.length / requiredFields.length,
    },
  };
}
```

### 分析结果

✅ **无需修改** - 这个函数是通用的，基于传入的 `requiredFields` 参数动态计算：
- 如果 `requiredFields` 包含 `'name'`，会检查 `translation.name`
- 如果 `translation.name` 缺失，会被加入 `fallbackFields`
- 完成度百分比会正确计算

---

## 修改优先级总结

### 🔴 P0 - 必须修复
1. **`upsertTranslation` 函数** - 修复空值检查逻辑，包含 `name` 字段

### 🟢 无需修改
1. **`mergeWithTranslation` 函数** - 已正确支持动态字段回退
2. **`calculateTranslationMetadata` 函数** - 已正确支持动态字段计算

---

## 实施建议

### Phase 0: 前置修复 (在添加 `name` 字段之前)

1. **修复 `upsertTranslation` 的 Bug** (src/services/i18n/translation.ts:126)
   ```typescript
   const isEmpty =
     !translationData.name &&
     !translationData.metadataTitle &&
     !translationData.metadataDescription &&
     !translationData.content;
   ```

2. **测试修复**
   - 测试只保存部分翻译字段的场景
   - 确保不会误删翻译记录

### Phase 1-4: 按原计划执行

参见 `CHECKLIST.md` 中的实施步骤。

---

## 风险评估

### `upsertTranslation` Bug 的影响

**当前影响** (在添加 `name` 字段之前):
- 如果用户只填写了 `content` 而没填写 `metadataTitle` 和 `metadataDescription`，翻译会被保留（因为 `content` 被检查了）
- **但是**，如果引入了其他可选字段（如未来的 `subtitle`、`keywords` 等），同样的 Bug 会再次出现

**未来影响** (添加 `name` 字段后):
- 如果不修复，用户只填写 `name` 翻译时，记录会被删除
- 这是一个明显的 Bug，用户会困惑为什么保存失败

**建议**: 在添加 `name` 字段之前先修复这个 Bug，确保逻辑健壮。

---

## 相关文件清单

### 需要修改的文件
- ✅ `src/services/i18n/translation.ts` (L126) - 修复 `upsertTranslation`

### 需要查找的文件
- 🔍 标签管理组件
- 🔍 特性合集管理组件

建议使用以下命令查找：
```bash
# 查找标签管理页面/组件
grep -r "tags" src/app/[locale]/admin/ --include="*.tsx"
grep -r "TagManagement\|tag-management" src/components/admin/ --include="*.tsx"

# 查找特性合集管理页面/组件
grep -r "featured" src/app/[locale]/admin/ --include="*.tsx"
grep -r "FeaturedManagement\|featured-management" src/components/admin/ --include="*.tsx"
```

---

**文档版本**: v1.0
**创建日期**: 2025-01-14
