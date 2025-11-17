# 游戏特性关联管理方案 - 执行总结

## 📌 方案概述

针对游戏管理系统中"Hot"和"New"游戏数据获取逻辑不一致的问题，提出"运营优先 + 自动补充"的统一解决方案。

---

## 🎯 核心问题

### 当前问题

1. **Hot 游戏逻辑不一致**
   - 首页：基于 `gamesToFeatured` 关联表（运营能力强）
   - 列表页：直接按 `interact` 排序（自动化能力强）
   - **冲突**: 两者逻辑不统一，运营与自动化能力互斥

2. **New 游戏缺少运营能力**
   - 只能按 `createdAt` 排序
   - 无法人工置顶特定新游戏

3. **管理后台功能缺失**
   - 无法在后台管理游戏与 Featured/Category/Tag 的关联关系

---

## 💡 核心解决方案

### 设计理念："运营优先 + 自动补充"

```
最终展示 = 运营数据（手动关联的游戏，可排序） + 自动数据（自动补充符合条件的游戏）
```

### 关键改进

#### 1️⃣ 数据库层面

**在关联表中增加排序字段**:
```sql
-- gamesToFeatured / gamesToCategories / gamesToTags
ALTER TABLE xxx ADD COLUMN sort_order INTEGER DEFAULT 0;
ALTER TABLE xxx ADD COLUMN created_at INTEGER NOT NULL DEFAULT (unixepoch());
```

**好处**:
- 支持人工排序（sortOrder 越小越靠前）
- 运营数据和自动数据混合展示
- 保留操作时间，便于追溯

#### 2️⃣ 数据服务层面

**统一查询逻辑**（新文件 `featured-games.ts`）:

```typescript
getFeaturedGames() {
  // 步骤 1: 查询运营数据（通过 gamesToFeatured 关联）
  const manualGames = 查询关联表 + 按 sortOrder 排序;

  // 步骤 2: 如果数量不足，自动补充
  if (manualGames.length < limit) {
    const autoGames = 按策略自动查询(interact/createdAt);
    结果 = manualGames + autoGames;
  }

  return 结果;
}
```

**好处**:
- 首页和列表页使用相同逻辑
- 运营数据优先展示
- 自动补充避免空白

#### 3️⃣ 管理后台层面

**新增"管理关联"功能**:

在游戏管理页面 Actions 列添加按钮 → 打开弹窗 → 管理关联关系

**弹窗功能**:
- Tab 1: Featured 关联管理（Hot/New 等）
- Tab 2: Categories 关联管理
- Tab 3: Tags 关联管理

**操作支持**:
- ✅ 添加关联
- ✅ 移除关联
- ✅ 调整排序（sortOrder）
- ✅ 实时预览效果

#### 4️⃣ API 端点

新增 3 个 API 路由:
- `/api/admin/games/relations/featured` - Featured 关联管理
- `/api/admin/games/relations/categories` - Categories 关联管理
- `/api/admin/games/relations/tags` - Tags 关联管理

支持操作:
- `POST` - 添加关联
- `DELETE` - 删除关联
- `PATCH` - 更新排序
- `GET` - 查询关联

---

## 📊 实施计划

| 阶段 | 任务 | 预估时间 |
|------|------|----------|
| 1️⃣ 数据库改造 | 更新 schema、执行迁移 | 2 小时 |
| 2️⃣ 数据服务开发 | 创建统一查询逻辑 | 4 小时 |
| 3️⃣ API 端点开发 | 创建关联管理 API | 3 小时 |
| 4️⃣ 管理后台开发 | 创建关联管理界面 | 6 小时 |
| 5️⃣ 测试与上线 | 测试、部署 | 2 小时 |
| **总计** | | **17 小时** |

---

## 🎁 预期效果

### ✅ 功能改进
- 统一 Hot/New 游戏查询逻辑
- 增强运营能力（手动排序）
- 保留自动化能力（自动补充）
- 支持统一的关联管理

### 📈 运营效率提升
- 快速调整首页/列表页内容
- 灵活控制游戏展示顺序
- 精准推荐特定游戏
- 减少人工维护成本

### 💎 用户体验改善
- 更精准的内容推荐
- 更新鲜的游戏展示
- 更高的内容质量

---

## ⚠️ 关键风险

| 风险 | 应对措施 |
|------|----------|
| 数据库迁移失败 | 先在本地测试，做好备份 |
| 查询性能下降 | 添加索引，优化查询逻辑 |
| 运营人员操作失误 | 添加操作日志，支持撤销 |

---

## 🔍 审核要点

### 请重点审核以下内容：

1. **设计理念是否合理？**
   - "运营优先 + 自动补充"策略是否满足需求？
   - 是否有更好的方案？

2. **数据库改造是否合理？**
   - 在关联表中添加 `sortOrder` 和 `createdAt` 字段
   - 是否需要其他字段？

3. **查询逻辑是否正确？**
   - 先查运营数据，再自动补充
   - 运营数据按 `sortOrder` 排序
   - 自动数据按策略排序（interact 或 createdAt）

4. **管理后台功能是否完善？**
   - 关联管理弹窗设计是否合理？
   - 是否需要批量操作功能？
   - 是否需要拖拽排序功能？

5. **实施计划是否可行？**
   - 时间预估是否合理？
   - 实施顺序是否正确？

---

## 📂 相关文档

- 详细方案: [`game-featured-management-plan.md`](./game-featured-management-plan.md)
- 相关代码:
  - `src/services/content/home.ts` - 首页数据服务
  - `src/services/content/list.ts` - 列表数据服务
  - `src/app/[locale]/admin/games/page.tsx` - 游戏管理页面
  - `src/db/schema.ts` - 数据库 Schema

---

## 💬 反馈与建议

如有任何疑问或建议，请直接在文档中标注或通过以下方式反馈：

1. **关键问题**: 直接在相关章节添加注释
2. **方案调整**: 提出具体的修改建议
3. **功能增强**: 列出需要补充的功能点

---

**审核通过后即可开始实施 🚀**
