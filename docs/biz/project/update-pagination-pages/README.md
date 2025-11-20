# 更新分页页面到 Catch-All 路由方案

## 项目概述

解决 Next.js 15 中使用 `searchParams` 导致的动态服务器渲染问题，将分页参数从查询字符串迁移到路径参数，以支持 ISR（增量静态再生）。

## 背景

### 问题
在 Next.js 15 中，访问 `searchParams` 会导致路由被标记为动态渲染，即使设置了 `revalidate`，也无法使用 ISR 功能。生产环境报错：
```
Error: Dynamic server usage: Route /[locale]/tag/[slug] couldn't be rendered statically
because it used `await searchParams`
```

### 影响范围
- 失去 ISR 缓存优势
- 每次请求都需要查询数据库
- 性能下降
- 无法在构建时跳过预渲染（导致本地构建使用本地数据库数据）

## 解决方案

采用 **Catch-All 路由 + 路径参数** 方案：
- 将分页参数从查询字符串（`?page=2`）迁移到路径（`/2`）
- 使用 `[...slug]` 捕获所有路径段
- 支持 ISR 缓存
- 保持 URL 简洁优雅

## 文档索引

1. [问题分析](./problem-analysis.md) - 详细的问题定位和技术分析
2. [解决方案设计](./solution-design.md) - 技术方案设计和对比
3. [实施计划](./implementation-plan.md) - 分阶段实施计划
4. [迁移检查清单](./migration-checklist.md) - 完整的迁移步骤清单

## 受影响的页面

### 需要迁移的分页页面（5个）

| 页面 | 当前路由 | 新路由 | 优先级 |
|------|---------|--------|--------|
| Tag 详情 | `/tag/[slug]?page=2` | `/tag/[...slug]` | P0 (已报错) |
| Category 详情 | `/category/[slug]?page=2` | `/category/[...slug]` | P0 (潜在报错) |
| Games 列表 | `/games?page=2` | `/games/[[...page]]` | P1 |
| Hot 游戏 | `/hot?page=2` | `/hot/[[...page]]` | P1 |
| New 游戏 | `/new?page=2` | `/new/[[...page]]` | P1 |

### 不需要迁移的页面（2个）

| 页面 | 原因 | 处理方式 |
|------|------|---------|
| Payment Success | 支付回调参数 `session_id` | 改为完全动态渲染 |
| Payment Cancel | 错误码参数 `errorCode` | 改为完全动态渲染 |

## 项目时间线

- **Phase 1 (P0)**: Tag 和 Category 详情页（已报错，紧急）
- **Phase 2 (P1)**: Games、Hot、New 列表页（优化）
- **Phase 3**: Payment 相关页面改为动态渲染
- **Phase 4**: 向后兼容性和旧 URL 重定向

## 预期收益

1. **性能提升**: 所有分页页面支持 ISR 缓存（1小时）
2. **SEO 优化**: 每个分页都是独立 URL，可被搜索引擎索引
3. **构建优化**: 本地构建不再访问数据库，避免数据不一致
4. **用户体验**: 更简洁的 URL 结构

## 技术负责人

- 方案设计：[待填写]
- 实施开发：[待填写]
- 代码审查：[待填写]

## 相关链接

- [Next.js 15 Dynamic Rendering 文档](https://nextjs.org/docs/messages/dynamic-server-error)
- [Next.js Catch-All Routes 文档](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes#catch-all-segments)
- [Next.js ISR 文档](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration)
