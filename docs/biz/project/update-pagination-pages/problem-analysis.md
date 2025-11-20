# 问题分析

## 问题描述

### 错误信息
```
Error: Dynamic server usage: Route /[locale]/tag/[slug] couldn't be rendered statically
because it used `await searchParams`, `searchParams.then`, or similar.
See more info here: https://nextjs.org/docs/messages/dynamic-server-error
```

### 触发条件
在生产环境访问带分页参数的 URL（如 `/en/tag/action-games?page=2`）时触发 500 错误。

## 根本原因

### Next.js 15 渲染模型变化

```typescript
// src/app/[locale]/tag/[slug]/page.tsx

export const revalidate = 3600;  // ❌ 声明为静态/ISR
export async function generateStaticParams() { return [] }

async function TagPage(props: TagPageProps) {
  const searchParams = await props.searchParams;  // ❌ 使用动态 API
  const currentPage = Number(searchParams?.page) || 1;
  // ...
}
```

**冲突点**：
1. `revalidate` 告诉 Next.js 这是**静态生成路由**（SSG/ISR）
2. 访问 `searchParams` 是**动态运行时行为**
3. Next.js 15 严格区分静态和动态，不允许在静态路由中使用动态 API

### 为什么 Next.js 14 没问题？

Next.js 14 会自动将使用 `searchParams` 的路由降级为动态渲染，但 Next.js 15 改为严格模式，要求开发者明确选择渲染策略。

## 技术细节

### 静态 API vs 动态 API

| API | 类型 | 能否用于 ISR |
|-----|------|-------------|
| `params` | 静态 | ✅ 可以 |
| `searchParams` | 动态 | ❌ 不可以 |
| `cookies()` | 动态 | ❌ 不可以 |
| `headers()` | 动态 | ❌ 不可以 |

### 为什么 `params` 是静态的？

```typescript
// params 在路由匹配时就确定了
// /tag/action-games → params = { slug: 'action-games' }

// searchParams 是运行时动态的
// /tag/action-games?page=2 → searchParams = { page: '2' }
// /tag/action-games?page=3 → searchParams = { page: '3' }
```

`params` 是路由的一部分，在请求到达前就能确定；而 `searchParams` 是查询字符串，只能在运行时解析。

## 影响范围分析

### 已发现的问题页面

1. **Tag 详情页** (`/tag/[slug]`)
   - 状态：✅ 已报错
   - 影响：用户无法访问标签的第 2+ 页
   - 紧急程度：P0

2. **Category 详情页** (`/category/[slug]`)
   - 状态：⚠️ 潜在问题
   - 影响：相同代码模式，可能随时报错
   - 紧急程度：P0

3. **Games 列表** (`/games`)
   - 状态：⚠️ 潜在问题
   - 影响：失去 ISR 缓存
   - 紧急程度：P1

4. **Hot 游戏** (`/hot`)
   - 状态：⚠️ 潜在问题
   - 影响：失去 ISR 缓存
   - 紧急程度：P1

5. **New 游戏** (`/new`)
   - 状态：⚠️ 潜在问题
   - 影响：失去 ISR 缓存
   - 紧急程度：P1

### 不需要修复的页面

6. **Payment Success** (`/payment/success`)
   - 用途：Stripe 支付回调，参数 `session_id`
   - 建议：改为 `dynamic = 'force-dynamic'`
   - 原因：每次支付回调都是唯一的，不适合缓存

7. **Payment Cancel** (`/payment/cancel`)
   - 用途：支付失败页面，参数 `errorCode`
   - 建议：改为 `dynamic = 'force-dynamic'`
   - 原因：错误页面不需要缓存

## 性能影响评估

### 当前状态（使用 searchParams）

```
┌─────────────────────────────────────────┐
│  每次请求流程                            │
└─────────────────────────────────────────┘

用户访问 /tag/action-games?page=2
  ↓
服务端检测到 searchParams 使用
  ↓
强制动态渲染（SSR）
  ↓
查询数据库获取数据
  ↓
渲染 HTML 返回
  ↓
响应时间: ~500-1000ms

❌ 无缓存
❌ 数据库压力大
❌ 响应慢
```

### 迁移后（使用 Catch-All 路由）

```
┌─────────────────────────────────────────┐
│  首次请求流程                            │
└─────────────────────────────────────────┘

用户首次访问 /tag/action-games/2
  ↓
检查缓存 (未命中)
  ↓
查询数据库获取数据
  ↓
渲染 HTML 并缓存 (1小时)
  ↓
返回 HTML
  ↓
响应时间: ~500-1000ms

┌─────────────────────────────────────────┐
│  后续请求流程 (1小时内)                  │
└─────────────────────────────────────────┘

用户访问 /tag/action-games/2
  ↓
检查缓存 (命中)
  ↓
直接返回缓存的 HTML
  ↓
响应时间: ~50-100ms

✅ 有缓存 (1小时)
✅ 数据库压力小
✅ 响应快 (10倍提升)
```

### 数据库压力对比

假设某个热门标签页面，每小时有 1000 次访问：

| 方案 | 数据库查询次数/小时 | 缓存命中率 |
|------|------------------|-----------|
| searchParams (动态) | 1000 | 0% |
| Catch-All (ISR) | 1 | 99.9% |

**节省**: 99.9% 的数据库查询

## SEO 影响分析

### 当前方案 (Query String)

```
URL: /tag/action-games?page=2

问题:
❌ 搜索引擎可能将查询参数视为过滤条件
❌ rel="next/prev" 链接支持不佳
❌ sitemap 难以包含分页 URL
```

### 新方案 (Path Parameters)

```
URL: /tag/action-games/2

优势:
✅ 每个分页都是独立的 URL
✅ 可以被搜索引擎独立索引
✅ 更好的 rel="next/prev" 支持
✅ sitemap 可以选择性包含
✅ URL 更简洁美观
```

## 代码复杂度分析

### 迁移工作量评估

| 文件类型 | 需要修改的文件数 | 工作量 |
|---------|----------------|--------|
| 页面组件 | 5 个 | 2-3 小时 |
| Pagination 组件 | 1 个 | 1 小时 |
| Middleware (重定向) | 1 个 | 1 小时 |
| TypeScript 类型 | 5 个 | 0.5 小时 |
| 测试 | 5 个页面 | 2 小时 |

**总计**: 约 6.5-7.5 小时

### 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 旧 URL 失效 | 高 | 添加 301 重定向 |
| 外部链接断开 | 中 | 保留 3-6 个月的重定向 |
| 搜索引擎索引混乱 | 中 | 提交新 sitemap |
| 边缘情况未处理 | 低 | 充分测试 + 错误处理 |

## 结论

### 必须解决的原因

1. **功能性**：Tag 和 Category 页面已无法正常工作
2. **性能**：ISR 可以减少 99% 的数据库查询
3. **SEO**：更好的搜索引擎友好性
4. **一致性**：统一的渲染策略

### 不解决的后果

1. 用户无法访问标签/分类的分页内容
2. 数据库压力过大
3. 响应时间长，用户体验差
4. SEO 表现不佳

### 推荐方案

采用 **Catch-All 路由方案**，原因：
- ✅ 完美支持 ISR
- ✅ 性能最佳
- ✅ SEO 友好
- ✅ URL 简洁
- ✅ 实现复杂度适中
