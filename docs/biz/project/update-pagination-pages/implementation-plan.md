# 实施计划

## 分阶段实施策略

采用渐进式迁移策略，分 4 个阶段完成，确保每个阶段都可独立部署和回滚。

## Phase 1: Tag 详情页迁移（P0 - 紧急）

### 目标
解决已报错的 Tag 详情页，恢复用户访问功能。

### 时间估算
- 开发: 2 小时
- 测试: 1 小时
- 部署: 0.5 小时
- **总计: 3.5 小时**

### 任务清单

#### 1.1 重命名文件
```bash
# 操作
mv src/app/[locale]/tag/[slug]/page.tsx \
   src/app/[locale]/tag/[...slug]/page.tsx
```

#### 1.2 更新 TypeScript 类型
```typescript
// src/app/[locale]/tag/[...slug]/page.tsx

interface TagPageProps extends LocalePageProps {
  params: Promise<{
    locale: string;
    slug: string[];  // ← 修改这里
  }>;
  // 删除 searchParams
}
```

#### 1.3 实现路由解析逻辑
```typescript
async function TagPage(props: TagPageProps) {
  const { locale, slug } = await props.params;

  // 验证和解析
  if (slug.length === 0 || slug.length > 2) {
    notFound();
  }

  const tagSlug = slug[0];
  const pageStr = slug[1];

  if (pageStr !== undefined) {
    const page = Number(pageStr);
    if (isNaN(page) || page < 1 || !Number.isInteger(page)) {
      notFound();
    }
  }

  const currentPage = pageStr ? Number(pageStr) : 1;

  // 获取数据（代码不变）
  const tagData = await getGamesByTag(tagSlug, currentPage, 16, db, locale);

  if (!tagData || currentPage > tagData.pagination.totalPages) {
    notFound();
  }

  // 渲染（代码不变）
  return <TagPageUI />;
}
```

#### 1.4 更新 generateMetadata
```typescript
export async function generateMetadata(props: TagPageProps) {
  const { locale, slug } = await props.params;
  const tagSlug = slug[0];
  const page = slug[1] ? Number(slug[1]) : 1;

  // ... 其他逻辑
  return {
    title: page > 1
      ? `${tag.metadataTitle || tag.name} - Page ${page}`
      : tag.metadataTitle || tag.name,
    description: tag.metadataDescription || '',
  };
}
```

#### 1.5 更新 Pagination 组件调用
```typescript
<Pagination
  currentPage={currentPage}
  totalPages={tagData.pagination.totalPages}
  baseUrl={`/tag/${tagSlug}`}  // ← 新增 baseUrl
/>
```

#### 1.6 测试
- [ ] `/tag/action-games` → 第1页正常显示
- [ ] `/tag/action-games/2` → 第2页正常显示
- [ ] `/tag/action-games/abc` → 404
- [ ] `/tag/action-games/0` → 404
- [ ] `/tag/action-games/999` → 404
- [ ] 元数据正确生成
- [ ] 分页组件链接正确

### 交付物
- [x] Tag 页面代码完成
- [x] 单元测试通过
- [x] 集成测试通过
- [x] 代码审查通过

---

## Phase 2: Category 详情页迁移（P0 - 紧急）

### 目标
迁移 Category 详情页，防止潜在报错。

### 时间估算
- 开发: 1.5 小时（复用 Tag 页面的逻辑）
- 测试: 0.5 小时
- 部署: 0.5 小时
- **总计: 2.5 小时**

### 任务清单

#### 2.1 重命名文件
```bash
mv src/app/[locale]/category/[slug]/page.tsx \
   src/app/[locale]/category/[...slug]/page.tsx
```

#### 2.2 复用 Tag 页面的实现
- [ ] 复制路由解析逻辑
- [ ] 复制验证逻辑
- [ ] 复制元数据生成逻辑
- [ ] 更新 Pagination 组件调用

#### 2.3 测试
- [ ] `/category/puzzle` → 第1页正常显示
- [ ] `/category/puzzle/2` → 第2页正常显示
- [ ] 边缘情况处理正确
- [ ] 分页链接正确

### 交付物
- [x] Category 页面代码完成
- [x] 测试通过
- [x] 代码审查通过

---

## Phase 3: 列表页迁移（P1 - 优化）

### 目标
迁移 Games、Hot、New 三个列表页，启用 ISR 缓存。

### 时间估算
- 开发: 2 小时
- 测试: 1 小时
- 部署: 0.5 小时
- **总计: 3.5 小时**

### 3.1 Games 列表页

#### 文件结构变化
```bash
# 方案 A: 嵌套路由（推荐）
src/app/[locale]/games/[[...page]]/page.tsx

# 方案 B: 重命名（简单）
# 如果选择这个方案，URL 会是 /games-2 而不是 /games/2
# 不推荐
```

#### 实现
```typescript
// src/app/[locale]/games/[[...page]]/page.tsx

interface AllGamesPageProps extends LocalePageProps {
  params: Promise<{
    locale: string;
    page?: string[];  // 可选 catch-all
  }>;
}

async function AllGamesPage(props: AllGamesPageProps) {
  const { locale, page: pageParam } = await props.params;

  // 解析页码
  let currentPage = 1;
  if (pageParam && pageParam.length > 0) {
    if (pageParam.length > 1) {
      notFound();  // /games/2/extra
    }

    const pageNum = Number(pageParam[0]);
    if (isNaN(pageNum) || pageNum < 1 || !Number.isInteger(pageNum)) {
      notFound();
    }

    currentPage = pageNum;
  }

  // 其他逻辑不变
  const gamesData = await getAllGames(currentPage, 16, db, locale);

  if (currentPage > gamesData.pagination.totalPages) {
    notFound();
  }

  return <GamesPageUI />;
}
```

#### 更新 Pagination 调用
```typescript
<Pagination
  currentPage={currentPage}
  totalPages={gamesData.pagination.totalPages}
  baseUrl="/games"
/>
```

### 3.2 Hot 和 New 列表页

完全相同的实现方式，只需要：
1. 创建 `src/app/[locale]/hot/[[...page]]/page.tsx`
2. 创建 `src/app/[locale]/new/[[...page]]/page.tsx`
3. 复用 Games 页面的路由解析逻辑

### 测试
- [ ] `/games` → 第1页
- [ ] `/games/2` → 第2页
- [ ] `/hot` → 第1页
- [ ] `/hot/3` → 第3页
- [ ] `/new` → 第1页
- [ ] `/new/2` → 第2页
- [ ] 边缘情况正确处理

### 交付物
- [x] 三个列表页代码完成
- [x] 测试通过
- [x] 代码审查通过

---

## Phase 4: Pagination 组件和向后兼容（P1）

### 目标
1. 更新 Pagination 组件支持新 URL 格式
2. 添加 Middleware 重定向旧 URL
3. 更新 Sitemap 生成逻辑

### 时间估算
- 开发: 2 小时
- 测试: 1 小时
- 部署: 0.5 小时
- **总计: 3.5 小时**

### 4.1 Pagination 组件更新

#### 接口调整
```typescript
// src/components/ui/pagination.tsx

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;  // 新增
  showFirstLast?: boolean;  // 可选：显示首页/末页按钮
  maxVisible?: number;  // 可选：最多显示多少页码
}
```

#### 实现 URL 生成逻辑
```typescript
function Pagination({
  currentPage,
  totalPages,
  baseUrl,
  showFirstLast = false,
  maxVisible = 7,
}: PaginationProps) {
  const getPageUrl = (page: number) => {
    if (page === 1) {
      return baseUrl;
    }
    return `${baseUrl}/${page}`;
  };

  // 计算显示的页码范围
  const getVisiblePages = () => {
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const halfVisible = Math.floor(maxVisible / 2);
    let start = Math.max(1, currentPage - halfVisible);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center justify-center gap-2">
      {/* 首页 */}
      {showFirstLast && currentPage > 1 && (
        <Link href={getPageUrl(1)}>First</Link>
      )}

      {/* 上一页 */}
      {currentPage > 1 && (
        <Link href={getPageUrl(currentPage - 1)}>Previous</Link>
      )}

      {/* 页码列表 */}
      {visiblePages[0] > 1 && <span>...</span>}

      {visiblePages.map(page => (
        <Link
          key={page}
          href={getPageUrl(page)}
          className={cn(
            'px-4 py-2 rounded',
            page === currentPage && 'bg-primary text-primary-foreground'
          )}
        >
          {page}
        </Link>
      ))}

      {visiblePages[visiblePages.length - 1] < totalPages && <span>...</span>}

      {/* 下一页 */}
      {currentPage < totalPages && (
        <Link href={getPageUrl(currentPage + 1)}>Next</Link>
      )}

      {/* 末页 */}
      {showFirstLast && currentPage < totalPages && (
        <Link href={getPageUrl(totalPages)}>Last</Link>
      )}
    </div>
  );
}
```

### 4.2 Middleware 重定向

#### 实现旧 URL 重定向
```typescript
// src/middleware.ts

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const page = searchParams.get('page');

  if (!page) {
    return NextResponse.next();
  }

  let newPathname: string | null = null;

  // Tag 页面重定向
  if (pathname.match(/^\/([a-z]{2}\/)?tag\/[^/]+$/)) {
    newPathname = page === '1' ? pathname : `${pathname}/${page}`;
  }

  // Category 页面重定向
  if (pathname.match(/^\/([a-z]{2}\/)?category\/[^/]+$/)) {
    newPathname = page === '1' ? pathname : `${pathname}/${page}`;
  }

  // Games/Hot/New 列表重定向
  if (pathname.match(/^\/([a-z]{2}\/)?(games|hot|new)$/)) {
    newPathname = page === '1' ? pathname : `${pathname}/${page}`;
  }

  if (newPathname) {
    const newUrl = new URL(request.url);
    newUrl.pathname = newPathname;
    newUrl.search = '';  // 移除查询参数

    console.log(`[Redirect] ${pathname}?page=${page} → ${newPathname}`);

    return NextResponse.redirect(newUrl, 301);  // 永久重定向
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 4.3 Sitemap 更新

```typescript
// src/app/sitemap.ts

// 不包含分页 URL，只包含第一页
for (const tag of tagsWithGames) {
  for (const locale of LOCALES) {
    const localeUrl = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
    sitemapEntries.push({
      url: `${SITE_URL}${localeUrl}/tag/${tag.slug}`,  // 不带页码
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    });
  }
}

// Category、Games、Hot、New 同理
```

### 测试
- [ ] `/tag/action?page=2` → 重定向到 `/tag/action/2`
- [ ] `/tag/action?page=1` → 重定向到 `/tag/action`
- [ ] `/games?page=3` → 重定向到 `/games/3`
- [ ] Sitemap 不包含分页 URL
- [ ] Pagination 组件生成正确的 URL

### 交付物
- [x] Pagination 组件更新完成
- [x] Middleware 重定向实现
- [x] Sitemap 更新完成
- [x] 所有测试通过

---

## Phase 5: Payment 页面处理（P2 - 低优先级）

### 目标
将 Payment Success 和 Cancel 页面改为完全动态渲染。

### 时间估算
- 开发: 0.5 小时
- 测试: 0.5 小时
- **总计: 1 小时**

### 实现

#### Payment Success
```typescript
// src/app/[locale]/payment/success/page.tsx

// 删除 revalidate
// 添加 dynamic
export const dynamic = 'force-dynamic';

// 代码其他部分不变
async function PaymentSuccessPage(props: PaymentSuccessPageProps) {
  const { session_id } = await props.searchParams;  // ✅ 现在可以使用
  // ...
}
```

#### Payment Cancel
```typescript
// src/app/[locale]/payment/cancel/page.tsx

export const dynamic = 'force-dynamic';

async function PaymentCancel(props: PaymentCancelPageProps) {
  const { errorCode } = await props.searchParams;  // ✅ 现在可以使用
  // ...
}
```

### 测试
- [ ] Payment Success 页面正常工作
- [ ] Payment Cancel 页面正常工作
- [ ] 查询参数正确解析

---

## 总时间估算

| Phase | 时间 | 优先级 |
|-------|------|--------|
| Phase 1: Tag | 3.5 小时 | P0 |
| Phase 2: Category | 2.5 小时 | P0 |
| Phase 3: Games/Hot/New | 3.5 小时 | P1 |
| Phase 4: Pagination & Compatibility | 3.5 小时 | P1 |
| Phase 5: Payment | 1 小时 | P2 |
| **总计** | **14 小时** | |

## 部署策略

### 1. 开发环境验证
- [ ] 本地开发环境测试
- [ ] 所有功能正常
- [ ] 性能测试通过

### 2. 预发布环境
- [ ] 部署到 Preview 环境
- [ ] 完整回归测试
- [ ] 性能对比测试

### 3. 生产环境
- [ ] 选择低流量时段部署
- [ ] 逐步放量（如果支持）
- [ ] 监控错误率和性能指标

### 4. 回滚方案
```bash
# 如果发现问题，立即回滚到上一个版本
git revert <commit-hash>
pnpm deploy
```

## 验收标准

### 功能验收
- [ ] 所有分页页面正常访问
- [ ] 旧 URL 正确重定向
- [ ] 404 页面正确处理
- [ ] SEO 元数据正确

### 性能验收
- [ ] ISR 缓存命中率 > 95%
- [ ] 首页响应时间 < 200ms
- [ ] 分页响应时间 < 200ms
- [ ] 数据库查询减少 > 90%

### SEO 验收
- [ ] Sitemap 正确生成
- [ ] rel="next/prev" 正确设置
- [ ] Canonical URL 正确
- [ ] 所有页面可被索引

## 监控指标

### 部署后监控（7天）

1. **错误率**
   - 目标: < 0.1%
   - 监控工具: Sentry

2. **响应时间**
   - P50: < 100ms
   - P95: < 300ms
   - P99: < 500ms

3. **缓存命中率**
   - 目标: > 95%
   - 监控: Cloudflare Analytics

4. **SEO 表现**
   - 索引页面数量
   - 搜索可见性
   - 监控: Google Search Console

## 风险管理

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 旧链接大量失效 | 高 | 低 | 301 重定向 + 监控 |
| 性能不如预期 | 中 | 低 | 回滚 + 调优 |
| SEO 短期下降 | 中 | 中 | 提交 sitemap + canonical |
| 边缘情况未覆盖 | 低 | 中 | 充分测试 + 错误监控 |

## 总结

采用分阶段实施策略，确保：
1. **优先解决紧急问题**（Tag/Category P0）
2. **逐步优化性能**（列表页 P1）
3. **完善向后兼容**（重定向和 Sitemap）
4. **低风险部署**（可独立部署和回滚）

预计总工时 **14 小时**，分 2-3 个工作日完成。
