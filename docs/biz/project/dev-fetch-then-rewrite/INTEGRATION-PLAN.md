# LLM 改写审核流程集成计划

## 一、项目背景

### 1.1 现状分析

**现有实现（旧流程）：**
- 位置：`src/app/[locale]/admin/fetch/page.tsx`
- 核心组件：`FetchDashboard` + 4个对话框（Categories/Tags/Featured/Games）
- 流程：用户点击"拉取" → 调用旧 API → 直接导入数据库
- 特点：快速、简单，但内容与母站完全相同（SEO 风险）

**新实现（已完成）：**
- Preview/Confirm 双 API 模式
- LLM 内容改写服务（`ContentRewriter`）
- 审核对话框组件（`ContentReviewDialog`）
- 依赖处理组件（`MissingDependenciesDialog`）
- 测试页面：`src/app/[locale]/admin/fetch-rewrite-test/page.tsx`

### 1.2 核心问题

**为什么不需要新旧按钮共存？**

旧流程的"直接导入原始内容"功能，在新流程的审核阶段可以通过"使用原始内容"选项实现：

```
旧流程：点击"拉取" → 直接导入原始内容
新流程：点击"预览" → 审核对话框 → 选择"使用原始内容" → 导入原始内容

结果：完全一致！
```

因此，**新流程完全覆盖旧流程的所有场景**，无需保留旧按钮。

---

## 二、集成方案设计

### 2.1 核心策略：完全替换旧流程

**设计原则：**
- ✅ 所有操作统一走新流程（preview → review → confirm）
- ✅ 审核阶段是必须的（确保内容质量可控）
- ✅ 在审核时提供"使用原始内容"选项（覆盖旧流程场景）
- ✅ 旧 API 保留但标记为 deprecated（便于紧急回滚）

### 2.2 流程对比

#### 旧流程（将被替换）
```
┌─────────────────────────────────────────┐
│ 用户操作：点击"一键拉取所有"              │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ API: POST /api/admin/fetch/categories   │
│ - 拉取数据                               │
│ - 直接导入数据库（原始内容）              │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ 结果：导入成功，显示 Toast 提示          │
└─────────────────────────────────────────┘
```

#### 新流程（替换后）
```
┌─────────────────────────────────────────┐
│ 用户操作：点击"预览并审核"               │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ API 1: POST /api/admin/fetch/           │
│        categories/preview                │
│ - 拉取数据                               │
│ - 检查新记录                             │
│ - 对新记录执行 LLM 改写                  │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ 前端：打开 ContentReviewDialog          │
│ - 显示原始 vs 改写内容对比              │
│ - 管理员逐个审核                         │
│ - 选择：使用改写/使用原始/跳过/重新改写  │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ API 2: POST /api/admin/fetch/           │
│        categories/confirm                │
│ - 根据审核决策导入数据库                 │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ 结果：导入成功，显示详细统计             │
└─────────────────────────────────────────┘
```

### 2.3 UI 改造方案

#### A. 批量操作按钮（Categories/Tags/Featured）

**改造前：**
```tsx
<Button onClick={handleFetchAll}>
  一键拉取所有 ({notImportedCount} 条)
</Button>
```

**改造后：**
```tsx
<Button onClick={handlePreviewAndReview}>
  预览并审核 ({notImportedCount} 条)
</Button>
```

#### B. 单个操作按钮

**改造前：**
```tsx
<Button onClick={() => handleFetchSingle(item)}>
  拉取
</Button>
```

**改造后：**
```tsx
<Button onClick={() => handlePreviewSingle(item)}>
  预览
</Button>
```

#### C. 游戏对话框（特殊处理）

**改造前：**
```tsx
<Button onClick={() => handleFetchGame(uuid)}>
  拉取游戏
</Button>
```

**改造后：**
```tsx
<Button onClick={() => handlePreviewGame(uuid)}>
  预览并审核
</Button>
// + 集成 MissingDependenciesDialog 处理依赖
```

---

## 三、技术实现细节

### 3.1 需要修改的组件清单

#### 组件 1: `FetchCategoriesDialog`
**文件**: `src/components/admin/fetch/fetch-categories-dialog.tsx`

**改造内容：**
1. **删除旧的 API 调用逻辑**
   ```typescript
   // 删除
   const handleFetchAll = async () => {
     await fetch('/api/admin/fetch/categories', {
       method: 'POST',
       body: JSON.stringify({ uuids })
     });
   };
   ```

2. **新增 preview 流程**
   ```typescript
   const handlePreviewAndReview = async () => {
     // 1. 调用 preview API
     const response = await fetch('/api/admin/fetch/categories/preview', {
       method: 'POST',
       body: JSON.stringify({ enableRewrite: true })
     });
     const { items } = await response.json();

     // 2. 过滤出新记录
     const newItems = items.filter(item => item.status === 'new');

     // 3. 打开审核对话框
     setReviewItems(newItems);
     setShowReviewDialog(true);
   };
   ```

3. **新增 confirm 流程**
   ```typescript
   const handleReviewComplete = async (decisions: ReviewDecision[]) => {
     // 调用 confirm API
     const response = await fetch('/api/admin/fetch/categories/confirm', {
       method: 'POST',
       body: JSON.stringify({ items: decisions })
     });
     const result = await response.json();

     // 显示结果
     toast.success(`成功导入 ${result.imported} 条记录`);

     // 刷新列表
     await refetch();
   };
   ```

4. **集成 ContentReviewDialog**
   ```typescript
   {showReviewDialog && (
     <ContentReviewDialog
       items={reviewItems}
       onComplete={handleReviewComplete}
       onCancel={() => setShowReviewDialog(false)}
       entityType="category"
       rewriteEndpoint="/api/admin/fetch/categories/confirm"
     />
   )}
   ```

5. **状态管理扩展**
   ```typescript
   // 新增状态
   const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
   const [showReviewDialog, setShowReviewDialog] = useState(false);
   ```

#### 组件 2: `FetchTagsDialog`
**文件**: `src/components/admin/fetch/fetch-tags-dialog.tsx`

**改造内容：** 同 `FetchCategoriesDialog`，只需替换实体类型和 API 端点

#### 组件 3: `FetchFeaturedDialog`
**文件**: `src/components/admin/fetch/fetch-featured-dialog.tsx`

**改造内容：** 同 `FetchCategoriesDialog`，只需替换实体类型和 API 端点

#### 组件 4: `FetchGamesDialog`（最复杂）
**文件**: `src/components/admin/fetch/fetch-games-dialog.tsx`

**改造内容：**
1. **删除旧的 API 调用逻辑**
2. **新增 preview 流程（含依赖检查）**
   ```typescript
   const handlePreviewGame = async (uuid: string) => {
     const response = await fetch('/api/admin/fetch/games/preview', {
       method: 'POST',
       body: JSON.stringify({ uuid, enableRewrite: true })
     });
     const data = await response.json();

     // 检查是否缺失依赖
     if (!data.success && data.error === 'Missing dependencies') {
       setMissingDeps(data.missingDependencies);
       setShowMissingDepsDialog(true);
       return;
     }

     // 无依赖问题，进入审核
     setReviewItems([data.game]);
     setShowReviewDialog(true);
   };
   ```

3. **集成 MissingDependenciesDialog**
   ```typescript
   {showMissingDepsDialog && (
     <MissingDependenciesDialog
       dependencies={missingDeps}
       onComplete={() => {
         setShowMissingDepsDialog(false);
         // 依赖导入完成，重新预览游戏
         handlePreviewGame(currentGameUuid);
       }}
       onCancel={() => setShowMissingDepsDialog(false)}
     />
   )}
   ```

4. **集成 ContentReviewDialog**（同其他组件）

### 3.2 API 路由状态

#### 保留旧 API（标记为 deprecated）
```typescript
// src/app/api/admin/fetch/categories/route.ts
/**
 * @deprecated 使用 /preview 和 /confirm 端点代替
 * 保留此端点仅用于紧急回滚
 */
export async function POST(request: NextRequest) {
  // ... 旧实现保持不变
}
```

#### 新 API（已完成，无需修改）
- ✅ `/api/admin/fetch/categories/preview`
- ✅ `/api/admin/fetch/categories/confirm`
- ✅ `/api/admin/fetch/tags/preview`
- ✅ `/api/admin/fetch/tags/confirm`
- ✅ `/api/admin/fetch/featured/preview`
- ✅ `/api/admin/fetch/featured/confirm`
- ✅ `/api/admin/fetch/games/preview`
- ✅ `/api/admin/fetch/games/confirm`

---

## 四、实施路线图

### 阶段 1：基础集成（优先级：高）⏱️ 4-6 小时

**任务清单：**
- [ ] 修改 `FetchCategoriesDialog` 组件
  - [ ] 替换"一键拉取所有"为"预览并审核"
  - [ ] 替换单个"拉取"为"预览"
  - [ ] 集成 `ContentReviewDialog`
  - [ ] 实现 preview/confirm API 调用
  - [ ] 添加状态管理（reviewItems, showReviewDialog）

- [ ] 复制改造到其他对话框
  - [ ] 修改 `FetchTagsDialog`
  - [ ] 修改 `FetchFeaturedDialog`
  - [ ] 修改 `FetchGamesDialog`（特殊处理依赖）

- [ ] 旧 API 标记 deprecated
  - [ ] 添加 JSDoc 注释
  - [ ] 保留实现（紧急回滚用）

### 阶段 2：测试验证（优先级：高）⏱️ 2-3 小时

**测试清单：**

**基础功能测试：**
- [ ] 分类：预览并审核（批量）
- [ ] 分类：预览单个
- [ ] 标签：预览并审核（批量）
- [ ] 标签：预览单个
- [ ] 特性合集：预览并审核（批量）
- [ ] 特性合集：预览单个
- [ ] 游戏：预览单个（无缺失依赖）
- [ ] 游戏：预览单个（有缺失依赖）

**审核流程测试：**
- [ ] 选择"使用改写内容"
- [ ] 选择"使用原始内容"（验证等同于旧流程）
- [ ] 选择"跳过此项"
- [ ] 选择"重新改写"
- [ ] 批量审核（逐个决策）

**依赖处理测试（游戏专属）：**
- [ ] 缺失依赖表格显示正确
- [ ] 逐个导入依赖（走 preview/confirm 流程）
- [ ] 所有依赖导入后继续游戏导入
- [ ] 依赖导入失败的处理

**错误处理测试：**
- [ ] LLM 改写失败（降级到原始内容）
- [ ] Preview API 失败
- [ ] Confirm API 失败
- [ ] 网络超时

**性能测试：**
- [ ] 批量改写 10 条数据（观察耗时）
- [ ] 批量改写 50 条数据（压力测试）
- [ ] 并发改写性能（4个并发）

### 阶段 3：优化与文档（优先级：中）⏱️ 2-4 小时

**优化任务：**
- [ ] 改进 Loading 状态显示
  - [ ] 改写进度条（X/N 已完成）
  - [ ] 预计剩余时间
  - [ ] 可取消操作

- [ ] 优化错误提示
  - [ ] 改写失败时的友好提示
  - [ ] API 错误的详细信息
  - [ ] 重试机制

- [ ] 批量操作优化
  - [ ] "全部使用改写"快捷按钮
  - [ ] "全部使用原始"快捷按钮
  - [ ] 批量跳过选项

**文档任务：**
- [ ] 更新 `IMPLEMENTATION-COMPLETE.md`
  - [ ] 记录集成完成情况
  - [ ] 更新使用示例

- [ ] 创建使用说明文档
  - [ ] 新流程操作指南
  - [ ] 截图/录屏演示
  - [ ] 常见问题 FAQ

- [ ] 更新 API 文档
  - [ ] 标记旧 API 为 deprecated
  - [ ] 说明迁移路径

---

## 五、关键代码示例

### 5.1 完整的对话框改造示例（FetchCategoriesDialog）

```typescript
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ContentReviewDialog,
  type ReviewItem,
  type ReviewDecision,
} from '@/components/admin/fetch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function FetchCategoriesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // 状态管理
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 查询远程数据
  const { data: remoteCategories, refetch } = useQuery({
    queryKey: ['remote-categories'],
    queryFn: async () => {
      const response = await fetch('https://parent-site.com/api/categories');
      return response.json();
    },
  });

  // 查询本地数据
  const { data: localCategories } = useQuery({
    queryKey: ['local-categories'],
    queryFn: async () => {
      const response = await fetch('/api/admin/categories');
      return response.json();
    },
  });

  // 计算未导入的数据
  const notImported = remoteCategories?.filter(
    (remote: any) => !localCategories?.some((local: any) => local.uuid === remote.uuid)
  ) || [];

  // 预览并审核（批量）
  const handlePreviewAndReview = async () => {
    setIsLoading(true);
    try {
      // 1. 调用 preview API
      const response = await fetch('/api/admin/fetch/categories/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enableRewrite: true }),
      });

      if (!response.ok) {
        throw new Error('Preview failed');
      }

      const { items, summary } = await response.json();

      // 2. 过滤出新记录
      const newItems = items.filter((item: any) => item.status === 'new');

      if (newItems.length === 0) {
        toast.info('没有需要导入的新分类');
        return;
      }

      // 3. 打开审核对话框
      setReviewItems(newItems);
      setShowReviewDialog(true);

      toast.success(`已加载 ${newItems.length} 条新分类，改写完成 ${summary.rewritten} 条`);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('预览失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 预览单个
  const handlePreviewSingle = async (uuid: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/fetch/categories/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuids: [uuid],
          enableRewrite: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Preview failed');
      }

      const { items } = await response.json();

      setReviewItems(items);
      setShowReviewDialog(true);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('预览失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 审核完成，确认导入
  const handleReviewComplete = async (decisions: ReviewDecision[]) => {
    setShowReviewDialog(false);
    setIsLoading(true);

    try {
      // 调用 confirm API
      const response = await fetch('/api/admin/fetch/categories/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: decisions }),
      });

      if (!response.ok) {
        throw new Error('Confirm failed');
      }

      const result = await response.json();

      // 显示结果
      toast.success(
        `导入完成：成功 ${result.imported} 条，跳过 ${result.skipped} 条`
      );

      // 刷新列表
      await refetch();
    } catch (error) {
      console.error('Confirm error:', error);
      toast.error('导入失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拉取分类数据</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 未导入的数据列表 */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notImported.map((item: any) => (
                  <TableRow key={item.uuid}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.slug}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreviewSingle(item.uuid)}
                        disabled={isLoading}
                      >
                        预览
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* 批量操作按钮 */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                onClick={handlePreviewAndReview}
                disabled={isLoading || notImported.length === 0}
              >
                {isLoading ? '加载中...' : `预览并审核 (${notImported.length} 条)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 审核对话框 */}
      {showReviewDialog && (
        <ContentReviewDialog
          items={reviewItems}
          onComplete={handleReviewComplete}
          onCancel={() => setShowReviewDialog(false)}
          entityType="category"
          rewriteEndpoint="/api/admin/fetch/categories/confirm"
        />
      )}
    </>
  );
}
```

### 5.2 游戏对话框特殊处理（依赖检查）

```typescript
// FetchGamesDialog 中的特殊逻辑
const [missingDeps, setMissingDeps] = useState<MissingDependency[]>([]);
const [showMissingDepsDialog, setShowMissingDepsDialog] = useState(false);

const handlePreviewGame = async (uuid: string) => {
  setIsLoading(true);
  try {
    const response = await fetch('/api/admin/fetch/games/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uuid, enableRewrite: true }),
    });

    const data = await response.json();

    // 检查是否缺失依赖
    if (!data.success && data.error === 'Missing dependencies') {
      setMissingDeps(data.missingDependencies);
      setShowMissingDepsDialog(true);
      setCurrentGameUuid(uuid); // 保存当前游戏 UUID
      return;
    }

    // 无依赖问题，进入审核
    setReviewItems([data.game]);
    setShowReviewDialog(true);
  } catch (error) {
    console.error('Preview error:', error);
    toast.error('预览失败，请重试');
  } finally {
    setIsLoading(false);
  }
};

const handleMissingDepsComplete = () => {
  setShowMissingDepsDialog(false);
  // 依赖导入完成，重新预览游戏
  handlePreviewGame(currentGameUuid);
};

// 在 JSX 中
{showMissingDepsDialog && (
  <MissingDependenciesDialog
    dependencies={missingDeps}
    onComplete={handleMissingDepsComplete}
    onCancel={() => setShowMissingDepsDialog(false)}
  />
)}
```

---

## 六、风险评估与缓解

### 6.1 技术风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| LLM API 限流/失败 | 中 | 高 | 降级到原始内容 + 重试机制 |
| 改写速度慢 | 高 | 中 | 显示进度条 + 并发控制（4个） |
| 大批量审核耗时 | 高 | 中 | 提供快捷批量操作按钮 |
| 状态同步问题 | 低 | 中 | 使用 React Query 缓存 + 错误回滚 |

### 6.2 用户体验风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 操作步骤增加 | 高 | 低 | 提供"全部使用改写"快捷按钮 |
| 学习成本 | 中 | 低 | 内置帮助提示 + 文档说明 |
| 审核疲劳 | 中 | 中 | 支持批量操作 + 分批审核 |

### 6.3 业务风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 改写质量不佳 | 低 | 高 | 人工审核 + 重新改写选项 |
| SEO 效果不理想 | 低 | 中 | A/B 测试 + 数据监控 |
| 成本超支 | 低 | 低 | API 配额监控 + 免费模型（Gemini） |

### 6.4 回滚方案

**如果新流程出现严重问题：**

1. **临时回滚**（10 分钟）
   - 恢复旧按钮
   - 调用旧 API（已保留）
   - 发布 hotfix

2. **数据回滚**（如需要）
   - 使用数据库备份
   - 删除错误导入的记录
   - 重新导入

3. **问题修复**
   - 分析日志定位问题
   - 修复后重新部署
   - 渐进式灰度发布

---

## 七、上线检查清单

### 开发阶段
- [ ] 完成所有组件改造（4个对话框）
- [ ] 集成 ContentReviewDialog
- [ ] 集成 MissingDependenciesDialog
- [ ] 旧 API 标记 deprecated
- [ ] 代码审查通过

### 测试阶段
- [ ] 单元测试覆盖
- [ ] 集成测试通过
- [ ] E2E 测试通过
- [ ] 性能测试通过（批量数据）
- [ ] 错误处理测试
- [ ] 依赖处理测试（游戏）

### 部署阶段
- [ ] 环境变量配置（OPENROUTER_API_KEY）
- [ ] 生产数据库备份
- [ ] 监控告警配置
- [ ] 回滚方案准备
- [ ] 发布时间选择（低峰期）

### 上线后
- [ ] 监控 LLM API 调用量
- [ ] 监控改写成功率
- [ ] 监控用户操作行为
- [ ] 收集用户反馈
- [ ] 性能指标追踪

---

## 八、成功标准

### 技术指标
- ✅ 改写成功率 > 95%
- ✅ 平均改写时间 < 3 秒/条
- ✅ API 响应时间 < 5 秒（含改写）
- ✅ 系统稳定性 > 99.9%

### 业务指标
- ✅ 内容差异化率 > 80%（与母站对比）
- ✅ SEO 指标不下降
- ✅ 管理员满意度 > 4/5 分
- ✅ 导入效率不低于旧流程 50%

### 用户体验指标
- ✅ 操作流畅无卡顿
- ✅ 错误提示清晰友好
- ✅ 学习成本低（< 5 分钟上手）

---

## 九、后续优化方向

### 短期（1-2 周）
1. 增加批量操作快捷按钮
2. 优化 Loading 状态显示
3. 改进错误提示

### 中期（1 个月）
1. 改写历史记录功能
2. 自定义改写参数（temperature、模型选择）
3. 质量评分系统

### 长期（3 个月）
1. AI 辅助审核（自动质量评分）
2. 改写模板系统
3. 批量导入优化（后台任务）

---

## 十、附录

### 10.1 相关文件路径

**前端组件：**
```
src/components/admin/fetch/
├── fetch-dashboard.tsx           # 主入口
├── fetch-categories-dialog.tsx   # 分类对话框（需修改）
├── fetch-tags-dialog.tsx         # 标签对话框（需修改）
├── fetch-featured-dialog.tsx     # 特性合集对话框（需修改）
├── fetch-games-dialog.tsx        # 游戏对话框（需修改）
├── content-review-dialog.tsx     # 审核对话框（已完成）
├── content-panel.tsx             # 内容面板（已完成）
├── missing-dependencies-dialog.tsx # 依赖处理（已完成）
└── index.ts                      # 导出文件
```

**API 路由：**
```
src/app/api/admin/fetch/
├── categories/
│   ├── route.ts          # 旧 API（保留，deprecated）
│   ├── preview/route.ts  # 预览 API（已完成）
│   └── confirm/route.ts  # 确认 API（已完成）
├── tags/
│   ├── route.ts
│   ├── preview/route.ts
│   └── confirm/route.ts
├── featured/
│   ├── route.ts
│   ├── preview/route.ts
│   └── confirm/route.ts
└── games/
    ├── route.ts
    ├── preview/route.ts
    └── confirm/route.ts
```

**核心服务：**
```
src/services/content/
├── rewriter.ts            # 改写服务（已完成）
├── rewrite-prompts.ts     # 提示词构建器（已完成）
├── categories.ts          # 分类服务
├── tags.ts                # 标签服务
├── featured.ts            # 特性合集服务
└── games.ts               # 游戏服务（含依赖检查）
```

### 10.2 API 接口规格总结

#### Preview API（预览与改写）

**请求（批量实体）：**
```json
POST /api/admin/fetch/categories/preview
{
  "uuids": ["uuid-1", "uuid-2"],  // 可选，不传则拉取所有
  "enableRewrite": true
}
```

**请求（游戏）：**
```json
POST /api/admin/fetch/games/preview
{
  "uuid": "game-uuid-123",  // 必需
  "enableRewrite": true
}
```

**响应（成功）：**
```json
{
  "success": true,
  "items": [
    {
      "uuid": "xxx-001",
      "name": "Action Games",
      "slug": "action",
      "status": "new",
      "original": {
        "metadataTitle": "...",
        "metadataDescription": "...",
        "content": "..."
      },
      "rewritten": {
        "metadataTitle": "...",
        "metadataDescription": "...",
        "content": "..."
      }
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

**响应（缺失依赖，仅游戏）：**
```json
{
  "success": false,
  "error": "Missing dependencies",
  "missingDependencies": [
    {
      "type": "category",
      "uuid": "cat-uuid-001",
      "name": "Action",
      "status": "missing"
    }
  ]
}
```

#### Confirm API（确认导入）

**请求（批量实体）：**
```json
POST /api/admin/fetch/categories/confirm
{
  "items": [
    {
      "uuid": "xxx-001",
      "action": "use_rewritten",
      "selectedContent": {
        "metadataTitle": "...",
        "metadataDescription": "...",
        "content": "..."
      }
    },
    {
      "uuid": "xxx-002",
      "action": "use_original",
      "selectedContent": { ... }
    },
    {
      "uuid": "xxx-003",
      "action": "skip"
    },
    {
      "uuid": "xxx-004",
      "action": "rewrite",
      "rewriteOptions": {
        "temperature": 0.7
      }
    }
  ]
}
```

**请求（游戏）：**
```json
POST /api/admin/fetch/games/confirm
{
  "uuid": "game-uuid-123",
  "action": "use_rewritten",
  "contentDecision": {
    "original": { ... },
    "rewritten": { ... }
  }
}
```

**响应（重新改写）：**
```json
{
  "success": true,
  "rewrittenItems": [
    {
      "uuid": "xxx-004",
      "rewritten": {
        "metadataTitle": "...",
        "metadataDescription": "...",
        "content": "..."
      }
    }
  ],
  "needsConfirmation": true
}
```

**响应（最终导入）：**
```json
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

---

**文档版本：** 1.0
**创建日期：** 2025-01-15
**最后更新：** 2025-01-15
**作者：** Claude AI Assistant
**状态：** 待执行
