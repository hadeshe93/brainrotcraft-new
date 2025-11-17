# 游戏数据远程拉取机制 - 实现指引

## 一、架构概述

### 1.1 系统架构
```
┌─────────────────┐         API请求          ┌─────────────────┐
│   母站点(Parent) │ ◄──────────────────────► │   子站点(Child)  │
│                 │         API Key认证        │                 │
│  ┌──────────┐   │                          │   ┌──────────┐  │
│  │ 提供接口  │   │                          │   │ 拉取接口  │  │
│  └──────────┘   │                          │   └──────────┘  │
│       ▲         │                          │        ▼        │
│       │         │                          │   ┌──────────┐  │
│  ┌──────────┐   │                          │   │ CMS界面   │  │
│  │   D1 DB   │   │                          │   └──────────┘  │
│  └──────────┘   │                          │        ▼        │
└─────────────────┘                          │   ┌──────────┐  │
                                             │   │   D1 DB   │  │
                                             │   └──────────┘  │
                                             └─────────────────┘
```

### 1.2 数据流向
1. **子站点CMS** → 触发拉取请求
2. **子站点拉取接口** → 携带API Key请求母站点
3. **母站点提供接口** → 验证API Key后返回数据
4. **子站点处理** → 过滤已存在数据(UUID判断) → 导入新数据

## 二、接口设计

### 2.1 母站点 - 数据提供接口

#### 通用响应格式
```typescript
interface FetchResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  timestamp: string;
}
```

#### GET `/api/fetch/categories`
**功能**: 提供所有分类数据
**认证**: API Key (Header: X-API-Key)
**响应数据结构**:
```typescript
{
  uuid: string;
  name: string;
  slug: string;
  iconUrl?: string;
  metadataTitle?: string;
  metadataDescription?: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### GET `/api/fetch/tags`
**功能**: 提供所有标签数据
**认证**: API Key
**响应**: 同分类结构

#### GET `/api/fetch/featured`
**功能**: 提供所有特性合集数据
**认证**: API Key
**响应**: 同分类结构

#### GET `/api/fetch/games`
**功能**: 提供所有游戏及关联数据
**认证**: API Key
**响应数据结构**:
```typescript
{
  // 游戏基本信息
  uuid: string;
  name: string;
  slug: string;
  thumbnail?: string;
  source?: string;
  status: 'draft' | 'online' | 'offline';
  nameI18n?: object;
  interact: number;
  rating: number;
  // ... 其他统计字段

  // 关联数据
  categories: string[];  // UUID数组
  tags: string[];        // UUID数组
  featured: string[];    // UUID数组

  // 游戏介绍
  introduction?: {
    uuid: string;
    metadataTitle?: string;
    metadataDescription?: string;
    content?: string;
  };
}
```

#### GET `/api/fetch/mock/[entity]`
**功能**: 开发测试用Mock数据
**参数**: entity = categories | tags | featured | games
**响应**: 返回5-10条模拟数据

### 2.2 子站点 - 数据拉取接口

#### POST `/api/admin/fetch/categories`
**功能**: 从母站点拉取并导入分类
**请求体**:
```typescript
{
  uuids?: string[];  // 指定拉取的UUID列表，空则拉取全部
}
```
**响应**:
```typescript
{
  success: boolean;
  fetched: number;   // 获取数量
  imported: number;  // 导入数量
  skipped: number;   // 跳过数量
  errors?: string[];
}
```

#### POST `/api/admin/fetch/tags`
**功能**: 从母站点拉取并导入标签
**请求体/响应**: 同分类

#### POST `/api/admin/fetch/featured`
**功能**: 从母站点拉取并导入特性合集
**请求体/响应**: 同分类

#### POST `/api/admin/fetch/games`
**功能**: 从母站点拉取并导入游戏
**请求体**:
```typescript
{
  uuid: string;  // 单个游戏UUID
}
```
**处理逻辑**:
1. 获取游戏数据及关联的分类/标签/特性合集UUID
2. 检查本地是否存在这些关联数据
3. 自动拉取缺失的关联数据并创建
4. 导入游戏及其介绍
5. 建立关联关系

## 三、CMS界面设计

### 3.1 数据拉取管理页面 `/admin/fetch`

#### 页面布局
```
┌────────────────────────────────────────────────┐
│                 数据拉取管理                      │
├────────────────────────────────────────────────┤
│                                                │
│  ┌──────────────┐  ┌──────────────┐          │
│  │              │  │              │          │
│  │   📁 分类     │  │   🏷️ 标签    │          │
│  │              │  │              │          │
│  │  点击拉取数据  │  │  点击拉取数据  │          │
│  └──────────────┘  └──────────────┘          │
│                                                │
│  ┌──────────────┐  ┌──────────────┐          │
│  │              │  │              │          │
│  │   ⭐ 特性合集  │  │   🎮 游戏    │          │
│  │              │  │              │          │
│  │  点击拉取数据  │  │  点击拉取数据  │          │
│  └──────────────┘  └──────────────┘          │
│                                                │
└────────────────────────────────────────────────┘
```

### 3.2 数据拉取弹窗设计

#### 分类/标签/特性合集弹窗
```
┌─────────────────────────────────────────────────┐
│ 拉取分类数据                              [X]    │
├─────────────────────────────────────────────────┤
│                                                 │
│  [一键拉取所有]  正在加载... ○                    │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ 名称        Slug      操作                 │ │
│  ├───────────────────────────────────────────┤ │
│  │ Action     action    [拉取]               │ │
│  │ Adventure  advent    [拉取]               │ │
│  │ Puzzle     puzzle    [拉取]               │ │
│  │ Racing     racing    [拉取]               │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  显示 4 条未导入数据                              │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### 游戏拉取弹窗
```
┌─────────────────────────────────────────────────┐
│ 拉取游戏数据                              [X]    │
├─────────────────────────────────────────────────┤
│                                                 │
│  正在加载... ○                                   │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ 游戏名      分类    标签    操作            │ │
│  ├───────────────────────────────────────────┤ │
│  │ Game A     2个     3个    [拉取]          │ │
│  │ Game B     1个     2个    [拉取]          │ │
│  │ Game C     3个     4个    [拉取]          │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  显示 3 条未导入游戏                              │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 3.3 侧边栏更新

在现有侧边栏添加新入口:
```typescript
// 位置：在"翻译管理"之后添加
{
  name: '数据拉取',
  href: '/admin/fetch',
  icon: MdiCloudDownload,
}
```

### 3.4 CMS首页快速入口

在管理面板首页添加卡片:
```
┌──────────────────────┐
│    📥 数据拉取         │
│                      │
│  从母站点同步数据       │
│                      │
│     [进入管理]        │
└──────────────────────┘
```

## 四、实现细节

### 4.1 环境变量配置

```env
# 母站点配置
PARENT_SITE_URL=https://api.gamesramp.com
PARENT_API_KEY=your-api-key-here

# 开发环境可使用Mock
# PARENT_SITE_URL=http://localhost:4004
# USE_MOCK_DATA=true
```

### 4.2 API Key认证实现

```typescript
// 母站点验证中间件
export async function validateApiKey(request: Request) {
  const apiKey = request.headers.get('X-API-Key');
  const validKey = process.env.FETCH_API_KEY;

  if (!apiKey || apiKey !== validKey) {
    return new Response('Unauthorized', { status: 401 });
  }
  return null;
}
```

### 4.3 数据过滤逻辑

```typescript
// 过滤已存在的数据
async function filterExistingData<T extends { uuid: string }>(
  remoteData: T[],
  localTable: any
): Promise<T[]> {
  const localUuids = await db
    .select({ uuid: localTable.uuid })
    .from(localTable)
    .where(isNull(localTable.deletedAt));

  const existingUuidSet = new Set(localUuids.map(item => item.uuid));
  return remoteData.filter(item => !existingUuidSet.has(item.uuid));
}
```

### 4.4 依赖处理逻辑

```typescript
// 游戏导入时的依赖处理 - 并发执行版本
async function handleGameDependencies(gameData: any) {
  // 并发执行三个独立的依赖检查和导入操作
  const dependencyTasks = [
    // 分类依赖处理
    (async () => {
      const missingCategories = await checkMissing(
        gameData.categories,
        'categories'
      );
      if (missingCategories.length > 0) {
        return await fetchAndImport('categories', missingCategories);
      }
      return { type: 'categories', count: 0 };
    })(),

    // 标签依赖处理
    (async () => {
      const missingTags = await checkMissing(
        gameData.tags,
        'tags'
      );
      if (missingTags.length > 0) {
        return await fetchAndImport('tags', missingTags);
      }
      return { type: 'tags', count: 0 };
    })(),

    // 特性合集依赖处理
    (async () => {
      const missingFeatured = await checkMissing(
        gameData.featured,
        'featured'
      );
      if (missingFeatured.length > 0) {
        return await fetchAndImport('featured', missingFeatured);
      }
      return { type: 'featured', count: 0 };
    })()
  ];

  // 等待所有依赖处理完成
  const results = await Promise.all(dependencyTasks);

  // 可选：记录处理结果
  console.log('Dependencies imported:', {
    categories: results[0],
    tags: results[1],
    featured: results[2]
  });

  return results;
}

// 或者使用更简洁的Promise.allSettled处理潜在错误
async function handleGameDependenciesWithErrorHandling(gameData: any) {
  const dependencyConfigs = [
    { uuids: gameData.categories, type: 'categories' },
    { uuids: gameData.tags, type: 'tags' },
    { uuids: gameData.featured, type: 'featured' }
  ];

  // 创建并发任务数组
  const tasks = dependencyConfigs.map(async (config) => {
    try {
      const missing = await checkMissing(config.uuids, config.type);
      if (missing.length > 0) {
        return {
          type: config.type,
          result: await fetchAndImport(config.type, missing),
          imported: missing.length
        };
      }
      return { type: config.type, imported: 0 };
    } catch (error) {
      console.error(`Failed to import ${config.type}:`, error);
      return {
        type: config.type,
        error: error.message,
        imported: 0
      };
    }
  });

  // 使用allSettled确保即使某个依赖失败也能继续
  const results = await Promise.allSettled(tasks);

  // 检查是否有失败的依赖
  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    console.warn('Some dependencies failed to import:', failures);
  }

  return results;
}
```

## 五、Mock数据生成器

### 5.1 Mock数据结构示例

```typescript
// /api/fetch/mock/categories
export const mockCategories = [
  {
    uuid: 'mock-cat-001',
    name: 'Action',
    slug: 'action',
    iconUrl: '/icons/action.svg',
    metadataTitle: 'Action Games',
    content: 'Fast-paced action games',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  // ... 5-10条
];

// /api/fetch/mock/games
export const mockGames = [
  {
    uuid: 'mock-game-001',
    name: 'Super Adventure',
    slug: 'super-adventure',
    thumbnail: '/games/thumb1.jpg',
    status: 'online',
    nameI18n: {
      zh: '超级冒险',
      ja: 'スーパーアドベンチャー'
    },
    categories: ['mock-cat-001'],
    tags: ['mock-tag-001', 'mock-tag-002'],
    featured: ['mock-feat-001'],
    introduction: {
      uuid: 'mock-intro-001',
      content: 'An exciting adventure game...'
    },
    // ... 统计字段
  },
  // ... 5-10条
];
```

## 六、错误处理

### 6.1 常见错误场景

1. **网络错误**: 连接超时、DNS解析失败
2. **认证错误**: API Key无效或过期
3. **数据格式错误**: 返回数据结构不匹配
4. **数据库错误**: UUID冲突、外键约束失败
5. **并发错误**: 同时拉取相同数据

### 6.2 错误处理策略

```typescript
interface FetchError {
  type: 'network' | 'auth' | 'format' | 'database' | 'unknown';
  message: string;
  details?: any;
}

// 统一错误处理
function handleFetchError(error: any): FetchError {
  if (error.status === 401) {
    return {
      type: 'auth',
      message: 'API认证失败，请检查API Key配置'
    };
  }
  // ... 其他错误类型处理
}
```

## 七、性能优化

### 7.1 批量处理
- 分类/标签/特性合集: 支持批量拉取
- 游戏: 单个拉取，避免依赖复杂度

### 7.2 缓存策略
- 母站点: 5分钟缓存公共数据
- 子站点: 缓存已检查的UUID集合

### 7.3 并发控制
```typescript
// 限制并发请求数
const MAX_CONCURRENT = 3;
const queue = new PQueue({ concurrency: MAX_CONCURRENT });
```

## 八、安全考虑

### 8.1 API Key管理
- 使用环境变量存储
- 定期轮换密钥
- 限制IP访问(生产环境)

### 8.2 数据验证
- UUID格式验证
- Slug唯一性验证
- 必填字段检查

### 8.3 速率限制
```typescript
// 限制每分钟请求数
const rateLimit = {
  maxRequests: 100,
  windowMs: 60 * 1000
};
```

## 九、测试计划

### 9.1 单元测试
- 数据过滤逻辑测试
- UUID比对测试
- 依赖检查测试

### 9.2 集成测试
- Mock数据端到端测试
- 真实数据小批量测试
- 错误恢复测试

### 9.3 性能测试
- 大批量数据拉取(100+条)
- 并发请求测试
- 网络延迟模拟

## 十、部署清单

### 10.1 母站点部署
- [ ] 配置FETCH_API_KEY环境变量
- [ ] 部署提供接口
- [ ] 配置CORS(允许子站点域名)
- [ ] 启用访问日志

### 10.2 子站点部署
- [ ] 配置PARENT_SITE_URL
- [ ] 配置PARENT_API_KEY
- [ ] 部署拉取接口和界面
- [ ] 测试连通性

## 十一、维护指南

### 11.1 监控指标
- API调用次数
- 拉取成功率
- 平均响应时间
- 错误类型分布

### 11.2 故障排查
1. 检查网络连通性
2. 验证API Key有效性
3. 查看错误日志
4. 检查数据库约束

### 11.3 版本兼容
- 保持UUID字段向后兼容
- 新增字段使用可选类型
- 提供版本标识头

---

## 附录A: 文件结构

```
src/
├── app/
│   ├── api/
│   │   ├── fetch/              # 母站点提供接口
│   │   │   ├── categories/
│   │   │   ├── tags/
│   │   │   ├── featured/
│   │   │   ├── games/
│   │   │   └── mock/
│   │   └── admin/
│   │       └── fetch/          # 子站点拉取接口
│   │           ├── categories/
│   │           ├── tags/
│   │           ├── featured/
│   │           └── games/
│   └── [locale]/
│       └── admin/
│           └── fetch/          # CMS拉取页面
├── components/
│   └── admin/
│       └── fetch/              # 拉取相关组件
│           ├── fetch-dashboard.tsx
│           ├── fetch-categories-dialog.tsx
│           ├── fetch-tags-dialog.tsx
│           ├── fetch-featured-dialog.tsx
│           └── fetch-games-dialog.tsx
└── services/
    └── fetch/                  # 拉取服务层
        ├── client.ts           # API客户端
        ├── validator.ts        # 数据验证
        └── mock-generator.ts   # Mock数据生成
```

## 附录B: 数据库查询示例

```sql
-- 查找未导入的分类(by UUID)
SELECT remote.* FROM remote_categories remote
LEFT JOIN categories local ON remote.uuid = local.uuid
WHERE local.uuid IS NULL;

-- 统计游戏依赖关系
SELECT
  g.uuid,
  g.name,
  COUNT(DISTINCT gc.category_uuid) as category_count,
  COUNT(DISTINCT gt.tag_uuid) as tag_count
FROM games g
LEFT JOIN games_to_categories gc ON g.uuid = gc.game_uuid
LEFT JOIN games_to_tags gt ON g.uuid = gt.game_uuid
GROUP BY g.uuid;
```

---

**文档版本**: 1.0.0
**更新日期**: 2024-11-14
**作者**: System Architect