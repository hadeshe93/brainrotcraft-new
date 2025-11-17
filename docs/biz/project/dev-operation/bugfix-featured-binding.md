# Bugfix: Featured 绑定问题修复

## 🐛 问题描述

在 CMS 后台给游戏添加 Featured 绑定时，接口返回成功，但查询回来的数据却没有绑定关系。

## 🔍 问题分析

经过排查，发现了 **三个关键问题**：

### 问题 1: Featured UUID 不匹配 ❌

**前端硬编码的 UUID**:
```typescript
setAllFeatured([
  { uuid: 'feat_hot_001', name: 'Hot Games', slug: 'hot' },
  { uuid: 'feat_new_001', name: 'New Games', slug: 'new' },
]);
```

**数据库中实际的 UUID**:
- Hot: `tQy2I_WOSQqz8lHAQpKDg`
- New: `PMgFEHG1wVZzkT5q10NOV`

**原因**: 迁移脚本中使用了硬编码的 UUID (`feat_hot_001`), 但数据库中已有的 featured 记录使用的是不同的 UUID。

### 问题 2: 缺少唯一约束 ❌

Schema 定义中使用了普通索引而不是唯一索引：
```typescript
pk: index('games_to_featured_pk').on(table.gameUuid, table.featuredUuid), // ❌ 只是索引
```

**后果**: 允许插入重复的关联记录
```sql
-- 数据库中的重复记录
W-dZSkumclD9daUugeLIq|feat_hot_001|0|1762401052
W-dZSkumclD9daUugeLIq|feat_hot_001|0|1762401068  -- 重复！
```

### 问题 3: 缺少冲突处理 ❌

POST API 的插入逻辑没有处理重复插入的情况：
```typescript
await client.insert(gamesToFeatured).values({...}); // 直接插入，可能重复
```

## ✅ 解决方案

### 修复 1: 从 API 获取真实的 Featured 列表

**创建 Featured 列表 API**:
```typescript
// src/app/api/admin/featured/route.ts
export async function GET(request: NextRequest) {
  const results = await client
    .select({ uuid: featured.uuid, name: featured.name, slug: featured.slug })
    .from(featured)
    .where(isNull(featured.deletedAt))
    .orderBy(featured.name);

  return NextResponse.json({ success: true, data: results });
}
```

**修改前端组件**:
```typescript
const loadAllFeatured = async () => {
  const response = await fetch('/api/admin/featured');
  const data = await response.json();
  if (data.success) {
    setAllFeatured(data.data); // ✅ 使用真实数据
  }
};
```

### 修复 2: 添加唯一索引约束

**数据库操作**:
```sql
-- 1. 清理重复数据
DELETE FROM games_to_featured
WHERE rowid NOT IN (
  SELECT MAX(rowid)
  FROM games_to_featured
  GROUP BY game_uuid, featured_uuid
);

-- 2. 创建唯一索引
CREATE UNIQUE INDEX games_to_featured_unique
ON games_to_featured(game_uuid, featured_uuid);
```

**迁移脚本**: `drizzle/0003_add_unique_constraints.sql`

### 修复 3: 添加冲突处理

**修改 POST API**:
```typescript
await client
  .insert(gamesToFeatured)
  .values({...})
  .onConflictDoUpdate({
    target: [gamesToFeatured.gameUuid, gamesToFeatured.featuredUuid],
    set: { sortOrder }, // 如果已存在，更新 sortOrder
  });
```

**优点**:
- 防止重复插入
- 如果关联已存在，更新排序而不是报错
- 保证操作的幂等性

## 📊 影响范围

### 修改的文件 (5)

1. ✅ `src/app/api/admin/featured/route.ts` (新建)
   - 提供 Featured 列表查询接口

2. ✅ `src/components/admin/game-relations-dialog.tsx`
   - 从 API 获取 Featured 列表，而不是硬编码

3. ✅ `src/app/api/admin/games/relations/featured/route.ts`
   - 添加 `onConflictDoUpdate` 处理重复插入

4. ✅ `src/app/api/admin/games/relations/categories/route.ts`
   - 添加 `onConflictDoUpdate` 处理重复插入

5. ✅ `src/app/api/admin/games/relations/tags/route.ts`
   - 添加 `onConflictDoUpdate` 处理重复插入

### 新增迁移脚本 (1)

- ✅ `drizzle/0003_add_unique_constraints.sql`
  - 清理重复数据
  - 添加唯一索引约束

## 🧪 测试验证

### 本地验证

```bash
# 1. 检查重复数据是否清理
sqlite3 xxx.sqlite "SELECT game_uuid, featured_uuid, COUNT(*) FROM games_to_featured GROUP BY game_uuid, featured_uuid;"
# 应该看到每个组合只有 1 条记录

# 2. 检查唯一索引是否创建
sqlite3 xxx.sqlite "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE '%unique%';"
# 应该看到 games_to_featured_unique, games_to_categories_unique, games_to_tags_unique
```

### 功能测试

1. ✅ 在 CMS 后台添加 Featured 绑定
   - 应该成功添加
   - 刷新后能看到绑定

2. ✅ 重复添加相同绑定
   - 应该成功（更新 sortOrder）
   - 不会创建重复记录

3. ✅ Featured 下拉列表
   - 应该显示真实的 Featured 列表
   - 包含正确的 UUID 和名称

## 🚀 部署步骤

### 1. 执行生产环境迁移

```bash
# 应用唯一约束迁移
pnpm wrangler d1 execute gamesramp --remote --file=drizzle/0003_add_unique_constraints.sql
```

### 2. 验证生产数据

```bash
# 检查是否有重复数据
pnpm wrangler d1 execute gamesramp --remote --command="
SELECT game_uuid, featured_uuid, COUNT(*) as count
FROM games_to_featured
GROUP BY game_uuid, featured_uuid
HAVING count > 1;
"
# 应该返回空结果

# 检查唯一索引
pnpm wrangler d1 execute gamesramp --remote --command="
SELECT name FROM sqlite_master
WHERE type='index' AND name LIKE '%unique%';
"
# 应该看到 3 个唯一索引
```

### 3. 部署代码

```bash
# 部署到 Cloudflare Pages
pnpm deploy
```

## 📝 经验教训

### 1. 不要硬编码 UUID
- ❌ 前端硬编码 UUID 容易与数据库不一致
- ✅ 始终从 API 获取动态数据

### 2. 使用唯一约束
- ❌ 普通索引不能防止重复
- ✅ 使用唯一索引或主键约束

### 3. 处理冲突场景
- ❌ 简单的 INSERT 可能失败或重复
- ✅ 使用 `onConflictDoUpdate` 或 `onConflictDoNothing`

### 4. 迁移脚本要完整
- ❌ 只添加字段，忘记约束
- ✅ 同时处理数据清理和约束添加

## 🎯 后续优化建议

1. **Schema 改进**: 考虑在 Drizzle Schema 中使用 `primaryKey()` 而不是 `index()`

2. **数据验证**: 在插入前验证 UUID 是否存在

3. **事务处理**: 批量操作使用事务保证原子性

4. **错误提示**: 前端显示更详细的错误信息

---

**修复时间**: 2025-11-06
**状态**: ✅ 已完成
**测试**: ✅ 本地验证通过
