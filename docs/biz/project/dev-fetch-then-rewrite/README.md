# LLM 内容改写系统实现指引

## 一、需求概述

### 目标
在从母站点导入数据到子站点时，利用 LLM 对内容进行 SEO 优化改写，避免搜索引擎判定为重复内容而产生惩罚。

### 改写范围
- ✅ **分类（Categories）**：`metadataTitle`, `metadataDescription`, `content`
- ✅ **标签（Tags）**：`metadataTitle`, `metadataDescription`, `content`
- ✅ **特性合集（Featured）**：`metadataTitle`, `metadataDescription`, `content`
- ✅ **游戏（Games）**：`introduction.metaTitle`, `introduction.metaDescription`, `introduction.content`

### 核心策略
- **改写时机**：同步改写（导入时立即执行）
- **改写策略**：仅对新记录进行改写（已存在记录保持原样）
- **改写深度**：SEO 优化改写（注重关键词密度、标题吸引力、结构优化）
- **技术方案**：复用现有 `tools/ai` 模块和 `tools/rewrite` 实现模式

## 二、技术架构设计

### 2.1 系统架构图

```
┌─────────────────────────────────────────────┐
│           Fetch API Endpoints               │
│  (从母站点拉取：categories/tags/featured/games) │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│         Admin Import API Endpoints          │
│  POST /api/admin/fetch/{entity}             │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│      Content Rewrite Service (新增)         │
│  src/services/content/rewriter.ts           │
│  - rewriteSEOContent()                      │
│  - batchRewriteContent()                    │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│         Content Import Services             │
│  importCategories/Tags/Featured/Games()     │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│            Database (D1)                    │
└─────────────────────────────────────────────┘
```

### 2.2 改写流程（含审核环节）

```
原流程（单 API）：
1. 拉取数据 → 2. 检查新记录 → 3. 改写 → 4. 直接入库

新流程（双 API + 审核）：
┌─────────────────────────────────────────────────────────┐
│ API 1: 预处理与改写（/api/admin/fetch/{entity}/preview） │
├─────────────────────────────────────────────────────────┤
│ 1. 拉取数据 → 2. 检查新记录 → 3. 执行改写              │
│                      ↓                                   │
│              4. 返回对比数据供前端展示                   │
└─────────────────────────────────────────────────────────┘
                          ↓
                    前端审核界面
                          ↓
┌─────────────────────────────────────────────────────────┐
│ API 2: 确认导入（/api/admin/fetch/{entity}/confirm）     │
├─────────────────────────────────────────────────────────┤
│ 5. 接收审核决策 → 6. 处理重新改写 → 7. 导入数据库      │
└─────────────────────────────────────────────────────────┘
```

### 2.3 实体特定的工作流程

不同实体类型采用不同的处理模式：

#### A. 批量处理模式（分类/标签/特性合集）

```
特点：批量拉取，批量改写，批量导入
流程：
1. 拉取所有数据（或按 UUID 过滤）
2. 批量改写所有新记录（使用 p-limit 并发控制）
3. 批量展示审核界面
4. 批量确认导入

适用：categories, tags, featured
```

#### B. 单项处理模式（游戏）

```
特点：单个拉取，依赖检查，单个导入
流程：
1. 按 UUID 拉取单个游戏
2. 检查依赖是否存在（categories, tags, featured）
   ↓ 如果缺失依赖
3. 展示缺失依赖表格，引导用户先导入
4. 用户点击每个依赖的"导入"按钮
   → 进入对应的 preview/confirm 流程（含改写）
5. 所有依赖导入完成后，继续游戏导入
6. 改写游戏 introduction 内容
7. 展示单个审核界面
8. 确认导入（包含关系表）

特殊性：
- 依赖必须先存在（通过改写流程导入）
- 使用独立的 introductions 表存储内容
- 管理 junction 表（gamesToCategories, gamesToTags, gamesToFeatured）
- 确保所有内容都经过改写，避免重复
```

## 三、核心模块设计

### 3.1 内容改写服务 (`src/services/content/rewriter.ts`)

**基于现有 `tools/ai` 模块实现**：

```typescript
import { smartChat } from '@/tools/ai';
import type { ChatMessage } from '@/tools/ai/types';

interface RewriteOptions {
  entity: 'category' | 'tag' | 'featured' | 'game';
  originalName: string;
  seoOptimize: boolean;
  targetKeywords?: string[];
}

interface SEOContent {
  metadataTitle: string;
  metadataDescription: string;
  content: string;
}

class ContentRewriter {
  private model = 'google/gemini-2.5-pro'; // 使用高质量模型
  private temperature = 0.5; // 平衡创造性和一致性

  /**
   * 核心改写函数 - 参考 tools/rewrite/geometrylite.io/lib/gemini-rewriter.ts
   */
  async rewriteSEOContent(
    originalContent: SEOContent,
    options: RewriteOptions
  ): Promise<SEOContent> {
    const prompt = this.buildRewritePrompt(originalContent, options);

    const response = await smartChat({
      messages: [{ role: 'user', content: prompt }],
      model: this.model,
      temperature: this.temperature,
      maxTokens: 2000,
    });

    // 解析 JSON 响应（参考现有模式）
    const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response.content;

    try {
      const parsed = JSON.parse(jsonStr.trim());
      return {
        metadataTitle: parsed.metadataTitle,
        metadataDescription: parsed.metadataDescription,
        content: parsed.content,
      };
    } catch (error) {
      console.error('[Rewriter] Parse error, falling back to original:', error);
      return originalContent; // 降级策略
    }
  }

  /**
   * 批量改写（参考 tools/rewrite/geometrylite.io/rewrite-games.ts）
   */
  async batchRewriteContent<T extends SEOContent>(
    items: T[],
    options: RewriteOptions,
    onProgress?: (current: number, total: number) => void
  ): Promise<T[]> {
    const pLimit = (await import('p-limit')).default;
    const limit = pLimit(4); // 并发限制

    const results: T[] = [];
    let processed = 0;

    const tasks = items.map((item, index) =>
      limit(async () => {
        try {
          const rewritten = await this.rewriteSEOContent(item, options);
          results[index] = { ...item, ...rewritten };
        } catch (error) {
          console.error(`[Rewriter] Failed for item ${index}:`, error);
          results[index] = item; // 失败时保留原始内容
        }
        processed++;
        onProgress?.(processed, items.length);
      })
    );

    await Promise.all(tasks);
    return results;
  }
}
```

### 3.2 改写提示词模板 (`src/services/content/rewrite-prompts.ts`)

```typescript
/**
 * 基于 tools/rewrite/geometrylite.io/lib/prompt-builder.ts 严格对齐
 * 生成 SEO 优化的内容改写提示词
 */
export class RewritePromptBuilder {
  /**
   * 构建内容改写提示词
   * @param entity - 实体类型 (category/tag/featured/game)
   * @param originalName - 原始名称
   * @param originalContent - 原始内容
   * @returns 结构化提示词
   */
  buildRewritePrompt(
    entity: string,
    originalName: string,
    originalContent: { metadataTitle: string; metadataDescription: string; content: string }
  ): string {
    const entityDisplay = {
      category: 'Game Category',
      tag: 'Game Tag',
      featured: 'Featured Collection',
      game: 'Game'
    }[entity] || entity;

    // 根据实体类型决定内容要求
    const contentRequirements = entity === 'game' ? {
      shortDescription: '1-2 engaging sentences (20-40 words) that hook players immediately',
      whatIs: 'Comprehensive introduction covering: concept, genre, platform, main objective, target audience (150-250 words)',
      howToPlay: 'Detailed gameplay instructions including: basic controls, mechanics, progression system, beginner tips (200-300 words)',
      whatMakesSpecial: 'Unique selling points: standout features, what differentiates from similar items, why players love it (150-200 words)',
      faqs: '3-5 FAQs covering: platform compatibility, difficulty, multiplayer, updates, tips (50-100 words per answer)'
    } : {
      // 对于分类/标签/特性合集，使用更通用的结构
      introduction: 'Comprehensive overview of this ' + entityDisplay.toLowerCase() + ' (150-200 words)',
      features: 'Key features and characteristics (150-200 words)',
      benefits: 'Value proposition and why it matters to players (100-150 words)'
    };

    return `You are a professional game content writer creating engaging descriptions for players.

**TASK**: Research and rewrite comprehensive content for the ${entityDisplay} "${originalName}".

**ORIGINAL CONTENT** (for reference):
- Title: ${originalContent.metadataTitle}
- Description: ${originalContent.metadataDescription}
- Content:
${originalContent.content}

**INSTRUCTIONS**:
1. Use Google Search to research the latest information about "${originalName}"
2. Focus on what players want to know: gameplay, features, tips, and unique aspects
3. Write in an engaging, player-focused tone
4. Ensure accuracy by verifying information from multiple sources
5. Create completely new phrasing while keeping the same factual information

**OUTPUT REQUIREMENTS**:

Generate a JSON object with the following structure:

\`\`\`json
{
  "content": "${entity === 'game' ? 'Rewritten comprehensive content following the structure below' : 'Rewritten content maintaining original structure and information'}",
  "metadataTitle": "SEO-optimized title (50-60 characters, include '${originalName}' and key benefit)",
  "metadataDescription": "Compelling meta description (150-160 characters, include main features and call-to-action)"
}
\`\`\`

${entity === 'game' ? `
**CONTENT STRUCTURE FOR GAMES**:
The "content" field should be a comprehensive rewrite in Markdown format covering:

1. **Short Description**: ${contentRequirements.shortDescription}
2. **What Is ${originalName}**: ${contentRequirements.whatIs}
3. **How to Play**: ${contentRequirements.howToPlay}
4. **What Makes It Special**: ${contentRequirements.whatMakesSpecial}
5. **FAQs**: ${contentRequirements.faqs}
   Format as:
   ## FAQs
   ### [Common player question]
   [Clear, helpful answer (50-100 words)]

   Include 3-5 FAQs covering: platform compatibility, difficulty level, multiplayer options, updates, tips
` : `
**CONTENT STRUCTURE FOR ${entityDisplay.toUpperCase()}**:
The "content" field should maintain the original structure while rewriting to cover:

1. **Introduction**: ${contentRequirements.introduction}
2. **Key Features**: ${contentRequirements.features}
3. **Benefits**: ${contentRequirements.benefits}
`}

**META GUIDELINES**:
- **metadataTitle**: 50-60 characters, format: "${originalName} - [Key Feature/Benefit]"
- **metadataDescription**: 150-160 characters, include game/category name, main features, and call-to-action
- Brand name is optional (low priority, only if space permits)

**STYLE GUIDELINES**:
- Write from player's perspective
- Use active voice and present tense
- Be specific and avoid generic descriptions
- Include concrete examples and details
- Make content scannable with clear sections
- Maintain professional gaming industry tone

**RESEARCH FOCUS**:
- Current gameplay mechanics and features
- Player reviews and common questions
- Recent updates or versions
- Platform availability
- Difficulty level and learning curve
- Community feedback and tips

Return ONLY the JSON object, no additional text.`;
  }
}
```

### 3.3 API 拆分设计（支持审核流程）

#### A. 预处理与改写 API

```typescript
// POST /api/admin/fetch/{entity}/preview
// 请求体
{
  "uuids"?: string[];  // 可选，指定要处理的记录
  "enableRewrite": boolean;  // 是否启用改写
}

// 响应体
{
  "success": true,
  "items": [
    {
      "uuid": "xxx-001",
      "name": "Action Games",
      "status": "new",  // new | existing | updated
      "original": {
        "metadataTitle": "Original title...",
        "metadataDescription": "Original description...",
        "content": "Original content..."
      },
      "rewritten": {  // 如果 enableRewrite 为 true
        "metadataTitle": "Rewritten title...",
        "metadataDescription": "Rewritten description...",
        "content": "Rewritten content..."
      },
      "rewriteAttempts": 1  // 改写尝试次数
    }
  ],
  "summary": {
    "total": 10,
    "new": 5,
    "existing": 5,
    "rewritten": 5
  }
}
```

#### B. 确认导入 API

```typescript
// POST /api/admin/fetch/{entity}/confirm
// 请求体
{
  "items": [
    {
      "uuid": "xxx-001",
      "action": "use_rewritten" | "use_original" | "skip"
    },
    {
      "uuid": "xxx-002",
      "action": "rewrite",  // 需要重新改写
      "rewriteOptions"?: {  // 可选的改写参数
        "temperature"?: 0.3 | 0.5 | 0.7
      }
    }
  ]
}

// 响应体（重新改写的情况）
{
  "success": true,
  "rewrittenItems": [  // 只返回重新改写的项
    {
      "uuid": "xxx-002",
      "rewritten": {
        "metadataTitle": "New rewritten title...",
        "metadataDescription": "New rewritten description...",
        "content": "New rewritten content..."
      }
    }
  ],
  "needsConfirmation": true  // 需要再次确认
}

// 响应体（最终导入的情况）
{
  "success": true,
  "imported": 5,
  "skipped": 2,
  "failed": 0,
  "details": {
    "created": ["uuid-1", "uuid-2"],
    "updated": ["uuid-3"],
    "skipped": ["uuid-4", "uuid-5"]
  }
}
```

### 3.4 前端审核界面交互流程

```typescript
// 前端状态管理
interface ReviewState {
  items: ReviewItem[];
  currentIndex: number;
  decisions: Map<string, 'use_original' | 'use_rewritten' | 'skip'>;
  rewritingItems: Set<string>;
}

interface ReviewItem {
  uuid: string;
  name: string;
  original: SEOContent;
  rewritten?: SEOContent;
  decision?: 'use_original' | 'use_rewritten' | 'skip';
}

// 处理流程
async function handleFetchAndReview() {
  // 1. 调用预处理 API
  const previewResponse = await fetch('/api/admin/fetch/categories/preview', {
    method: 'POST',
    body: JSON.stringify({ enableRewrite: true })
  });

  const { items } = await previewResponse.json();

  // 2. 展示审核对话框
  const decisions = await showReviewDialog(items);

  // 3. 处理需要重新改写的项
  const rewriteItems = decisions.filter(d => d.action === 'rewrite');
  if (rewriteItems.length > 0) {
    const rewriteResponse = await fetch('/api/admin/fetch/categories/confirm', {
      method: 'POST',
      body: JSON.stringify({ items: rewriteItems })
    });

    const { rewrittenItems } = await rewriteResponse.json();
    // 更新界面，再次审核
    await showReviewDialog(rewrittenItems);
  }

  // 4. 最终确认导入
  const finalResponse = await fetch('/api/admin/fetch/categories/confirm', {
    method: 'POST',
    body: JSON.stringify({ items: finalDecisions })
  });

  // 5. 显示导入结果
  showImportResults(finalResponse);
}
```

### 3.5 缺失依赖处理 UI 组件

当游戏导入时发现缺失依赖，前端展示表格并引导用户先导入依赖：

```tsx
interface MissingDependency {
  type: 'category' | 'tag' | 'featured';
  uuid: string;
  name: string;
  status: 'missing' | 'importing' | 'imported';
}

function MissingDependenciesDialog({
  dependencies,
  onComplete,
  onCancel
}: {
  dependencies: MissingDependency[];
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [items, setItems] = useState(dependencies);
  const [importing, setImporting] = useState<string | null>(null);

  const handleImport = async (dep: MissingDependency) => {
    setImporting(dep.uuid);

    try {
      // 根据类型调用对应的 preview API
      const endpoint = `/api/admin/fetch/${dep.type === 'featured' ? 'featured' : dep.type === 'tag' ? 'tags' : 'categories'}/preview`;

      const previewResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuids: [dep.uuid],
          enableRewrite: true
        })
      });

      const previewData = await previewResponse.json();

      // 展示改写对比对话框（复用已有组件）
      const decision = await showReviewDialog(previewData.items);

      // 调用 confirm API 完成导入
      const confirmEndpoint = endpoint.replace('/preview', '/confirm');
      await fetch(confirmEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: decision })
      });

      // 更新状态
      setItems(prev => prev.map(item =>
        item.uuid === dep.uuid
          ? { ...item, status: 'imported' as const }
          : item
      ));
    } catch (error) {
      console.error('Failed to import dependency:', error);
      // 展示错误提示
    } finally {
      setImporting(null);
    }
  };

  const allImported = items.every(item => item.status === 'imported');

  return (
    <Dialog open={true}>
      <DialogHeader>
        <DialogTitle>发现缺失的依赖项</DialogTitle>
        <DialogDescription>
          请先导入以下依赖项，然后才能导入游戏
        </DialogDescription>
      </DialogHeader>

      <DialogContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>类型</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>UUID</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((dep) => (
              <TableRow key={dep.uuid}>
                <TableCell>
                  <Badge variant={dep.type === 'category' ? 'default' : dep.type === 'tag' ? 'secondary' : 'outline'}>
                    {dep.type === 'category' ? '分类' : dep.type === 'tag' ? '标签' : '特性合集'}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{dep.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {dep.uuid}
                </TableCell>
                <TableCell>
                  {dep.status === 'imported' ? (
                    <Badge variant="success">已导入</Badge>
                  ) : dep.status === 'importing' ? (
                    <Badge variant="warning">导入中...</Badge>
                  ) : (
                    <Badge variant="destructive">缺失</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {dep.status === 'missing' && (
                    <Button
                      size="sm"
                      onClick={() => handleImport(dep)}
                      disabled={importing !== null}
                      loading={importing === dep.uuid}
                    >
                      导入
                    </Button>
                  )}
                  {dep.status === 'imported' && (
                    <CheckIcon className="h-4 w-4 text-green-500" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button
          onClick={onComplete}
          disabled={!allImported}
        >
          {allImported ? '继续导入游戏' : `请先导入所有依赖 (${items.filter(i => i.status === 'imported').length}/${items.length})`}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
```

### 3.6 审核对话框 UI 组件

```tsx
function ContentReviewDialog({ items, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState(new Map());
  const [isRewriting, setIsRewriting] = useState(false);

  const currentItem = items[currentIndex];

  const handleDecision = async (decision: string) => {
    if (decision === 'rewrite') {
      setIsRewriting(true);
      // 调用重新改写 API
      const response = await rewriteSingle(currentItem.uuid);
      // 更新当前项的改写内容
      items[currentIndex].rewritten = response.rewritten;
      setIsRewriting(false);
      return;
    }

    // 记录决策
    decisions.set(currentItem.uuid, decision);

    // 下一项
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 完成审核
      onComplete(Array.from(decisions.entries()));
    }
  };

  return (
    <Dialog open={true}>
      <DialogHeader>
        内容改写审核 ({currentIndex + 1}/{items.length})
      </DialogHeader>

      <DialogContent>
        <div className="grid grid-cols-2 gap-4">
          {/* 原始内容 */}
          <ContentPanel
            title="原始内容"
            content={currentItem.original}
            highlight={false}
          />

          {/* 改写后内容 */}
          <ContentPanel
            title="改写后内容"
            content={currentItem.rewritten}
            highlight={true}
          />
        </div>
      </DialogContent>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => handleDecision('use_original')}
        >
          使用原始内容
        </Button>

        <Button
          variant="outline"
          onClick={() => handleDecision('rewrite')}
          loading={isRewriting}
        >
          重新改写
        </Button>

        <Button
          variant="primary"
          onClick={() => handleDecision('use_rewritten')}
        >
          使用改写内容
        </Button>

        <Button
          variant="ghost"
          onClick={() => handleDecision('skip')}
        >
          跳过此项
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
```

### 3.6 游戏数据结构与依赖管理

#### A. 游戏数据结构特点

游戏数据比其他实体复杂得多，包含以下结构：

```typescript
// 游戏基础数据
interface Game {
  uuid: string;
  name: string;
  slug: string;
  thumbnail: string;
  source: string;
  status: 'draft' | 'online' | 'offline';
  nameI18n?: Record<string, string>;  // 多语言名称
}

// 游戏介绍数据（独立表）
interface GameIntroduction {
  uuid: string;
  gameUuid: string;
  metadataTitle: string;        // SEO 标题（需改写）
  metadataDescription: string;   // SEO 描述（需改写）
  content: string;               // 详细内容（需改写）
}

// 关系数据（junction 表）
interface GameRelations {
  categories: string[];  // category UUIDs
  tags: string[];        // tag UUIDs
  featured: string[];    // featured UUIDs
}
```

#### B. 依赖检查流程（优化版）

游戏导入时检查依赖，但不自动导入：

```typescript
async function checkGameDependencies(
  gameData: GameData,
  env: CloudflareEnv
): Promise<DependencyCheckResult> {
  const db = createDrizzleClient(env.DB);

  // 1. 检查本地缺失的依赖
  const missingDependencies: MissingDependency[] = [];

  // 检查分类
  for (const categoryUuid of gameData.categories) {
    const exists = await checkExists(categoryUuid, 'categories', db);
    if (!exists) {
      const categoryData = await fetchCategoryByUuid(categoryUuid);
      missingDependencies.push({
        type: 'category',
        uuid: categoryUuid,
        name: categoryData?.name || 'Unknown',
        status: 'missing'
      });
    }
  }

  // 检查标签
  for (const tagUuid of gameData.tags) {
    const exists = await checkExists(tagUuid, 'tags', db);
    if (!exists) {
      const tagData = await fetchTagByUuid(tagUuid);
      missingDependencies.push({
        type: 'tag',
        uuid: tagUuid,
        name: tagData?.name || 'Unknown',
        status: 'missing'
      });
    }
  }

  // 检查特性合集
  for (const featuredUuid of gameData.featured) {
    const exists = await checkExists(featuredUuid, 'featured', db);
    if (!exists) {
      const featuredData = await fetchFeaturedByUuid(featuredUuid);
      missingDependencies.push({
        type: 'featured',
        uuid: featuredUuid,
        name: featuredData?.name || 'Unknown',
        status: 'missing'
      });
    }
  }

  // 2. 如果有缺失依赖，返回错误状态
  if (missingDependencies.length > 0) {
    return {
      success: false,
      missingDependencies,
      message: '发现缺失的依赖，请先导入这些内容'
    };
  }

  // 3. 所有依赖都存在，可以继续
  return {
    success: true,
    missingDependencies: []
  };
}
```

#### C. 改写目标映射

游戏改写的内容映射到不同的表：

| 改写内容 | 目标表 | 字段 |
|---------|--------|------|
| metadataTitle | introductions | metadataTitle |
| metadataDescription | introductions | metadataDescription |
| 5-part content | introductions | content |
| nameI18n | games | nameI18n (可选) |

### 3.7 实现示例

#### A. 预处理 API 实现 (`src/app/api/admin/fetch/categories/preview/route.ts`)

```typescript
import { ContentRewriter } from '@/services/content/rewriter';

export async function POST(request: NextRequest) {
  try {
    // 1. 验证权限
    await requireAdmin(request);

    const body = await request.json();
    const { enableRewrite = true } = body;

    // 2. 从母站点拉取数据
    const { data: remoteCategories } = await fetchCategories();

    // 3. 检查本地已存在的记录
    const env = await getCloudflareEnv();
    const db = createDrizzleClient(env.DB);

    const existingCategories = await db
      .select({ uuid: categories.uuid })
      .from(categories)
      .where(isNull(categories.deletedAt));

    const existingUuidSet = new Set(existingCategories.map(c => c.uuid));

    // 4. 识别新记录
    const items = await Promise.all(
      remoteCategories.map(async (cat) => {
        const isNew = !existingUuidSet.has(cat.uuid);
        const original = {
          metadataTitle: cat.metadataTitle || cat.name,
          metadataDescription: cat.metadataDescription || '',
          content: cat.content || ''
        };

        let rewritten = null;
        if (isNew && enableRewrite) {
          // 5. 对新记录执行改写
          const rewriter = new ContentRewriter();
          rewritten = await rewriter.rewriteSEOContent(original, {
            entity: 'category',
            originalName: cat.name,
            seoOptimize: true
          });
        }

        return {
          uuid: cat.uuid,
          name: cat.name,
          slug: cat.slug,
          iconUrl: cat.iconUrl,
          status: isNew ? 'new' : 'existing',
          original,
          rewritten,
          rewriteAttempts: rewritten ? 1 : 0
        };
      })
    );

    // 6. 返回对比数据
    return NextResponse.json({
      success: true,
      items,
      summary: {
        total: items.length,
        new: items.filter(i => i.status === 'new').length,
        existing: items.filter(i => i.status === 'existing').length,
        rewritten: items.filter(i => i.rewritten).length
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

#### B. 游戏预处理 API 实现 (`src/app/api/admin/fetch/games/preview/route.ts`)

```typescript
import { ContentRewriter } from '@/services/content/rewriter';
import { checkGameDependencies } from '@/services/content/games';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { uuid, enableRewrite = true } = body;

    if (!uuid) {
      return NextResponse.json(
        { success: false, error: 'Game UUID is required' },
        { status: 400 }
      );
    }

    // 1. 从母站点拉取单个游戏
    const { data: gameData } = await fetchGameByUuid(uuid);
    const env = await getCloudflareEnv();

    // 2. 检查依赖关系（不自动导入）
    const dependencyCheck = await checkGameDependencies(gameData, env);

    // 如果有缺失的依赖，立即返回让前端处理
    if (!dependencyCheck.success) {
      return NextResponse.json({
        success: false,
        error: 'Missing dependencies',
        missingDependencies: dependencyCheck.missingDependencies,
        message: '发现缺失的依赖项，请先导入这些内容后再导入游戏'
      }, { status: 400 });
    }

    // 3. 检查游戏是否已存在
    const db = createDrizzleClient(env.DB);
    const existingGame = await db
      .select({ uuid: games.uuid })
      .from(games)
      .where(eq(games.uuid, uuid))
      .limit(1);

    const isNew = existingGame.length === 0;

    // 4. 准备原始内容
    const original = {
      metadataTitle: gameData.introduction?.metadataTitle || gameData.name,
      metadataDescription: gameData.introduction?.metadataDescription || '',
      content: gameData.introduction?.content || ''
    };

    // 5. 对新游戏执行改写
    let rewritten = null;
    if (isNew && enableRewrite && gameData.introduction) {
      const rewriter = new ContentRewriter();

      // 使用依赖上下文增强改写
      const contextualKeywords = [
        ...gameData.categories.map(c => c.name),
        ...gameData.tags.map(t => t.name),
      ];

      rewritten = await rewriter.rewriteSEOContent(original, {
        entity: 'game',
        originalName: gameData.name,
        seoOptimize: true,
        targetKeywords: contextualKeywords
      });
    }

    // 6. 返回对比数据（只有依赖都存在时才返回）
    return NextResponse.json({
      success: true,
      game: {
        uuid: gameData.uuid,
        name: gameData.name,
        slug: gameData.slug,
        thumbnail: gameData.thumbnail,
        status: isNew ? 'new' : 'existing',
        original,
        rewritten,
        categories: gameData.categories,
        tags: gameData.tags,
        featured: gameData.featured
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

#### C. 游戏确认导入 API 实现 (`src/app/api/admin/fetch/games/confirm/route.ts`)

```typescript
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { uuid, action, rewriteOptions, contentDecision } = body;

    // 1. 处理重新改写请求
    if (action === 'rewrite') {
      const gameData = await fetchGameByUuid(uuid);
      const rewriter = new ContentRewriter();

      const rewritten = await rewriter.rewriteSEOContent(
        {
          metadataTitle: gameData.introduction?.metadataTitle || '',
          metadataDescription: gameData.introduction?.metadataDescription || '',
          content: gameData.introduction?.content || ''
        },
        {
          entity: 'game',
          originalName: gameData.name,
          seoOptimize: true,
          temperature: rewriteOptions?.temperature || 0.5
        }
      );

      return NextResponse.json({
        success: true,
        rewritten,
        needsConfirmation: true
      });
    }

    // 2. 处理最终导入
    if (action === 'skip') {
      return NextResponse.json({
        success: true,
        skipped: true
      });
    }

    const env = await getCloudflareEnv();
    const gameData = await fetchGameByUuid(uuid);

    // 3. 准备导入数据
    const contentToUse = action === 'use_rewritten'
      ? contentDecision.rewritten
      : contentDecision.original;

    // 游戏基础数据
    const gameImportData: GameImportData = {
      uuid: gameData.uuid,
      name: gameData.name,
      slug: gameData.slug,
      thumbnail: gameData.thumbnail,
      source: gameData.source,
      status: gameData.status,
      nameI18n: gameData.nameI18n,
    };

    // 关系数据
    const relationsData: GameRelationsData = {
      gameUuid: gameData.uuid,
      categories: gameData.categories,
      tags: gameData.tags,
      featured: gameData.featured,
    };

    // 介绍数据（使用改写后的内容）
    const introductionData: GameIntroductionData = {
      gameUuid: gameData.uuid,
      introductionUuid: gameData.introduction?.uuid || generateUuid(),
      metadataTitle: contentToUse.metadataTitle,
      metadataDescription: contentToUse.metadataDescription,
      content: contentToUse.content,
    };

    // 4. 执行导入
    const result = await importGames(
      [gameImportData],
      [relationsData],
      [introductionData],
      'skip_existing',
      env.DB
    );

    return NextResponse.json({
      success: true,
      imported: result.created,
      skipped: result.skipped,
      details: result
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

#### D. 确认导入 API 实现 (`src/app/api/admin/fetch/categories/confirm/route.ts`)

```typescript
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { items } = body;

    // 1. 检查是否有需要重新改写的项
    const rewriteItems = items.filter(item => item.action === 'rewrite');
    if (rewriteItems.length > 0) {
      const rewriter = new ContentRewriter();
      const rewrittenItems = await Promise.all(
        rewriteItems.map(async (item) => {
          const original = await getOriginalContent(item.uuid);
          const rewritten = await rewriter.rewriteSEOContent(original, {
            entity: 'category',
            originalName: item.name,
            seoOptimize: true,
            temperature: item.rewriteOptions?.temperature || 0.5
          });
          return { uuid: item.uuid, rewritten };
        })
      );

      // 返回重新改写的内容，需要再次确认
      return NextResponse.json({
        success: true,
        rewrittenItems,
        needsConfirmation: true
      });
    }

    // 2. 处理最终导入
    const env = await getCloudflareEnv();
    const db = createDrizzleClient(env.DB);

    const importData: CategoryImportData[] = [];
    const skipList: string[] = [];

    for (const item of items) {
      if (item.action === 'skip') {
        skipList.push(item.uuid);
        continue;
      }

      const categoryData = await getCategoryData(item.uuid);
      const contentToUse = item.action === 'use_rewritten'
        ? item.rewritten
        : item.original;

      importData.push({
        uuid: categoryData.uuid,
        name: categoryData.name,
        slug: categoryData.slug,
        iconUrl: categoryData.iconUrl,
        content: contentToUse.content,
        metaTitle: contentToUse.metadataTitle,
        metaDescription: contentToUse.metadataDescription,
      });
    }

    // 3. 执行导入
    const result = await importCategories(importData, 'skip_existing', db);

    return NextResponse.json({
      success: true,
      imported: result.created + result.updated,
      skipped: skipList.length,
      failed: result.failed,
      details: {
        created: result.createdUuids,
        updated: result.updatedUuids,
        skipped: skipList
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

## 四、实现细节

### 4.1 LLM 配置

**使用现有 `tools/ai` 模块（仅 OpenRouter）**：
- **模型选择**：`google/gemini-2.5-pro`（高质量改写）
- **Provider**：OpenRouter（已配置 API Key）
- **温度设置**：0.5（平衡创造性与一致性）
- **并发控制**：4 个并发请求（参考 `tools/rewrite/geometrylite.io/config.ts`）
- **重试策略**：2 次重试，延迟 2000ms

### 4.2 错误处理策略（参考现有实现）

```typescript
// 参考 tools/rewrite/geometrylite.io/rewrite-games.ts 的错误处理
class ContentRewriter {
  private maxRetries = 2;
  private retryDelay = 2000;

  async rewriteWithRetry(
    content: SEOContent,
    options: RewriteOptions,
    attempt = 1
  ): Promise<SEOContent> {
    try {
      return await this.rewriteSEOContent(content, options);
    } catch (error) {
      if (attempt < this.maxRetries) {
        console.log(`[Rewriter] Retry ${attempt}/${this.maxRetries}`);
        await new Promise(r => setTimeout(r, this.retryDelay));
        return this.rewriteWithRetry(content, options, attempt + 1);
      }
      console.error('[Rewriter] Max retries exceeded:', error);
      return content; // 降级策略
    }
  }
}
```

### 4.3 性能优化

1. **并发控制**：使用 `p-limit` 限制并发改写请求（4 个并发）
2. **批处理**：批量导入时分批改写，每批 10 个项目
3. **速率限制**：请求间隔 500ms，避免 API 限流

### 4.4 监控与日志

```typescript
// 改写性能指标
interface RewriteMetrics {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  averageLatency: number;
}
```

## 五、环境变量配置

```env
# AI 服务配置（已在 .env.local 中配置）
OPENROUTER_API_KEY=sk-or-v1-xxxxx  # 已配置，无需修改

# 改写功能开关（可选）
ENABLE_CONTENT_REWRITE=true  # 默认开启
```

**注意**：项目已在 `.env.local` 中配置了 `OPENROUTER_API_KEY`，无需额外配置。

## 六、测试策略

### 6.1 单元测试

```typescript
describe('Content Rewriter', () => {
  it('should rewrite SEO content with different structure', async () => {
    const original = {
      metadataTitle: 'Action Games',
      metadataDescription: 'Play the best action games',
      content: 'Action games are exciting...'
    };

    const rewritten = await rewriteSEOContent(original, {
      entity: 'category',
      originalName: 'Action',
      seoOptimize: true
    });

    expect(rewritten.metadataTitle).not.toBe(original.metadataTitle);
    expect(rewritten.metadataTitle.length).toBeLessThanOrEqual(60);
  });
});
```

### 6.2 集成测试

1. **Mock 模式测试**：使用 Mock 数据验证改写流程
2. **真实 API 测试**：小批量测试改写效果
3. **SEO 质量检查**：验证改写后的内容 SEO 指标

## 七、监控指标

### 7.1 关键指标

- **改写成功率**：成功改写 / 总请求数
- **平均延迟**：每个改写请求的平均时间
- **API 成本**：每日/每月 API 调用成本
- **并发性能**：处理速度和吞吐量

### 7.2 告警阈值

- 改写失败率 > 10%
- 平均延迟 > 3 秒
- API 配额使用 > 80%

## 八、实施计划

### 第一阶段：基础功能（2天）
1. ✅ 创建 `rewriter.ts` 服务
2. ✅ 实现基础改写函数
3. ✅ 集成到分类导入流程

### 第二阶段：全面集成（2天）
1. ✅ 集成到标签、特性合集、游戏导入
2. ✅ 添加批量改写支持
3. ✅ 实现进度追踪

### 第三阶段：优化与监控（1天）
1. ✅ 实现性能监控
2. ✅ 优化并发控制
3. ✅ 添加日志记录

### 第四阶段：测试与上线（1天）
1. ✅ 完整测试覆盖
2. ✅ 性能压测
3. ✅ 生产环境部署

## 九、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| LLM API 不稳定 | 导入失败 | 降级策略：失败时使用原始内容 |
| 改写质量不佳 | SEO 效果差 | 人工审核机制 + 质量评分 |
| 成本超支 | 预算超标 | 配额限制 + 成本监控告警 |
| 导入速度变慢 | 用户体验差 | 异步改写选项 + 进度显示 |

## 十、成功标准

1. **技术指标**
   - 改写成功率 > 95%
   - 平均改写时间 < 2 秒
   - 系统稳定性 > 99.9%

2. **业务指标**
   - 搜索引擎重复内容警告减少 90%
   - 页面索引率提升 30%
   - 有机流量增长 20%

## 十一、利用现有代码资源

### 11.1 可复用模块

| 模块路径 | 用途 | 关键功能 |
|---------|------|----------|
| `tools/ai/` | AI 通信层 | smartChat、错误处理、Provider 切换 |
| `tools/rewrite/geometrylite.io/lib/gemini-rewriter.ts` | 改写实现参考 | JSON 解析、错误处理模式 |
| `tools/rewrite/geometrylite.io/lib/prompt-builder.ts` | 提示词构建参考 | 结构化提示词生成 |
| `tools/rewrite/geometrylite.io/config.ts` | 配置参考 | 并发、重试、字符限制配置 |
| `src/services/translation/ai.ts` | 现有 AI 集成 | OpenRouter 集成示例 |

### 11.2 实现模式复用

```typescript
// 1. AI 调用模式（复用 tools/ai）
import { smartChat, quickChat } from '@/tools/ai';

// 2. JSON 解析模式（参考 gemini-rewriter.ts）
const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/);
const jsonStr = jsonMatch ? jsonMatch[1] : response.content;

// 3. 批处理模式（参考 rewrite-games.ts）
const pLimit = (await import('p-limit')).default;
const limit = pLimit(CONCURRENCY);

// 4. 进度追踪（参考 ProgressManager）
onProgress?.(current, total);
```

## 十二、审核功能说明

### 12.1 为什么需要审核

1. **质量控制**：LLM 改写可能产生不理想结果，人工审核确保质量
2. **灵活选择**：管理员可选择最佳版本（原始或改写）
3. **迭代优化**：支持重新改写直到满意
4. **透明度**：清晰看到改写效果，理解 AI 逻辑

### 12.2 审核流程特点

- **分步处理**：预处理 → 审核 → 确认导入
- **状态保持**：前端维护审核决策状态
- **批量支持**：可逐个审核，也可批量操作
- **灵活操作**：支持跳过、重写、选择版本

### 12.3 注意事项

1. **API 调用顺序**：必须先调用 preview，再调用 confirm
2. **状态同步**：前端需正确管理项目状态和决策
3. **错误处理**：重新改写可能失败，需要降级处理
4. **性能考虑**：大批量数据时，改写需要时间
5. **用户体验**：提供进度指示和取消选项

## 十三、实现差异：游戏 vs 其他实体

### 13.1 核心差异对比

| 特性 | 分类/标签/特性合集 | 游戏 |
|-----|-------------------|------|
| **拉取模式** | 批量拉取所有 | 单个按 UUID 拉取 |
| **依赖处理** | 无依赖 | 自动解析 3 种依赖 |
| **改写并发** | 批量并发（p-limit） | 单个处理 |
| **数据存储** | 单表存储 | 多表存储（games + introductions） |
| **关系管理** | 无关系表 | 3 个 junction 表 |
| **审核界面** | 批量审核列表 | 单个审核对话框 |
| **导入复杂度** | 简单直接导入 | 复杂多表事务 |

### 13.2 API 请求格式差异

#### 批量实体（分类/标签/特性合集）
```typescript
// Preview 请求
POST /api/admin/fetch/categories/preview
{
  "uuids"?: string[],      // 可选，过滤特定 UUID
  "enableRewrite": boolean
}

// Confirm 请求（支持批量操作）
POST /api/admin/fetch/categories/confirm
{
  "items": [
    { "uuid": "xxx-001", "action": "use_rewritten" },
    { "uuid": "xxx-002", "action": "use_original" },
    { "uuid": "xxx-003", "action": "skip" }
  ]
}
```

#### 单个实体（游戏）
```typescript
// Preview 请求
POST /api/admin/fetch/games/preview
{
  "uuid": string,           // 必需，单个游戏 UUID
  "enableRewrite": boolean
}

// Confirm 请求（单个操作）
POST /api/admin/fetch/games/confirm
{
  "uuid": string,
  "action": "use_rewritten" | "use_original" | "skip" | "rewrite",
  "contentDecision"?: {
    "original": SEOContent,
    "rewritten": SEOContent
  }
}
```

### 13.3 实现优先级建议

1. **第一步**：实现批量实体（categories, tags, featured）
   - 相对简单，无依赖关系
   - 可以快速验证改写效果

2. **第二步**：实现游戏单个处理
   - 需要处理依赖关系
   - 需要管理多表数据
   - UI 交互更复杂

## 十四、注意事项

1. **保持语义一致**：改写不应改变原始信息的含义
2. **保留格式**：HTML/Markdown 格式必须保留
3. **关键信息不丢失**：游戏名称、分类名等核心信息准确
4. **成本控制**：监控 API 使用量，避免超支
5. **渐进式部署**：先在 Mock 数据上测试，再应用到真实数据
6. **复用现有工具**：优先使用 `tools/ai` 模块，避免重复造轮子
7. **参考现有实现**：`tools/rewrite` 提供了成熟的改写模式
8. **审核流程**：新增审核环节增加了操作步骤但提高了质量

---

*文档版本：1.7*
*更新日期：2025-01-15*
*更新内容：*
- *新增管理员审核功能设计（v1.5）*
- *API 拆分为 preview 和 confirm 两步（v1.5）*
- *添加前端审核对话框交互流程（v1.5）*
- *新增第 2.3 节：实体特定的工作流程，区分批量与单项处理模式（v1.6）*
- *新增第 3.6 节：游戏数据结构与依赖管理详解（v1.6）*
- *新增第 3.7 节 B&C：游戏专用的 preview 和 confirm API 实现（v1.6）*
- *新增第 13 节：实现差异对比表，明确游戏与其他实体的区别（v1.6）*
- **优化游戏依赖处理：不再自动导入，改为检查并提示用户手动导入（v1.7）**
- **新增第 3.5 节：缺失依赖处理 UI 组件，展示表格引导用户导入（v1.7）**
- **更新游戏 preview API：依赖缺失时中断返回，确保所有内容都经过改写（v1.7）**
*作者：Claude AI Assistant*