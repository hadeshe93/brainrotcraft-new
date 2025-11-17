# Cloudflare Workers 兼容性更新

> **更新日期**: 2025-11-05
> **作者**: Claude
> **版本**: v2.0

## 概述

将批量导入 API 从依赖 Node.js 文件系统的实现改为完全兼容 Cloudflare Workers 的实现。

## 问题背景

### 原实现的问题

在昨天实施的批量导入 API 中，使用了以下 Node.js 特定的 API：

1. **文件系统访问** (`fs.readFile`)
2. **Glob 模式匹配** (`glob`)
3. **当前工作目录** (`process.cwd()`)
4. **路径拼接** (`path.join`)

这些 API 在本地开发环境（Next.js dev server）中运行良好，但在 Cloudflare Workers 运行时中**完全不可用**，因为：

- Cloudflare Workers 运行在 V8 隔离环境中，不是 Node.js
- 没有文件系统访问权限
- 没有 `process` 对象
- 无法读取项目目录中的文件

### 导致的后果

- ✅ 本地开发：完全正常
- ❌ 生产部署（Cloudflare Pages）：**API 调用失败**
- ❌ 无法在线上使用批量导入功能

---

## 解决方案

### 核心改动

将数据传输方式从**文件系统读取**改为**HTTP 请求体传输**：

**旧方式**:

```json
POST /api/admin/categories/import
{
  "useDefaultPath": true,
  "filePath": "tools/rewrite/cate-and-tag/output/game-categories.json",
  "strategy": "upsert"
}
```

→ API 读取服务器文件系统中的文件 ❌

**新方式**:

```json
POST /api/admin/categories/import
{
  "data": [
    { "name": "Action", "slug": "action", ... }
  ],
  "strategy": "upsert"
}
```

→ API 从请求体直接接收数据 ✅

---

## 修改清单

### 1. API Routes（3 个文件）

#### src/app/api/admin/categories/import/route.ts

**改动**:

- ❌ 删除：`readCategoriesJson()` 调用
- ❌ 删除：`path.join(process.cwd())`
- ✅ 新增：从请求体 `data` 字段读取数组
- ✅ 新增：数据验证（必需字段检查）
- ✅ 保留：`importCategories()` 服务函数调用

**关键代码**:

```typescript
// 旧代码
const fullPath = path.join(process.cwd(), filePath);
const items = await readCategoriesJson(fullPath);

// 新代码
const { data } = body;
if (!data || !Array.isArray(data)) {
  return NextResponse.json({ error: '...' }, { status: 400 });
}
const items: CategoryImportData[] = data.map(item => ({...}));
```

#### src/app/api/admin/tags/import/route.ts

**改动**：与 categories 相同

#### src/app/api/admin/games/import/route.ts

**改动**：

- ❌ 删除：`glob()` 文件匹配
- ❌ 删除：`readMultipleGamesJson()` 调用
- ✅ 新增：从请求体读取游戏数组
- ✅ 新增：内联数据转换逻辑（geometrylite.io 格式支持）

**关键代码**:

```typescript
// 内联数据转换
const items: GameImportData[] = data.map((item) => ({
  name: item.name,
  slug: item.slug,
  thumbnail: item.thumbnail || item.coverImage || '',
  categories: Array.isArray(item.categories) ? item.categories.map((c: string) => c.toLowerCase()) : [],
  // ... 其他字段转换
}));
```

---

### 2. 删除文件

#### src/lib/import-utils.ts

**删除原因**：

- 文件读取函数不再需要（`readCategoriesJson`, `readTagsJson`, `readGamesJson`）
- 类型定义已在 services 层存在
- 数据转换逻辑已集成到 API routes

**删除内容**：

- 4 个文件读取函数（236 行代码）
- 3 个数据接口定义（已在 services 中）
- 数据转换辅助函数（已内联到 API）

---

### 3. 新增工具脚本（3 个文件）

为了方便本地批量导入，创建了命令行工具脚本：

#### tools/batch-import/import-categories.ts

**功能**：

- 读取本地 JSON 文件
- 解析分类数据
- 调用 HTTP API 导入
- 显示进度和结果

**使用**：

```bash
pnpm tsx tools/batch-import/import-categories.ts
```

#### tools/batch-import/import-tags.ts

**功能**：与 categories 脚本相同，用于标签导入

#### tools/batch-import/import-games.ts

**功能**：

- **支持 glob 模式**匹配多个文件
- **自动批处理**（默认每批 50 条）
- **显示进度**和详细结果
- **自动转换** geometrylite.io 格式
- 支持配置批处理大小

**特性**：

```bash
# 默认匹配 games-*.json
pnpm tsx tools/batch-import/import-games.ts

# 自定义批次大小
BATCH_SIZE=100 pnpm tsx tools/batch-import/import-games.ts

# 使用不同策略
IMPORT_STRATEGY=skip_existing pnpm tsx tools/batch-import/import-games.ts
```

---

### 4. 文档更新

#### docs/biz/project/dev-batch-api/testing-guide.md

**完全重写**，包括：

- 新的 API 使用说明
- 工具脚本使用指南
- 环境变量配置
- 完整的示例和故障排查

**旧文档备份** → `testing-guide-v1.md`

---

## 技术对比

### 运行时兼容性

| 特性                  | 旧实现 | 新实现 |
| --------------------- | ------ | ------ |
| Node.js 本地开发      | ✅     | ✅     |
| Cloudflare Workers    | ❌     | ✅     |
| Vercel Edge Functions | ❌     | ✅     |
| AWS Lambda            | ✅     | ✅     |
| 任意 HTTP 客户端      | ❌     | ✅     |

### API 调用方式

**旧实现**：

```bash
# 只能在服务器本地使用
curl -X POST http://localhost:4004/api/admin/games/import \
  -d '{"useDefaultPattern": true}'
```

**新实现**：

```bash
# 可以从任何地方调用
curl -X POST https://production.com/api/admin/games/import \
  -H "Content-Type: application/json" \
  -d '{"data": [...]}'
```

### 数据流程

**旧流程**：

```
客户端 → API → 读取服务器文件 → 解析 → 导入数据库
                  ❌ Cloudflare 不支持
```

**新流程**：

```
本地脚本 → 读取文件 → 调用 API（发送数据） → 导入数据库
                      ✅ Cloudflare 完全支持
```

---

## 使用变化

### 开发人员

**之前**：

```bash
# 在服务器上准备文件
cp data/categories.json tools/rewrite/cate-and-tag/output/

# 调用 API（API 读取服务器文件）
curl -X POST http://localhost:4004/api/admin/categories/import \
  -d '{"useDefaultPath": true}'
```

**现在**：

```bash
# 使用工具脚本（脚本读取本地文件并调用 API）
pnpm tsx tools/batch-import/import-categories.ts

# 或直接发送数据
curl -X POST http://localhost:4004/api/admin/categories/import \
  -d @data/categories.json
```

### 生产部署

**之前**：

- 需要将数据文件包含在部署 bundle 中
- 需要配置文件路径
- **Cloudflare 部署会失败** ❌

**现在**：

- 不需要在部署中包含数据文件
- 从外部调用 API
- **Cloudflare 部署正常工作** ✅

---

## 性能影响

### 请求大小

- **Cloudflare Workers 限制**: 最大请求体 100 MB
- **建议批次大小**: 50-100 条游戏（约 1-5 MB）
- **工具脚本自动分批**: 避免超过限制

### 网络开销

- **旧实现**: 无网络传输（本地文件读取）
- **新实现**: HTTP 请求传输数据
- **影响**: 本地开发几乎无感知，生产环境反而更快（无文件 I/O）

### 数据库操作

- **完全相同**: 两种实现的数据库操作逻辑完全一致
- **无性能差异**: 导入速度取决于数据库，不受 API 实现影响

---

## 迁移指南

### 如果你已经在使用旧版本 API

1. **更新 API 调用代码**：

   ```typescript
   // 旧代码
   await fetch('/api/admin/categories/import', {
     method: 'POST',
     body: JSON.stringify({ useDefaultPath: true }),
   });

   // 新代码
   const categories = await readFile('categories.json');
   await fetch('/api/admin/categories/import', {
     method: 'POST',
     body: JSON.stringify({ data: categories }),
   });
   ```

2. **使用新的工具脚本**：

   ```bash
   # 替代手动调用 API
   pnpm tsx tools/batch-import/import-categories.ts
   ```

3. **测试验证**：
   - 本地测试工具脚本
   - 验证数据导入结果
   - 检查关联关系（分类、标签）

---

## 已知限制

### 1. 文件大小限制

**Cloudflare Workers**:

- 单次请求最大 100 MB
- 建议分批处理大文件

**解决方案**:

- 工具脚本自动分批
- 可配置批次大小

### 2. 超时限制

**Cloudflare Workers**:

- 免费版：10 秒 CPU 时间
- 付费版：30 秒 CPU 时间

**解决方案**:

- 减小批次大小
- 多次调用 API

### 3. 并发限制

**建议**:

- 批次间延迟 500ms
- 避免同时导入多种资源

---

## 优势总结

### ✅ 好处

1. **运行时兼容性**: 支持所有现代边缘运行时
2. **部署简单**: 不需要在部署中包含数据文件
3. **灵活性**: 可以从任何客户端调用
4. **安全性**: 数据不存储在服务器文件系统
5. **可扩展性**: 易于添加新的数据源

### ⚠️ 注意事项

1. **网络传输**: 需要通过 HTTP 传输数据（但影响很小）
2. **请求大小**: 需要注意单次请求大小限制
3. **工具依赖**: 本地导入需要使用工具脚本

---

## 测试建议

### 本地测试

```bash
# 1. 启动开发服务器
pnpm dev

# 2. 测试分类导入
pnpm tsx tools/batch-import/import-categories.ts

# 3. 测试标签导入
pnpm tsx tools/batch-import/import-tags.ts

# 4. 测试游戏导入
pnpm tsx tools/batch-import/import-games.ts

# 5. 验证数据
# - 检查数据库记录
# - 验证关联关系
# - 测试 API 响应
```

### 生产测试

```bash
# 1. 设置生产 URL
export API_URL=https://your-production-domain.com

# 2. 使用 skip_existing 策略测试
IMPORT_STRATEGY=skip_existing pnpm tsx tools/batch-import/import-categories.ts

# 3. 验证结果
# 4. 确认后使用 upsert 策略正式导入
```

---

## 相关文档

- [测试指南 v2.0](./testing-guide.md) - 新版使用说明
- [测试指南 v1.0](./testing-guide-v1.md) - 旧版参考（已废弃）
- [实施总结](./implementation-summary.md) - 原始实施文档
- [实施指南](./implementation-guide.md) - 详细实施方案

---

## 变更统计

### 修改的文件

- `src/app/api/admin/categories/import/route.ts` - 重构
- `src/app/api/admin/tags/import/route.ts` - 重构
- `src/app/api/admin/games/import/route.ts` - 重构

### 删除的文件

- `src/lib/import-utils.ts` - 236 行

### 新增的文件

- `tools/batch-import/import-categories.ts` - 145 行
- `tools/batch-import/import-tags.ts` - 145 行
- `tools/batch-import/import-games.ts` - 275 行

### 文档更新

- `docs/biz/project/dev-batch-api/testing-guide.md` - 完全重写
- `docs/biz/project/dev-batch-api/testing-guide-v1.md` - 旧版备份
- `docs/biz/project/dev-batch-api/cloudflare-compatibility-update.md` - 本文档

### 总代码变化

- **删除**: 236 行（import-utils.ts）
- **新增**: 565 行（3 个工具脚本）
- **修改**: 约 300 行（3 个 API routes）

---

## 下一步行动

1. ✅ **本地测试**: 使用工具脚本测试所有导入功能
2. ✅ **验证数据**: 确认导入结果正确
3. 🚀 **部署到生产**: 验证 Cloudflare Workers 兼容性
4. 📊 **监控性能**: 观察生产环境表现
5. 🔄 **更新 CI/CD**: 如有必要，更新自动化脚本

---

**更新者**: Claude
**审核状态**: 待审核
**部署状态**: 待部署
**最后更新**: 2025-11-05
