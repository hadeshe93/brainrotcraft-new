# 迁移检查清单

## 总览

本文档提供详细的逐步检查清单，用于执行分页页面迁移。建议按顺序完成每个 Phase。

---

## Phase 1: Tag 详情页迁移

### 准备工作
- [ ] 创建功能分支 `feature/pagination-catch-all-tag`
- [ ] 备份当前代码 `git tag backup-before-tag-migration`
- [ ] 确认本地环境可以正常运行

### 代码修改

#### 1.1 文件重命名
```bash
# 执行命令
git mv src/app/[locale]/tag/[slug]/page.tsx \
       src/app/[locale]/tag/[...slug]/page.tsx

# 验证
ls -la src/app/[locale]/tag/
# 应该看到 [...slug]/ 目录
```
- [ ] 文件重命名完成
- [ ] Git 正确追踪重命名

#### 1.2 更新 TypeScript 类型
打开 `src/app/[locale]/tag/[...slug]/page.tsx`

```typescript
// 修改前
interface TagPageProps extends LocalePageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams?: Promise<{ page?: string }>;
}

// 修改后
interface TagPageProps extends LocalePageProps {
  params: Promise<{ locale: string; slug: string[] }>;
  // 完全删除 searchParams
}
```
- [ ] TypeScript 类型更新完成
- [ ] 删除 searchParams 相关代码

#### 1.3 实现路由解析逻辑
在 `TagPage` 函数开头添加：

```typescript
async function TagPage(props: TagPageProps) {
  try {
    const { locale, slug } = await props.params;

    // 1. 验证 slug 数组
    if (slug.length === 0 || slug.length > 2) {
      notFound();
    }

    // 2. 提取标签 slug 和页码
    const tagSlug = slug[0];
    const pageStr = slug[1];

    // 3. 验证页码
    if (pageStr !== undefined) {
      const page = Number(pageStr);
      if (isNaN(page) || page < 1 || !Number.isInteger(page)) {
        notFound();
      }
    }

    // 4. 确定当前页码
    const currentPage = pageStr ? Number(pageStr) : 1;

    // 原有代码继续...
    const env = await getCloudflareEnv();
    const db = (env as any).DB as D1Database;
    const tagData = await getGamesByTag(tagSlug, currentPage, 16, db, locale as any);

    if (!tagData) {
      notFound();
    }

    // 5. 验证页码范围
    if (currentPage > tagData.pagination.totalPages) {
      notFound();
    }

    // ... 渲染逻辑
  } catch (error) {
    console.error('TagPage error:', error);
    notFound();
  }
}
```
- [ ] 路由解析逻辑实现完成
- [ ] 边缘情况处理完成
- [ ] 错误处理添加完成

#### 1.4 更新 generateMetadata
```typescript
export async function generateMetadata(props: TagPageProps) {
  try {
    const { locale, slug } = await props.params;
    const tagSlug = slug[0];
    const page = slug[1] ? Number(slug[1]) : 1;

    const env = await getCloudflareEnv();
    const db = (env as any).DB as D1Database;
    const tagData = await getGamesByTag(tagSlug, page, 1, db, locale as any);

    if (!tagData) {
      return { title: '' };
    }

    const { tag } = tagData;

    return {
      title: page > 1
        ? `${tag.metadataTitle || tag.name} - Page ${page}`
        : tag.metadataTitle || tag.name,
      description: tag.metadataDescription || '',
      alternates: {
        canonical: page === 1
          ? `/tag/${tagSlug}`
          : `/tag/${tagSlug}/${page}`,
      },
      other: {
        ...(page > 1 && {
          'link:prev': `/tag/${tagSlug}${page === 2 ? '' : `/${page - 1}`}`
        }),
        ...(page < tagData.pagination.totalPages && {
          'link:next': `/tag/${tagSlug}/${page + 1}`
        }),
      },
    };
  } catch (error) {
    console.error('generateMetadata error:', error);
    return { title: '' };
  }
}
```
- [ ] generateMetadata 更新完成
- [ ] 分页标题添加完成
- [ ] SEO 链接添加完成

#### 1.5 更新 Pagination 组件调用
查找 `<Pagination` 组件调用，更新为：

```typescript
<Pagination
  currentPage={currentPage}
  totalPages={tagData.pagination.totalPages}
  baseUrl={`/tag/${tagSlug}`}  // ← 新增这行
/>
```
- [ ] Pagination 组件调用更新完成

#### 1.6 确保 ISR 配置正确
确认文件末尾有：

```typescript
export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}
```
- [ ] ISR 配置确认正确

### 本地测试

#### 1.7 编译测试
```bash
pnpm build
```
- [ ] 编译成功，无 TypeScript 错误
- [ ] 无 ESLint 错误

#### 1.8 开发服务器测试
```bash
pnpm dev
```

访问以下 URL 并验证：
- [ ] `http://localhost:4004/en/tag/action-games` → 显示第1页
- [ ] `http://localhost:4004/en/tag/action-games/2` → 显示第2页
- [ ] `http://localhost:4004/en/tag/action-games/3` → 显示第3页
- [ ] `http://localhost:4004/en/tag/nonexistent` → 404
- [ ] `http://localhost:4004/en/tag/action-games/abc` → 404
- [ ] `http://localhost:4004/en/tag/action-games/0` → 404
- [ ] `http://localhost:4004/en/tag/action-games/-1` → 404
- [ ] `http://localhost:4004/en/tag/action-games/999` → 404
- [ ] `http://localhost:4004/en/tag/action-games/1.5` → 404

#### 1.9 功能测试
- [ ] 游戏列表正确显示
- [ ] 分页按钮正确显示
- [ ] 点击"下一页"跳转到正确的 URL
- [ ] 点击"上一页"跳转到正确的 URL
- [ ] 点击页码跳转到正确的页面
- [ ] 第一页的 URL 不带 `/1`
- [ ] 其他页的 URL 带页码

#### 1.10 元数据测试
查看页面源代码（右键 → 查看源代码）：
- [ ] `<title>` 标签正确
- [ ] 第1页不带 "Page 1"
- [ ] 第2+页带 "Page X"
- [ ] `<meta name="description">` 正确
- [ ] `<link rel="canonical">` 正确
- [ ] 第2+页有 `<link rel="prev">`
- [ ] 非最后页有 `<link rel="next">`

### 代码审查
- [ ] 代码符合项目规范
- [ ] 注释清晰
- [ ] 无硬编码
- [ ] 错误处理完善

### 提交代码
```bash
git add .
git commit -m "feat: migrate tag page to catch-all route for ISR support"
git push origin feature/pagination-catch-all-tag
```
- [ ] 代码提交完成
- [ ] 创建 Pull Request

---

## Phase 2: Category 详情页迁移

### 准备工作
- [ ] 创建功能分支 `feature/pagination-catch-all-category`
- [ ] 确认 Tag 页面迁移已完成并合并

### 代码修改

#### 2.1 文件重命名
```bash
git mv src/app/[locale]/category/[slug]/page.tsx \
       src/app/[locale]/category/[...slug]/page.tsx
```
- [ ] 文件重命名完成

#### 2.2 复制 Tag 页面的实现
直接复用 Tag 页面的逻辑，只需要修改：
- 类型名称: `TagPageProps` → `CategoryPageProps`
- 函数名称: `TagPage` → `CategoryPage`
- 数据获取: `getGamesByTag` → `getGamesByCategory`
- URL 前缀: `/tag/` → `/category/`

- [ ] TypeScript 类型更新
- [ ] 路由解析逻辑复制
- [ ] generateMetadata 更新
- [ ] Pagination 组件调用更新
- [ ] ISR 配置确认

### 本地测试

#### 2.3 基础测试
```bash
pnpm dev
```

- [ ] `/en/category/puzzle` → 第1页
- [ ] `/en/category/puzzle/2` → 第2页
- [ ] `/en/category/puzzle/abc` → 404
- [ ] `/en/category/puzzle/999` → 404

#### 2.4 功能和元数据测试
- [ ] 游戏列表正确
- [ ] 分页正常
- [ ] 元数据正确

### 提交代码
```bash
git add .
git commit -m "feat: migrate category page to catch-all route"
git push origin feature/pagination-catch-all-category
```
- [ ] 代码提交完成
- [ ] 创建 Pull Request

---

## Phase 3: 列表页迁移 (Games/Hot/New)

### 3.1 Games 列表页

#### 文件重组
```bash
# 创建新目录
mkdir -p src/app/[locale]/games/\[\[...page\]\]

# 移动文件
mv src/app/[locale]/games/page.tsx \
   src/app/[locale]/games/[[...page]]/page.tsx
```
- [ ] 目录创建完成
- [ ] 文件移动完成

#### 代码修改
```typescript
// 类型修改
interface AllGamesPageProps extends LocalePageProps {
  params: Promise<{
    locale: string;
    page?: string[];  // 可选 catch-all
  }>;
  // 删除 searchParams
}

// 路由解析
async function AllGamesPage(props: AllGamesPageProps) {
  const { locale, page: pageParam } = await props.params;

  let currentPage = 1;
  if (pageParam && pageParam.length > 0) {
    if (pageParam.length > 1) {
      notFound();
    }

    const pageNum = Number(pageParam[0]);
    if (isNaN(pageNum) || pageNum < 1 || !Number.isInteger(pageNum)) {
      notFound();
    }

    currentPage = pageNum;
  }

  // ... 其他逻辑
}
```
- [ ] 类型更新完成
- [ ] 路由解析实现
- [ ] Pagination 更新: `baseUrl="/games"`

#### 测试
- [ ] `/games` → 第1页
- [ ] `/games/2` → 第2页
- [ ] `/games/abc` → 404

### 3.2 Hot 列表页
- [ ] 创建 `src/app/[locale]/hot/[[...page]]/page.tsx`
- [ ] 复制 Games 页面逻辑
- [ ] 修改数据获取函数为 `getHotGames`
- [ ] 更新 Pagination: `baseUrl="/hot"`
- [ ] 测试通过

### 3.3 New 列表页
- [ ] 创建 `src/app/[locale]/new/[[...page]]/page.tsx`
- [ ] 复制 Games 页面逻辑
- [ ] 修改数据获取函数为 `getNewGames`
- [ ] 更新 Pagination: `baseUrl="/new"`
- [ ] 测试通过

### 提交代码
```bash
git add .
git commit -m "feat: migrate games/hot/new pages to catch-all routes"
git push origin feature/pagination-catch-all-lists
```
- [ ] 代码提交完成

---

## Phase 4: Pagination 组件和向后兼容

### 4.1 更新 Pagination 组件

打开 `src/components/ui/pagination.tsx`

#### 接口更新
```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;  // 新增
  showFirstLast?: boolean;  // 可选
  maxVisible?: number;  // 可选
}
```
- [ ] 接口更新完成

#### 实现 URL 生成
```typescript
const getPageUrl = (page: number) => {
  if (page === 1) {
    return baseUrl;
  }
  return `${baseUrl}/${page}`;
};
```
- [ ] URL 生成函数实现
- [ ] 所有链接使用 `getPageUrl()`

#### 页码范围计算（可选优化）
```typescript
const getVisiblePages = () => {
  // 如果总页数少，全部显示
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // 否则显示当前页附近的页码
  const halfVisible = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - halfVisible);
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};
```
- [ ] 页码范围计算实现（可选）
- [ ] 省略号显示逻辑实现（可选）

### 4.2 更新所有 Pagination 调用

查找项目中所有 `<Pagination` 使用，确保都传入 `baseUrl`：

- [ ] Tag 页面: `baseUrl={`/tag/${tagSlug}`}`
- [ ] Category 页面: `baseUrl={`/category/${categorySlug}`}`
- [ ] Games 页面: `baseUrl="/games"`
- [ ] Hot 页面: `baseUrl="/hot"`
- [ ] New 页面: `baseUrl="/new"`

### 4.3 Middleware 重定向

打开 `src/middleware.ts`，添加重定向逻辑：

```typescript
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const page = searchParams.get('page');

  if (!page) {
    // 没有 page 参数，继续其他逻辑
    return NextResponse.next();
  }

  let newPathname: string | null = null;

  // Tag 页面
  if (pathname.match(/^\/([a-z]{2}\/)?tag\/[^/]+$/)) {
    newPathname = page === '1' ? pathname : `${pathname}/${page}`;
  }

  // Category 页面
  else if (pathname.match(/^\/([a-z]{2}\/)?category\/[^/]+$/)) {
    newPathname = page === '1' ? pathname : `${pathname}/${page}`;
  }

  // Games/Hot/New 列表
  else if (pathname.match(/^\/([a-z]{2}\/)?(games|hot|new)$/)) {
    newPathname = page === '1' ? pathname : `${pathname}/${page}`;
  }

  if (newPathname) {
    const newUrl = new URL(request.url);
    newUrl.pathname = newPathname;
    newUrl.search = '';

    console.log(`[Pagination Redirect] ${pathname}?page=${page} → ${newPathname}`);

    return NextResponse.redirect(newUrl, 301);  // 永久重定向
  }

  // 继续其他 middleware 逻辑
  return NextResponse.next();
}
```
- [ ] 重定向逻辑实现
- [ ] 正则表达式测试通过
- [ ] 日志记录添加

### 4.4 测试重定向

```bash
pnpm dev
```

访问旧 URL，验证重定向：
- [ ] `/tag/action?page=2` → `/tag/action/2` (301)
- [ ] `/tag/action?page=1` → `/tag/action` (301)
- [ ] `/category/puzzle?page=3` → `/category/puzzle/3` (301)
- [ ] `/games?page=2` → `/games/2` (301)
- [ ] `/hot?page=5` → `/hot/5` (301)
- [ ] `/new?page=3` → `/new/3` (301)

### 4.5 Sitemap 更新

打开 `src/app/sitemap.ts`，确认：

```typescript
// Tag 页面：只添加第一页
for (const tag of tagsWithGames) {
  sitemapEntries.push({
    url: `${SITE_URL}/tag/${tag.slug}`,  // 不带页码
    // ...
  });
}

// 不要添加分页 URL
// ❌ url: `${SITE_URL}/tag/${tag.slug}/2`
```
- [ ] Sitemap 只包含第一页
- [ ] 不包含分页 URL
- [ ] 所有列表页同样处理

### 提交代码
```bash
git add .
git commit -m "feat: add pagination component update and backward compatibility"
git push origin feature/pagination-compatibility
```
- [ ] 代码提交完成

---

## Phase 5: Payment 页面处理

### 5.1 Payment Success
打开 `src/app/[locale]/payment/success/page.tsx`

```typescript
// 删除
// export const revalidate = ...

// 添加
export const dynamic = 'force-dynamic';

// 其他代码不变
```
- [ ] 添加 `dynamic = 'force-dynamic'`
- [ ] 删除 `revalidate`（如果有）
- [ ] 测试功能正常

### 5.2 Payment Cancel
打开 `src/app/[locale]/payment/cancel/page.tsx`

```typescript
export const dynamic = 'force-dynamic';
```
- [ ] 添加 `dynamic = 'force-dynamic'`
- [ ] 测试功能正常

---

## 最终验证

### 完整构建测试
```bash
# 清理缓存
rm -rf .next

# 完整构建
pnpm build
```
- [ ] 构建成功
- [ ] 无 TypeScript 错误
- [ ] 无 ESLint 警告
- [ ] 构建输出显示正确的渲染模式：
  - `● /[locale]/tag/[...slug]` (ISR)
  - `● /[locale]/category/[...slug]` (ISR)
  - `● /[locale]/games/[[...page]]` (ISR)
  - `ƒ /[locale]/payment/success` (Dynamic)

### 生产预览测试
```bash
pnpm preview
```

测试所有功能：
- [ ] Tag 分页正常
- [ ] Category 分页正常
- [ ] Games/Hot/New 分页正常
- [ ] 旧 URL 重定向正常
- [ ] 404 页面正常
- [ ] SEO 元数据正确
- [ ] Sitemap 正确生成

### 性能测试

访问页面并观察：
- [ ] 首次访问响应时间 < 1s
- [ ] 第二次访问响应时间 < 200ms（缓存命中）
- [ ] 控制台无错误
- [ ] 网络请求正常

---

## 部署检查清单

### 部署前
- [ ] 所有代码审查通过
- [ ] 所有测试通过
- [ ] 文档更新完成
- [ ] Changelog 更新
- [ ] 团队成员知晓变更

### 部署到预发布环境
```bash
git checkout main
git merge feature/pagination-catch-all-*
git push origin main
```
- [ ] 部署到 Preview 环境
- [ ] 完整回归测试
- [ ] 性能指标正常
- [ ] 监控无异常

### 部署到生产环境
- [ ] 选择低流量时段
- [ ] 备份当前版本
- [ ] 执行部署
- [ ] 验证部署成功

### 部署后监控（24小时）
- [ ] 错误率 < 0.1%
- [ ] 响应时间正常
- [ ] 缓存命中率 > 90%
- [ ] 数据库查询减少
- [ ] 用户反馈正常

### SEO 验证（7天）
- [ ] 提交新 Sitemap 到 Google Search Console
- [ ] 检查索引状态
- [ ] 验证 canonical 标签
- [ ] 验证 rel="next/prev" 标签
- [ ] 搜索可见性无下降

---

## 回滚计划

### 触发条件
- 错误率 > 1%
- 响应时间 > 2s (P95)
- 核心功能不可用
- 数据库压力异常

### 回滚步骤
```bash
# 1. 回滚代码
git revert <commit-hash>
git push origin main

# 2. 重新部署
pnpm deploy

# 3. 验证
# 访问页面确认功能正常

# 4. 通知团队
```
- [ ] 回滚步骤文档化
- [ ] 团队知晓回滚流程

---

## 完成标志

所有以下项目都完成：
- [ ] Phase 1-5 所有代码完成
- [ ] 所有测试通过
- [ ] 生产环境部署成功
- [ ] 监控指标正常
- [ ] 文档更新完成
- [ ] 团队培训完成

**恭喜！迁移完成！🎉**
