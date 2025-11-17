# Batch Import API Testing Guide

## 概述

本文档提供了批量导入 API 的测试指南，包括如何测试分类、标签和游戏的导入功能。

## 前提条件

1. **启动开发服务器**

   ```bash
   pnpm dev
   ```

2. **管理员权限**
   - 方法1：使用具有管理员权限的账号登录（邮箱需要匹配 `ADMIN_EMAIL` 环境变量）
   - 方法2：设置 `BYPASS_ADMIN_AUTH=true` 环境变量（如果代码支持）

## API 端点

### 1. 分类导入 API

**端点**: `POST /api/admin/categories/import`

**默认数据源**: `tools/rewrite/cate-and-tag/output/game-categories.json`

**请求体示例**:

```json
{
  "useDefaultPath": true,
  "strategy": "upsert"
}
```

**使用 curl 测试**:

```bash
curl -X POST http://localhost:4004/api/admin/categories/import \
  -H "Content-Type: application/json" \
  -d '{
    "useDefaultPath": true,
    "strategy": "upsert"
  }'
```

**策略选项**:

- `upsert`: 如果存在则更新，不存在则创建（默认）
- `skip_existing`: 跳过已存在的记录
- `overwrite`: 覆盖已存在的记录

**使用自定义路径**:

```json
{
  "useDefaultPath": false,
  "filePath": "path/to/your/categories.json",
  "strategy": "upsert"
}
```

**查看 API 信息**:

```bash
curl http://localhost:4004/api/admin/categories/import
```

---

### 2. 标签导入 API

**端点**: `POST /api/admin/tags/import`

**默认数据源**: `tools/rewrite/cate-and-tag/output/game-tags.json`

**请求体示例**:

```json
{
  "useDefaultPath": true,
  "strategy": "upsert"
}
```

**使用 curl 测试**:

```bash
curl -X POST http://localhost:4004/api/admin/tags/import \
  -H "Content-Type: application/json" \
  -d '{
    "useDefaultPath": true,
    "strategy": "upsert"
  }'
```

**查看 API 信息**:

```bash
curl http://localhost:4004/api/admin/tags/import
```

---

### 3. 游戏导入 API

**端点**: `POST /api/admin/games/import`

**默认数据源**: `tools/rewrite/geometrylite.io/output/games-*.json`

**请求体示例 - 使用默认模式**:

```json
{
  "useDefaultPattern": true,
  "strategy": "upsert"
}
```

**请求体示例 - 指定特定文件**:

```json
{
  "filePaths": ["tools/rewrite/geometrylite.io/output/games-001.json"],
  "strategy": "upsert"
}
```

**使用 curl 测试（默认模式）**:

```bash
curl -X POST http://localhost:4004/api/admin/games/import \
  -H "Content-Type: application/json" \
  -d '{
    "useDefaultPattern": true,
    "strategy": "upsert"
  }'
```

**使用 curl 测试（指定文件）**:

```bash
curl -X POST http://localhost:4004/api/admin/games/import \
  -H "Content-Type: application/json" \
  -d '{
    "filePaths": ["tools/rewrite/geometrylite.io/output/games-001.json"],
    "strategy": "skip_existing"
  }'
```

**查看可用文件数量**:

```bash
curl http://localhost:4004/api/admin/games/import
```

---

## 使用浏览器 Fetch 测试

浏览器的开发者工具控制台提供了便捷的测试方式，可以直接使用 fetch API 测试导入功能，并自动携带登录 Cookie。

### 前提条件

1. **登录管理员账号**: 在浏览器中登录具有管理员权限的账号
2. **打开开发者工具**: 按 `F12` 或 `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)
3. **切换到 Console 标签页**: 可以直接粘贴和执行 JavaScript 代码

### 通用测试函数

首先，在控制台中定义一个通用的测试函数：

```javascript
// 通用导入测试函数
async function testImportAPI(endpoint, payload) {
  try {
    console.log(`🚀 Testing ${endpoint}...`);
    console.log('📤 Payload:', JSON.stringify(payload, null, 2));

    // const response = await fetch(`http://localhost:4004${endpoint}`, {
    const response = await fetch(`https://gamesramp.com${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // 自动携带 Cookie
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Success!');
      console.log('📊 Result:', result);
      console.table(result.data.items?.slice(0, 10) || []); // 显示前10条结果
      console.log(`\n📈 Summary: ${result.message}`);
    } else {
      console.error('❌ Failed!');
      console.error('Error:', result);
    }

    return result;
  } catch (error) {
    console.error('💥 Request failed:', error);
    throw error;
  }
}

// 查看 API 信息的函数
async function getAPIInfo(endpoint) {
  try {
    const response = await fetch(`http://localhost:4004${endpoint}`, {
      method: 'GET',
      credentials: 'include',
    });
    const result = await response.json();
    console.log('ℹ️ API Info:', result);
    return result;
  } catch (error) {
    console.error('Failed to get API info:', error);
    throw error;
  }
}
```

### 1. 测试分类导入

```javascript
// 查看分类导入 API 信息
await getAPIInfo('/api/admin/categories/import');

// 执行分类导入（使用默认路径）
await testImportAPI('/api/admin/categories/import', {
  useDefaultPath: true,
  strategy: 'upsert',
});

// 使用自定义路径
await testImportAPI('/api/admin/categories/import', {
  useDefaultPath: false,
  filePath: 'path/to/your/categories.json',
  strategy: 'upsert',
});

// 跳过已存在的分类
await testImportAPI('/api/admin/categories/import', {
  useDefaultPath: true,
  strategy: 'skip_existing',
});
```

### 2. 测试标签导入

```javascript
// 查看标签导入 API 信息
await getAPIInfo('/api/admin/tags/import');

// 执行标签导入（使用默认路径）
await testImportAPI('/api/admin/tags/import', {
  useDefaultPath: true,
  strategy: 'upsert',
});

// 跳过已存在的标签
await testImportAPI('/api/admin/tags/import', {
  useDefaultPath: true,
  strategy: 'skip_existing',
});
```

### 3. 测试游戏导入

```javascript
// 查看游戏导入 API 信息（显示可用文件数量）
await getAPIInfo('/api/admin/games/import');

// 使用默认模式导入所有游戏文件
await testImportAPI('/api/admin/games/import', {
  useDefaultPattern: true,
  strategy: 'upsert',
});

// 导入指定的文件
await testImportAPI('/api/admin/games/import', {
  filePaths: ['tools/rewrite/geometrylite.io/output/games-001.json'],
  strategy: 'upsert',
});

// 跳过已存在的游戏
await testImportAPI('/api/admin/games/import', {
  useDefaultPattern: true,
  strategy: 'skip_existing',
});
```

### 完整导入流程

一次性执行完整的导入流程（先分类、再标签、最后游戏）：

```javascript
// 完整导入流程
async function fullImport() {
  console.log('🎯 开始完整导入流程...\n');

  // 1. 导入分类
  console.log('📁 Step 1/3: 导入分类...');
  const categoriesResult = await testImportAPI('/api/admin/categories/import', {
    useDefaultPath: true,
    strategy: 'upsert',
  });
  console.log(`✅ 分类导入完成: ${categoriesResult.data?.total || 0} 条\n`);

  // 2. 导入标签
  console.log('🏷️  Step 2/3: 导入标签...');
  const tagsResult = await testImportAPI('/api/admin/tags/import', {
    useDefaultPath: true,
    strategy: 'upsert',
  });
  console.log(`✅ 标签导入完成: ${tagsResult.data?.total || 0} 条\n`);

  // 3. 导入游戏
  console.log('🎮 Step 3/3: 导入游戏...');
  const gamesResult = await testImportAPI('/api/admin/games/import', {
    useDefaultPattern: true,
    strategy: 'upsert',
  });
  console.log(`✅ 游戏导入完成: ${gamesResult.data?.total || 0} 条\n`);

  // 汇总结果
  console.log('🎉 完整导入流程完成！');
  console.log('📊 总结:');
  console.table({
    分类: `${categoriesResult.data?.created || 0} 创建, ${categoriesResult.data?.updated || 0} 更新`,
    标签: `${tagsResult.data?.created || 0} 创建, ${tagsResult.data?.updated || 0} 更新`,
    游戏: `${gamesResult.data?.created || 0} 创建, ${gamesResult.data?.updated || 0} 更新`,
  });
}

// 执行完整导入
await fullImport();
```

### 高级用法：批量测试不同策略

```javascript
// 测试所有策略
async function testAllStrategies(endpoint, basePayload) {
  const strategies = ['upsert', 'skip_existing', 'overwrite'];
  const results = {};

  for (const strategy of strategies) {
    console.log(`\n🔄 Testing strategy: ${strategy}`);
    const result = await testImportAPI(endpoint, {
      ...basePayload,
      strategy,
    });
    results[strategy] = result.data;
  }

  console.log('\n📊 Strategy Comparison:');
  console.table(results);
  return results;
}

// 示例：测试分类导入的所有策略
await testAllStrategies('/api/admin/categories/import', {
  useDefaultPath: true,
});
```

### 错误处理和重试

```javascript
// 带重试的导入函数
async function importWithRetry(endpoint, payload, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`\n🔄 Attempt ${i + 1}/${maxRetries}...`);
      const result = await testImportAPI(endpoint, payload);

      if (result.success) {
        console.log('✅ Import succeeded!');
        return result;
      } else {
        console.warn(`⚠️ Attempt ${i + 1} failed, retrying...`);
      }
    } catch (error) {
      console.error(`❌ Attempt ${i + 1} error:`, error);
      if (i === maxRetries - 1) {
        throw error;
      }
      // 等待 2 秒后重试
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

// 使用示例
await importWithRetry(
  '/api/admin/games/import',
  {
    useDefaultPattern: true,
    strategy: 'upsert',
  },
  3,
);
```

### 性能监控

```javascript
// 带性能监控的导入函数
async function importWithPerformance(endpoint, payload) {
  const startTime = performance.now();

  console.log('⏱️  Starting import...');
  const result = await testImportAPI(endpoint, payload);

  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log(`\n⏱️  Performance:`);
  console.log(`  - Total time: ${duration}s`);
  if (result.data?.total) {
    const avgTime = (duration / result.data.total).toFixed(3);
    console.log(`  - Average per item: ${avgTime}s`);
    console.log(`  - Items per second: ${(result.data.total / duration).toFixed(2)}`);
  }

  return result;
}

// 使用示例
await importWithPerformance('/api/admin/games/import', {
  filePaths: ['tools/rewrite/geometrylite.io/output/games-001.json'],
  strategy: 'upsert',
});
```

### 验证导入结果

```javascript
// 验证导入结果的函数
async function verifyImport() {
  console.log('🔍 验证导入结果...\n');

  // 检查分类
  const categoriesResp = await fetch('http://localhost:4004/api/categories', {
    credentials: 'include',
  });
  const categories = await categoriesResp.json();
  console.log(`📁 分类数量: ${categories.length || 0}`);

  // 检查标签
  const tagsResp = await fetch('http://localhost:4004/api/tags', {
    credentials: 'include',
  });
  const tags = await tagsResp.json();
  console.log(`🏷️  标签数量: ${tags.length || 0}`);

  // 检查游戏
  const gamesResp = await fetch('http://localhost:4004/api/games?page=1&pageSize=10', {
    credentials: 'include',
  });
  const games = await gamesResp.json();
  console.log(`🎮 游戏数量: ${games.data?.pagination?.total || 0}`);
  console.log('\n前10个游戏:');
  console.table(
    games.data?.data?.slice(0, 10).map((g) => ({
      名称: g.name,
      Slug: g.slug,
      状态: g.status,
    })),
  );
}

// 执行验证
await verifyImport();
```

### 使用技巧

#### 1. 保存测试函数

将上述函数保存为浏览器书签（Snippet）：

1. 打开 Chrome DevTools → Sources → Snippets
2. 创建新的 Snippet，粘贴测试函数
3. 右键点击 Snippet 名称 → Run

#### 2. 快速访问历史命令

在控制台中按 `↑` 和 `↓` 箭头键可以浏览历史命令。

#### 3. 清除控制台输出

使用 `clear()` 或 `Ctrl+L` / `Cmd+K` 清除控制台输出。

#### 4. 复制对象到剪贴板

```javascript
// 复制导入结果到剪贴板
const result = await testImportAPI('/api/admin/games/import', {
  useDefaultPattern: true,
  strategy: 'upsert',
});
copy(result); // 复制到剪贴板
```

### 常见问题

**Q: 出现 CORS 错误怎么办？**
A: 确保开发服务器已启动，并且 API 请求的域名与当前页面相同（都是 localhost:4004）。

**Q: Cookie 没有自动携带？**
A: 检查 `credentials` 选项是否设置为 `'include'` 或 `'same-origin'`。

**Q: 如何查看请求详情？**
A: 打开 Network 标签页，勾选 "Preserve log"，可以查看所有请求的详细信息。

---

## 推荐测试流程

### 第一次完整导入

1. **导入分类** (必须先执行，因为游戏依赖分类)

   ```bash
   curl -X POST http://localhost:4004/api/admin/categories/import \
     -H "Content-Type: application/json" \
     -d '{"useDefaultPath": true, "strategy": "upsert"}'
   ```

2. **导入标签** (必须先执行，因为游戏依赖标签)

   ```bash
   curl -X POST http://localhost:4004/api/admin/tags/import \
     -H "Content-Type: application/json" \
     -d '{"useDefaultPath": true, "strategy": "upsert"}'
   ```

3. **导入游戏** (在分类和标签导入完成后)
   ```bash
   curl -X POST http://localhost:4004/api/admin/games/import \
     -H "Content-Type: application/json" \
     -d '{"useDefaultPattern": true, "strategy": "upsert"}'
   ```

### 增量更新

如果数据已经存在，使用 `skip_existing` 策略只导入新数据：

```bash
# 跳过已存在的分类
curl -X POST http://localhost:4004/api/admin/categories/import \
  -H "Content-Type: application/json" \
  -d '{"useDefaultPath": true, "strategy": "skip_existing"}'

# 跳过已存在的标签
curl -X POST http://localhost:4004/api/admin/tags/import \
  -H "Content-Type: application/json" \
  -d '{"useDefaultPath": true, "strategy": "skip_existing"}'

# 跳过已存在的游戏
curl -X POST http://localhost:4004/api/admin/games/import \
  -H "Content-Type: application/json" \
  -d '{"useDefaultPattern": true, "strategy": "skip_existing"}'
```

### 覆盖更新

如果需要强制更新已存在的数据，使用 `overwrite` 策略：

```bash
curl -X POST http://localhost:4004/api/admin/categories/import \
  -H "Content-Type: application/json" \
  -d '{"useDefaultPath": true, "strategy": "overwrite"}'
```

---

## 响应格式

### 成功响应示例

```json
{
  "success": true,
  "data": {
    "total": 15,
    "created": 10,
    "updated": 3,
    "skipped": 2,
    "failed": 0,
    "items": [
      {
        "name": "Platform",
        "slug": "platform",
        "status": "created",
        "uuid": "abc123..."
      }
    ]
  },
  "message": "Successfully imported 15 categories (10 created, 3 updated, 2 skipped, 0 failed)"
}
```

### 错误响应示例

```json
{
  "success": false,
  "error": "Admin access required"
}
```

---

## 验证导入结果

### 1. 检查数据库

使用 Drizzle Studio 或直接查询数据库：

```bash
# 启动 Drizzle Studio
pnpm drizzle-kit studio
```

### 2. 查看日志

服务器控制台会输出详细的导入日志，包括：

- 读取的文件数量
- 每个项目的处理状态
- 任何警告或错误信息

### 3. API 测试

使用 GET 请求查看已导入的数据：

```bash
# 查看分类列表
curl http://localhost:4004/api/categories

# 查看标签列表
curl http://localhost:4004/api/tags

# 查看游戏列表
curl http://localhost:4004/api/games
```

---

## 常见问题

### 1. 认证失败

**问题**: `Admin access required`

**解决方案**:

- 确保已登录具有管理员权限的账号
- 检查 `ADMIN_EMAIL` 环境变量是否正确设置
- 或设置 `BYPASS_ADMIN_AUTH=true` 环境变量（如果支持）

### 2. 文件未找到

**问题**: `No files found matching pattern`

**解决方案**:

- 检查文件路径是否正确
- 确保文件存在于指定位置
- 使用绝对路径或从项目根目录开始的相对路径

### 3. 数据格式错误

**问题**: `Invalid JSON format`

**解决方案**:

- 验证 JSON 文件格式是否正确
- 确保所有必需字段都存在
- 检查是否有语法错误

### 4. 游戏导入时分类/标签未找到

**问题**: 响应中包含警告 `Category not found: xxx` 或 `Tag not found: xxx`

**解决方案**:

- 确保在导入游戏之前已经导入了分类和标签
- 检查游戏数据中的分类/标签 slug 是否与数据库中的匹配
- 分类和标签的 slug 会自动转换为小写

---

## 性能考虑

### 批量导入大量数据

- **游戏导入**: 一次可以导入多个文件中的所有游戏
- **处理时间**: 取决于数据量，通常每个游戏需要 100-500ms
- **建议**: 如果数据量很大，考虑分批导入

### 并发控制

- API 按顺序处理每个项目，避免数据库并发问题
- 可以同时调用不同的 API（例如分类和标签可以并行导入）

---

## 调试技巧

### 1. 启用详细日志

查看服务器控制台输出的详细日志信息。

### 2. 使用 Postman 或 Insomnia

这些工具提供更友好的 API 测试界面，可以：

- 保存请求历史
- 查看格式化的响应
- 轻松修改请求参数

### 3. 单项测试

创建只包含一个项目的测试文件，验证导入逻辑：

```json
{
  "categories": [
    {
      "name": "Test Category",
      "slug": "test-category",
      "content": "Test content",
      "metaTitle": "Test Meta Title",
      "metaDescription": "Test meta description"
    }
  ]
}
```

---

## 下一步

完成测试后，您可以：

1. 将导入流程集成到 CI/CD 管道
2. 创建定时任务自动同步数据
3. 添加导入前的数据验证步骤
4. 实现导入进度的实时监控

---

**更新日期**: 2025-11-04
**版本**: 1.1.0 - 新增浏览器 Fetch 测试章节
