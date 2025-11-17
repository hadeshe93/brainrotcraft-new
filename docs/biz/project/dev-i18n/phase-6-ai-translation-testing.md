# Phase 6: AI 自动翻译系统 - 测试指南

## 功能概览

Phase 6 实现了基于 AI 的自动翻译系统，允许管理员使用 OpenAI GPT-4 为内容生成高质量翻译。

### 核心功能

1. **AI 翻译服务**：集成 OpenAI GPT-4o-mini 进行翻译
2. **翻译生成 API**：为单个内容项生成翻译
3. **可视化编辑界面**：查看、编辑和保存 AI 生成的翻译
4. **成本跟踪**：显示每次翻译的 token 使用量和成本

## 环境配置

### 1. 配置 OpenAI API Key

在 `.env.local` 文件中添加：

```bash
OPENAI_API_KEY=sk-...your-api-key...
```

获取 API Key：https://platform.openai.com/api-keys

### 2. 重启开发服务器

```bash
pnpm dev
```

## 使用流程

### 1. 访问翻译管理页面

URL: `http://localhost:4004/en/admin/translations`

### 2. 查看翻译状态

页面显示：
- **总体统计**：完全翻译、部分翻译、未翻译的内容数量
- **按内容类型统计**：Categories、Tags、Featured、Games 的翻译进度
- **按语言统计**：每种语言的翻译完成度

### 3. 生成翻译

#### 步骤：

1. 在内容列表中找到需要翻译的项目
2. 点击对应语言卡片上的 **"Translate"** 或 **"Update"** 按钮
3. 在弹出的对话框中，点击 **"Generate Translation with AI"**
4. AI 将自动生成翻译（通常 2-5 秒）
5. 查看生成的翻译结果，包括：
   - 翻译后的字段
   - Token 使用量
   - 估算成本
6. 编辑翻译内容（可选）
7. 点击 **"Save Translation"** 保存到数据库

### 4. 验证翻译结果

保存后：
- 页面自动刷新
- 翻译状态更新为 "Complete"
- 完成度显示为 100%

## 测试用例

### 测试 1：翻译 Category

```bash
# 1. 访问翻译管理页面
# 2. 找到任意 Category（例如："Action Games"）
# 3. 点击 "中文(简体)" 卡片的 "Translate" 按钮
# 4. 生成翻译
# 5. 验证生成的翻译：
#    - metadataTitle: 应该是自然的中文翻译
#    - metadataDescription: 应该是 SEO 友好的中文描述
# 6. 保存并验证
```

### 测试 2：翻译 Game

```bash
# Games 比较特殊，有额外的 name 字段
# 1. 找到任意游戏
# 2. 为日语生成翻译
# 3. 验证生成的字段：
#    - name: 游戏名称的日语翻译
#    - metadataTitle: SEO 标题
#    - metadataDescription: SEO 描述
# 4. 保存并验证游戏名称在前端正确显示
```

### 测试 3：更新已有翻译

```bash
# 1. 找到已完成翻译的内容
# 2. 点击 "Update" 按钮
# 3. 重新生成翻译
# 4. 编辑部分字段
# 5. 保存并验证更新成功
```

### 测试 4：批量过滤和翻译

```bash
# 1. 使用 "Translation Status" 筛选器选择 "Missing"
# 2. 查看所有缺失翻译的内容
# 3. 依次为它们生成翻译
# 4. 切换到 "Complete" 查看已完成的翻译
```

## API 端点

### POST `/api/admin/translations/generate`

生成 AI 翻译

**Request Body:**
```json
{
  "contentType": "category",  // "category" | "tag" | "featured" | "game"
  "contentUuid": "uuid-of-content",
  "targetLocale": "zh"  // 目标语言代码
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "translations": {
      "metadataTitle": "翻译后的标题",
      "metadataDescription": "翻译后的描述",
      "name": "翻译后的名称"  // 仅 Game 有此字段
    },
    "cost": 0.0012,  // USD
    "tokensUsed": 156,
    "sourceContent": {
      "uuid": "...",
      "name": "...",
      "type": "category"
    }
  }
}
```

### curl 测试示例

```bash
# 生成 Category 的中文翻译
curl -X POST http://localhost:4004/api/admin/translations/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "contentType": "category",
    "contentUuid": "CATEGORY_UUID",
    "targetLocale": "zh"
  }' | jq
```

## 错误处理

### 常见错误

1. **OpenAI API is not configured**
   - 原因：缺少 `OPENAI_API_KEY` 环境变量
   - 解决：在 `.env.local` 中配置 API Key

2. **Translation service error**
   - 原因：OpenAI API 调用失败
   - 可能情况：
     - API Key 无效
     - 网络连接问题
     - OpenAI 服务暂时不可用
     - 超出 API 配额

3. **Content not found**
   - 原因：提供的 UUID 不存在
   - 解决：检查 UUID 是否正确

4. **Cannot translate to default locale**
   - 原因：尝试翻译到英语（默认语言）
   - 解决：选择其他目标语言

## 成本估算

### OpenAI GPT-4o-mini 价格

- Input: $0.150 / 1M tokens
- Output: $0.600 / 1M tokens
- Average: ~$0.375 / 1M tokens

### 典型翻译成本

| 内容类型 | 字段数量 | 平均 Tokens | 估算成本 |
|---------|---------|------------|---------|
| Category | 2 | 100-200 | $0.0001 |
| Tag | 2 | 100-200 | $0.0001 |
| Featured | 2 | 150-300 | $0.0002 |
| Game | 3 | 200-400 | $0.0003 |

### 批量翻译成本示例

```
100 个游戏 × 2 种语言 × $0.0003 = $0.06
56 个标签 × 2 种语言 × $0.0001 = $0.01
15 个分类 × 2 种语言 × $0.0001 = $0.003

总计: ~$0.07 (翻译全部内容到两种语言)
```

## 翻译质量优化

### 提示词优化

AI 翻译服务使用了优化的提示词：

1. **保持原意**：维持源内容的含义和语气
2. **自然表达**：使用目标语言的自然和惯用表达
3. **格式保留**：保留 HTML、Markdown 等格式
4. **SEO 优化**：为 SEO 字段优化关键词
5. **JSON 格式**：确保返回有效的 JSON

### 人工审核

建议流程：
1. 使用 AI 生成初始翻译
2. 管理员审核并编辑
3. 保存最终版本

## 技术实现

### 文件结构

```
src/
├── services/
│   ├── ai/
│   │   └── translation.ts           # OpenAI 翻译服务
│   └── content/
│       └── translation-generator.ts # 翻译生成业务逻辑
├── app/
│   └── api/
│       └── admin/
│           └── translations/
│               └── generate/
│                   └── route.ts     # 翻译生成 API
└── components/
    └── admin/
        ├── translation-dashboard.tsx        # 翻译管理主界面
        └── translation-editor-dialog.tsx   # 翻译编辑对话框
```

### 核心函数

1. **translateWithAI**
   - 调用 OpenAI API
   - 处理重试逻辑
   - 计算成本

2. **generateTranslation**
   - 获取源内容
   - 调用翻译服务
   - 返回结果

3. **TranslationEditorDialog**
   - 生成翻译 UI
   - 编辑翻译内容
   - 保存翻译

## 下一步：Phase 7

Phase 6 完成后，接下来是 **Phase 7: 前端集成**：

1. C 端页面语言检测和重定向
2. 多语言内容显示
3. 语言切换器 UI
4. SEO 优化（hreflang 标签）
