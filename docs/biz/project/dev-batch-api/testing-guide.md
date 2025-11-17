# 批量导入 API 测试指南（已更新：Cloudflare Workers 兼容版）

> **更新日期**: 2025-11-05
> **版本**: v2.0 - Cloudflare Workers Compatible

## 重要更新说明

### 变更内容

**v2.0 (2025-11-05):**

- ✅ **API 改为从请求体接收数据**（不再依赖文件系统）
- ✅ **完全兼容 Cloudflare Workers 运行时**
- ✅ **新增工具脚本**用于本地批量导入
- ❌ **移除**文件路径参数和 glob 模式支持
- ❌ **删除** `import-utils.ts`（不再需要）

### 为什么要改？

原实现使用 Node.js 文件系统 API（`fs`, `glob`, `path.join(process.cwd())`），在 Cloudflare Workers 中无法运行。新版本通过 HTTP 请求体传输数据，确保在任何运行时环境下都能正常工作。

---

## 快速开始

### 方式 1：使用工具脚本（推荐）

最简单的方式是使用提供的工具脚本：

\`\`\`bash

# 1. 导入分类

pnpm tsx tools/batch-import/import-categories.ts

# 2. 导入标签

pnpm tsx tools/batch-import/import-tags.ts

# 3. 导入特性合集（Featured Collections）

pnpm tsx tools/batch-import/import-featured.ts

# 4. 导入游戏

pnpm tsx tools/batch-import/import-games.ts
\`\`\`

### 方式 2：直接调用 API

如果你需要更灵活的控制，可以直接调用 API：

\`\`\`bash

# 导入分类示例

curl -X POST http://localhost:4004/api/admin/categories/import \\
-H "Content-Type: application/json" \\
-d '{
"data": [
{
"name": "Action",
"slug": "action",
"content": "Action games...",
"metaTitle": "Action Games",
"metaDescription": "Exciting action games"
}
],
"strategy": "upsert"
}'
\`\`\`

---

## 完整导入流程

### 本地开发环境

1. **启动开发服务器**:
   \`\`\`bash
   pnpm dev
   \`\`\`

2. **按顺序执行导入**（分类、标签和特性合集必须先导入）:
   \`\`\`bash

   # Step 1: 导入分类

   pnpm tsx tools/batch-import/import-categories.ts

   # Step 2: 导入标签

   pnpm tsx tools/batch-import/import-tags.ts

   # Step 3: 导入特性合集（Featured Collections）

   pnpm tsx tools/batch-import/import-featured.ts

   # Step 4: 导入游戏

   pnpm tsx tools/batch-import/import-games.ts
   \`\`\`

### 生产环境

1. **设置环境变量**:
   \`\`\`bash
   export API_URL=https://your-production-domain.com
   \`\`\`

2. **执行导入**:
   \`\`\`bash
   pnpm tsx tools/batch-import/import-categories.ts
   pnpm tsx tools/batch-import/import-tags.ts
   pnpm tsx tools/batch-import/import-featured.ts
   pnpm tsx tools/batch-import/import-games.ts
   \`\`\`

---

## 工具脚本配置

### 环境变量

\`\`\`bash

# 设置 API URL（默认: http://localhost:4004）

export API_URL=https://your-production-domain.com

# 设置导入策略（默认: upsert）

export IMPORT_STRATEGY=skip_existing

# 设置游戏导入的批处理大小（默认: 50）

export BATCH_SIZE=100
\`\`\`

### 导入策略说明

- **upsert（默认）**: 存在则更新，不存在则创建
- **skip_existing**: 存在则跳过，不存在则创建
- **overwrite**: 强制更新或创建

---

## API 接口文档

### 1. 导入分类

**端点**: `POST /api/admin/categories/import`

**请求示例**:
\`\`\`json
{
"data": [
{
"name": "Action",
"slug": "action",
"content": "Action games content...",
"metaTitle": "Action Games",
"metaDescription": "Play exciting action games"
}
],
"strategy": "upsert"
}
\`\`\`

### 2. 导入标签

**端点**: `POST /api/admin/tags/import`

**请求格式**: 与分类相同

### 3. 导入特性合集（Featured Collections）

**端点**: `POST /api/admin/featured/import`

**请求示例**:
\`\`\`json
{
"data": [
{
"name": "Hot",
"slug": "hot",
"content": "Hot games content...",
"metaTitle": "Hot Games",
"metaDescription": "Play the hottest games right now"
}
],
"strategy": "upsert"
}
\`\`\`

### 4. 导入游戏

**端点**: `POST /api/admin/games/import`

**请求示例**:
\`\`\`json
{
"data": [
{
"name": "Geometry Dash",
"slug": "geometry-dash",
"thumbnail": "https://example.com/image.png",
"source": "https://example.com/game",
"status": "published",
"categories": ["action", "arcade"],
"tags": ["rhythm", "challenging"],
"introduction": {
"metaTitle": "Play Geometry Dash Online",
"metaDescription": "Jump and fly through danger...",
"content": "Full game description..."
}
}
],
"strategy": "upsert"
}
\`\`\`

---

## 相关文档

- [实施总结](./implementation-summary.md)
- [实施指南](./implementation-guide.md)
- [旧版测试指南](./testing-guide-v1.md)

---

**最后更新**: 2025-11-05
**文档版本**: v2.0
**API 兼容性**: Cloudflare Workers ✅
