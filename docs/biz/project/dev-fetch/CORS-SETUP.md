# CORS 跨域配置说明

本文档说明母站点 Fetch API 的 CORS（跨域资源共享）配置。

## 概述

母站点为子站点提供数据时，需要支持跨域请求。我们通过以下方式实现：

1. **子站点白名单** - 在 `src/constants/config.ts` 中维护
2. **CORS 工具函数** - 在 `src/lib/fetch-cors.ts` 中实现
3. **自动添加 CORS 头** - 在 `src/lib/fetch-auth.ts` 辅助函数中集成

## 子站点白名单配置

### 文件位置
`src/constants/config.ts`

### 配置示例
```typescript
export const CHILD_SITE_WHITELIST = [
  'http://localhost:4004', // 本地开发
  'http://localhost:3000', // 本地开发
  'https://gamesramp.com', // 生产环境（母站也可以自己拉取自己）
  // 添加更多子站点域名：
  // 'https://subdomain.example.com',
  // 'https://another-site.com',
];
```

### 添加新子站点

只需在 `CHILD_SITE_WHITELIST` 数组中添加新域名即可：

```typescript
export const CHILD_SITE_WHITELIST = [
  // ... 现有域名
  'https://new-child-site.com',  // 新增子站点
];
```

## CORS 工作原理

### 1. 预检请求处理

浏览器在发送跨域 POST 请求前会先发送 OPTIONS 预检请求。我们为每个端点提供独立的 OPTIONS 处理器：

```typescript
// 每个 Fetch API 端点都有独立的 OPTIONS 处理器
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  const origin = request.headers.get('origin');
  return addCorsHeaders(response, origin);
}

// GET/POST 请求正常处理
export async function GET(request: NextRequest) {
  // ... 业务逻辑
}
```

**优点**:
- OPTIONS 和业务逻辑完全分离
- 更符合 RESTful 设计原则
- 代码更清晰易懂

### 2. CORS 响应头

所有响应都会自动添加以下 CORS 头（如果来源在白名单中）：

```
Access-Control-Allow-Origin: <请求来源>
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-API-Key
Access-Control-Max-Age: 86400 (24小时)
```

### 3. 白名单验证

- 精确匹配：`https://example.com` 只匹配该域名
- 支持通配符：`*.example.com` 匹配所有子域名（未来扩展）

## 受保护的端点

所有母站点 Fetch API 端点都支持 CORS：

### 真实数据端点
- `GET /api/fetch/categories` - 分类数据
- `GET /api/fetch/tags` - 标签数据
- `GET /api/fetch/featured` - 特性合集数据
- `GET /api/fetch/games` - 游戏数据（完整）
- `GET /api/fetch/games/uuids` - 游戏 UUID 列表
- `POST /api/fetch/games/by-uuids` - 批量获取游戏数据

### Mock 数据端点
- `GET /api/fetch/mock/[entity]` - Mock 数据
- `GET /api/fetch/mock/games/uuids` - Mock 游戏 UUID
- `POST /api/fetch/mock/games/by-uuids` - Mock 游戏批量获取

## 开发环境测试

### 1. 启动母站点
```bash
cd /path/to/parent-site
pnpm dev  # 默认端口 4004
```

### 2. 启动子站点
```bash
cd /path/to/child-site
pnpm dev  # 例如端口 3000
```

### 3. 配置子站点环境变量
```env
# .env.local
NEXT_PUBLIC_PARENT_SITE_URL=http://localhost:4004
NEXT_PUBLIC_PARENT_API_KEY=your-api-key
NEXT_PUBLIC_USE_MOCK_DATA=false  # 使用真实数据
```

### 4. 测试跨域请求

在子站点中打开浏览器开发者工具 Network 面板，查看请求：

- ✅ OPTIONS 预检请求返回 204
- ✅ GET/POST 请求返回 200 并带有 CORS 头
- ✅ 响应数据正常

## 生产环境配置

### 1. 母站点配置

在母站点的环境变量中确保 `FETCH_API_KEY` 已配置：

```env
# 母站点 .env
FETCH_API_KEY=your-secure-api-key-here
```

### 2. 子站点配置

每个子站点需要配置：

```env
# 子站点 .env
NEXT_PUBLIC_PARENT_SITE_URL=https://gamesramp.com
NEXT_PUBLIC_PARENT_API_KEY=your-secure-api-key-here
```

### 3. 添加子站点到白名单

在母站点的 `src/constants/config.ts` 中添加子站点域名。

## 安全注意事项

1. **API Key 保护**
   - 使用环境变量存储 API Key
   - 不要在代码中硬编码
   - 定期轮换 API Key

2. **白名单管理**
   - 只添加信任的子站点域名
   - 使用精确匹配而非通配符
   - 定期审查白名单

3. **HTTPS 要求**
   - 生产环境必须使用 HTTPS
   - 本地开发可使用 HTTP

## 故障排查

### CORS 错误：No 'Access-Control-Allow-Origin' header

**原因**：请求来源不在白名单中

**解决**：
1. 检查 `CHILD_SITE_WHITELIST` 是否包含该域名
2. 确认域名拼写正确（包括协议、端口）
3. 重启母站点服务使配置生效

### 401 Unauthorized

**原因**：API Key 验证失败

**解决**：
1. 检查子站点 `NEXT_PUBLIC_PARENT_API_KEY` 环境变量
2. 确认母站点 `FETCH_API_KEY` 配置正确
3. 确保两边的 API Key 一致

### OPTIONS 预检请求失败

**原因**：预检请求未正确处理

**解决**：
1. 确认 `validateApiKey()` 函数已更新
2. 检查是否正确导入 `handleCorsPreFlight`
3. 查看服务器日志排查错误

## 代码架构

### 关键设计决策

**OPTIONS 独立处理器**

我们为每个 API 端点单独导出 `OPTIONS` 函数，而不是在 `validateApiKey` 中处理预检请求。

**原因**:
1. **职责分离** - OPTIONS 是 HTTP 协议层面的事，不应该和业务逻辑（API Key 验证）混在一起
2. **清晰度** - 每个端点文件中可以清楚看到支持哪些 HTTP 方法
3. **符合 Next.js 约定** - Next.js App Router 推荐为每个 HTTP 方法导出单独的函数
4. **可维护性** - 未来如果需要为 OPTIONS 添加特殊逻辑，非常容易修改

**示例对比**:

```typescript
// ❌ 不推荐：OPTIONS 混在业务逻辑中
export async function GET(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    // 处理预检...
  }
  // 业务逻辑...
}

// ✅ 推荐：OPTIONS 独立处理
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  const origin = request.headers.get('origin');
  return addCorsHeaders(response, origin);
}

export async function GET(request: NextRequest) {
  // 只关注 GET 请求的业务逻辑
}
```

## 相关文件

- `src/constants/config.ts` - 白名单配置
- `src/lib/fetch-cors.ts` - CORS 工具函数（只包含 `addCorsHeaders`）
- `src/lib/fetch-auth.ts` - API 认证和 CORS 集成
- `src/app/api/fetch/**/route.ts` - 所有 Fetch API 端点（每个都有独立的 OPTIONS 处理器）

## 更新日志

- 2025-01-14: 重构为独立的 OPTIONS 处理器（更符合 RESTful 设计）
- 2025-01-14: 添加完整的 CORS 支持
- 2025-01-14: 创建子站点白名单机制
- 2025-01-14: 集成到所有 Fetch API 端点
