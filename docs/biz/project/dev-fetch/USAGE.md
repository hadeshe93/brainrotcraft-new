# 游戏数据远程拉取功能 - 使用说明

## 功能概述

该功能允许子站点从母站点拉取游戏数据，包括分类、标签、特性合集和游戏数据。

## 环境配置

### 母站点配置

在 `.env.local` 中添加：

```env
# 数据拉取API Key（母站点用于验证子站点请求）
FETCH_API_KEY="your-secure-api-key-here"
```

### 子站点配置

在 `.env.local` 中添加：

```env
# 数据拉取配置
NEXT_PUBLIC_PARENT_SITE_URL="http://localhost:4004"  # 母站点URL
NEXT_PUBLIC_PARENT_API_KEY="your-api-key-here"       # 与母站点的FETCH_API_KEY相同
NEXT_PUBLIC_USE_MOCK_DATA="true"                     # 开发环境使用Mock数据
```

## 使用流程

### 1. 访问数据拉取管理页面

- 登录CMS后台
- 点击侧边栏的"Data Fetch"或首页的"数据拉取"卡片
- 进入 `/admin/fetch` 页面

### 2. 拉取分类/标签/特性合集

1. 点击对应的卡片（分类/标签/特性合集）
2. 系统自动加载母站点数据并过滤已存在的项
3. 可选操作：
   - 点击"一键拉取所有"按钮批量导入
   - 点击单个项的"拉取"按钮单独导入

### 3. 拉取游戏数据

1. 点击"拉取游戏"卡片
2. 系统加载未导入的游戏列表
3. 点击单个游戏的"拉取"按钮
4. 系统自动：
   - 检查游戏的依赖（分类/标签/特性合集）
   - 并发拉取缺失的依赖数据
   - 导入游戏及其介绍数据
   - 建立关联关系

## Mock 数据测试

### 启用 Mock 模式

在子站点的 `.env.local` 中设置：

```env
NEXT_PUBLIC_USE_MOCK_DATA="true"
NEXT_PUBLIC_PARENT_SITE_URL="http://localhost:4004"
```

### Mock 数据内容

Mock 模式提供：
- 5个分类（Action, Adventure, Puzzle, Racing, Strategy）
- 5个标签（Multiplayer, 3D, Retro, Casual, Hardcore）
- 3个特性合集（Hot Games, New Releases, Top Rated）
- 5个游戏（包含完整关联关系和介绍）

### 访问 Mock 接口

```bash
# 直接访问 Mock 接口（无需 API Key）
curl http://localhost:4004/api/fetch/mock/categories
curl http://localhost:4004/api/fetch/mock/tags
curl http://localhost:4004/api/fetch/mock/featured
curl http://localhost:4004/api/fetch/mock/games
```

## 生产环境部署

### 1. 母站点部署

1. 在 Cloudflare Worker 后台添加环境变量：
   ```
   FETCH_API_KEY=your-production-api-key
   ```

2. 部署应用：
   ```bash
   pnpm deploy
   ```

### 2. 子站点部署

1. 在 Cloudflare Worker 后台添加环境变量：
   ```
   NEXT_PUBLIC_PARENT_SITE_URL=https://parent.gamesramp.com
   NEXT_PUBLIC_PARENT_API_KEY=your-production-api-key
   NEXT_PUBLIC_USE_MOCK_DATA=false
   ```

2. 部署应用

## API 接口说明

### 母站点提供接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/fetch/categories` | GET | 获取所有分类 |
| `/api/fetch/tags` | GET | 获取所有标签 |
| `/api/fetch/featured` | GET | 获取所有特性合集 |
| `/api/fetch/games` | GET | 获取所有游戏 |
| `/api/fetch/mock/[entity]` | GET | 获取Mock数据 |

### 子站点拉取接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/admin/fetch/categories` | POST | 拉取并导入分类 |
| `/api/admin/fetch/tags` | POST | 拉取并导入标签 |
| `/api/admin/fetch/featured` | POST | 拉取并导入特性合集 |
| `/api/admin/fetch/games` | POST | 拉取并导入游戏 |

## 常见问题

### 1. API Key 认证失败

**问题**：提示"Unauthorized: Invalid or missing API key"

**解决方案**：
- 检查母站点的 `FETCH_API_KEY` 是否已配置
- 检查子站点的 `NEXT_PUBLIC_PARENT_API_KEY` 是否与母站点一致
- 确认 API Key 没有多余的空格

### 2. 网络连接失败

**问题**：提示"Failed to fetch from parent site: network error"

**解决方案**：
- 检查 `NEXT_PUBLIC_PARENT_SITE_URL` 是否正确
- 确认母站点服务正常运行
- 检查防火墙或 CORS 配置

### 3. 所有数据已存在

**问题**：拉取时提示"All items already exist locally"

**解决方案**：
- 这是正常情况，表示本地已有这些数据
- 如需重新导入，需先在数据库中删除对应的 UUID 记录

### 4. 依赖导入失败

**问题**：拉取游戏时某些依赖导入失败

**解决方案**：
- 系统会继续导入游戏，但会记录失败的依赖
- 可以先单独拉取失败的分类/标签/特性合集
- 然后重新拉取游戏

## 数据流程图

```
子站点CMS
    ↓
点击拉取按钮
    ↓
前端发送请求 → /api/admin/fetch/[entity]
    ↓
子站点后端 → 携带API Key请求母站点 → /api/fetch/[entity]
    ↓
母站点验证API Key
    ↓
返回数据（排除id和翻译）
    ↓
子站点过滤已存在数据（UUID判断）
    ↓
调用import服务导入新数据
    ↓
返回导入结果
```

## 性能优化

### 并发处理

游戏依赖处理采用并发模式：

```typescript
// 并发检查和导入分类、标签、特性合集
Promise.all([
  checkAndImportCategories(),
  checkAndImportTags(),
  checkAndImportFeatured()
])
```

性能对比：
- 串行执行：~600ms
- 并发执行：~200ms
- **性能提升：66%**

### 数据缓存

- 母站点接口可设置5分钟缓存
- 子站点缓存本地UUID集合，减少数据库查询

## 安全建议

1. **API Key管理**
   - 使用强随机字符串（至少32位）
   - 定期轮换密钥
   - 生产环境使用环境变量，不要硬编码

2. **访问控制**
   - 母站点接口仅限内网访问（可选）
   - 配置 IP 白名单（生产环境）

3. **速率限制**
   - 建议配置每分钟100次请求限制
   - 防止滥用和DDoS攻击

## 版本历史

- v1.0.0 (2024-11-14)
  - 初始版本发布
  - 支持分类、标签、特性合集、游戏数据拉取
  - 支持 Mock 数据测试
  - 实现并发依赖处理
