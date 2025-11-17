# 翻译表添加 `name` 字段 - 实施检查清单

## 📋 快速修改清单

### Phase 1: 基础设施 (P0)

#### ✅ 数据库层
- [ ] `src/db/schema.ts`
  - [ ] `categoryTranslations` 添加 `name: text('name').notNull()`
  - [ ] `tagTranslations` 添加 `name: text('name').notNull()`
  - [ ] `featuredTranslations` 添加 `name: text('name').notNull()`
- [ ] 生成 migration: `pnpm drizzle:generate`
- [ ] 编辑 migration 文件，添加默认值逻辑
- [ ] 本地测试: `pnpm d1:apply`

#### ✅ 类型定义
- [ ] `src/services/i18n/types.ts`
  - [ ] `SeoTranslationFields` 添加 `name?: string`

#### ✅ 共享逻辑
- [ ] `src/lib/translation-completeness.ts`
  - [ ] `TRANSLATABLE_FIELDS.category` 添加 `'name'`
  - [ ] `TRANSLATABLE_FIELDS.tag` 添加 `'name'`
  - [ ] `TRANSLATABLE_FIELDS.featured` 添加 `'name'`
- [ ] `src/services/i18n/translation.ts`
  - [ ] `getAllTranslations` 返回对象包含 `name` 字段

---

### Phase 2: 后端服务 (P0)

#### ✅ 分类服务
**文件**: `src/services/content/categories.ts`

- [ ] `createCategory` (L51-95)
  - [ ] 保存翻译时添加 `name: translation.name || input.name`
- [ ] `getCategoryByUuidWithLocale` (L120-146)
  - [ ] `mergeWithTranslation` 字段列表添加 `'name'`
- [ ] `getCategoryBySlugWithLocale` (L171-197)
  - [ ] `mergeWithTranslation` 字段列表添加 `'name'`
- [ ] `getCategoryWithAllTranslations` (L293-311)
  - [ ] 默认 locale 翻译添加 `name: category.name`
- [ ] `updateCategory` (L316-373)
  - [ ] 默认 locale 更新添加 `name` 处理
  - [ ] 翻译表更新添加 `name: translation.name || ''`

#### ✅ 标签服务
**文件**: `src/services/content/tags.ts`

- [ ] `createTag` - 同 categories 模式
- [ ] `getTagByUuidWithLocale` - 同 categories 模式
- [ ] `getTagBySlugWithLocale` - 同 categories 模式
- [ ] `getTagWithAllTranslations` - 同 categories 模式
- [ ] `updateTag` - 同 categories 模式

#### ✅ 特性合集服务
**文件**: `src/services/content/featured.ts`

- [ ] `createFeatured` - 同 categories 模式
- [ ] `getFeaturedByUuidWithLocale` - 同 categories 模式
- [ ] `getFeaturedBySlugWithLocale` - 同 categories 模式
- [ ] `getFeaturedWithAllTranslations` - 同 categories 模式
- [ ] `updateFeatured` - 同 categories 模式

#### ✅ 翻译生成器
**文件**: `src/services/content/translation-generator.ts`

- [ ] `getSourceContent` - Category (L42-63)
  - [ ] `fields` 对象添加 `name: result.name`
- [ ] `getSourceContent` - Tag (L65-86)
  - [ ] `fields` 对象添加 `name: result.name`
- [ ] `getSourceContent` - Featured (L88-109)
  - [ ] `fields` 对象添加 `name: result.name`
- [ ] AI 翻译调用 (L186-216)
  - [ ] 为 category/tag/featured 调用 `translateGameName` 翻译 `name`

#### ✅ 批量翻译处理器
**文件**: `src/services/translation/processor.ts`

- [ ] `translateCategories`
  - [ ] `sourceContent` 包含 `name`
  - [ ] 保存翻译时包含 `name: result.translations.name`
- [ ] `translateTags`
  - [ ] `sourceContent` 包含 `name`
  - [ ] 保存翻译时包含 `name: result.translations.name`
- [ ] `translateFeatured`
  - [ ] `sourceContent` 包含 `name`
  - [ ] 保存翻译时包含 `name: result.translations.name`

#### ✅ 翻译审计
**文件**: `src/services/content/translation-audit.ts`

- [ ] 验证审计逻辑正确使用 `TRANSLATABLE_FIELDS`（自动支持 `name`）

---

### Phase 3: 前端 (P1)

#### ✅ API 路由

**分类 API**:
- [ ] `src/app/api/admin/categories/route.ts`
  - [ ] POST: 接收并保存 `translations[locale].name`
  - [ ] GET: 返回数据包含 `name` 翻译
- [ ] `src/app/api/admin/categories/[uuid]/route.ts`
  - [ ] GET: 返回翻译包含 `name`
  - [ ] PUT: 处理 `translations[locale].name` 更新

**标签 API**:
- [ ] `src/app/api/admin/tags/route.ts` - 同分类模式
- [ ] `src/app/api/admin/tags/[uuid]/route.ts` - 同分类模式

**特性合集 API**:
- [ ] `src/app/api/admin/featured/route.ts` - 同分类模式
- [ ] `src/app/api/admin/featured/[uuid]/route.ts` - 同分类模式

#### ✅ CMS 管理组件

- [ ] `src/components/admin/taxonomy-management.tsx` (或对应的分类管理组件)
  - [ ] 新增弹窗：每个语言标签页添加 `name` 输入框
  - [ ] 编辑弹窗：每个语言标签页添加 `name` 输入框
  - [ ] 表单 state 包含 `translations[locale].name`
  - [ ] 提交时发送完整的 `translations` 数据

- [ ] 标签管理组件
  - [ ] 新增/编辑弹窗添加 `name` 字段

- [ ] 特性合集管理组件
  - [ ] 新增/编辑弹窗添加 `name` 字段

- [ ] `src/components/admin/translation-dashboard.tsx`
  - [ ] 缺失字段显示包含 `name`

#### ✅ 前端展示页面

- [ ] 分类列表/详情页面
  - [ ] 显示翻译后的 `name`
- [ ] 标签列表/详情页面
  - [ ] 显示翻译后的 `name`
- [ ] 特性合集列表/详情页面
  - [ ] 显示翻译后的 `name`
- [ ] 其他引用组件
  - [ ] 导航菜单、面包屑等显示翻译名称

---

### Phase 4: 数据迁移 (P1)

#### ✅ Migration 脚本

- [ ] 编辑 Drizzle migration 文件
  - [ ] Category translations: 复制英文 `name`
    ```sql
    UPDATE category_translations
    SET name = (SELECT name FROM categories WHERE categories.uuid = category_translations.category_uuid);
    ```
  - [ ] Tag translations: 复制英文 `name`
    ```sql
    UPDATE tag_translations
    SET name = (SELECT name FROM tags WHERE tags.uuid = tag_translations.tag_uuid);
    ```
  - [ ] Featured translations: 复制英文 `name`
    ```sql
    UPDATE featured_translations
    SET name = (SELECT name FROM featured WHERE featured.uuid = featured_translations.featured_uuid);
    ```

- [ ] 本地验证
  - [ ] 备份本地数据库
  - [ ] 应用 migration
  - [ ] 验证旧翻译记录的 `name` 字段已填充
  - [ ] 验证 NOT NULL 约束生效

- [ ] 生产环境部署
  - [ ] 备份生产数据库
  - [ ] 执行 `pnpm d1:apply:remote`
  - [ ] 验证数据完整性

---

## 🧪 测试清单

### 单元测试
- [ ] `TRANSLATABLE_FIELDS` 正确包含 `name`
- [ ] `isTranslationComplete` 检查 `name` 字段
- [ ] `getAllTranslations` 返回 `name`
- [ ] `mergeWithTranslation` 处理 `name` 回退

### API 测试
- [ ] POST /api/admin/categories - 创建时保存 `name` 翻译
- [ ] PUT /api/admin/categories/[uuid] - 更新 `name` 翻译
- [ ] GET /api/admin/categories/[uuid] - 返回 `name` 翻译
- [ ] 同样测试 tags 和 featured API

### 集成测试
- [ ] 批量翻译生成 `name` 翻译
- [ ] 翻译审计统计 `name` 缺失
- [ ] 不同 locale 获取不同 `name`

### E2E 测试
- [ ] CMS 创建分类 → 填写多语言 `name` → 保存成功
- [ ] CMS 编辑分类 → 修改 `name` 翻译 → 保存成功
- [ ] 前端切换语言 → 显示对应的 `name`
- [ ] 自动翻译 → `name` 字段被正确翻译

### 数据验证
- [ ] 查询数据库，旧翻译记录 `name` IS NOT NULL
- [ ] 新创建的翻译包含 `name`
- [ ] 不同语言的 `name` 不同

---

## 📊 关键指标

### 修改文件统计
- **数据库**: 1 个文件 + 1 个 migration
- **类型定义**: 2 个文件
- **服务层**: 7 个文件
- **API 层**: 6 个文件
- **组件层**: 4+ 个文件
- **总计**: 约 20+ 个文件

### 预估工作量
- **Phase 1**: 2-3 小时
- **Phase 2**: 4-6 小时
- **Phase 3**: 4-6 小时
- **Phase 4**: 2-3 小时
- **测试**: 3-4 小时
- **总计**: 15-22 小时

---

## ⚠️ 关键风险检查

### 部署前检查
- [ ] Migration 包含默认值设置（防止 NOT NULL 错误）
- [ ] 本地数据库测试通过
- [ ] 所有 TypeScript 编译错误已解决
- [ ] API 兼容性测试通过（旧客户端仍能工作）

### 部署中检查
- [ ] 生产数据库备份完成
- [ ] Migration 执行成功
- [ ] 数据完整性验证通过

### 部署后检查
- [ ] CMS 创建/编辑功能正常
- [ ] 前端多语言显示正常
- [ ] 翻译审计数据准确
- [ ] 批量翻译功能正常

---

## 📝 实施笔记

### 开始日期
_待填写_

### 完成日期
_待填写_

### 遇到的问题
_待记录_

### 解决方案
_待记录_

---

**文档版本**: v1.0
**创建日期**: 2025-01-14
