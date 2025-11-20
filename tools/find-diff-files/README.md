# Find Diff Files

查找指定目录下存在 Git 改动的文件列表。

## 功能

- 查找指定目录下所有 Git 改动的文件（包括修改、新增、删除、重命名等）
- 支持核心函数独立调用
- 输出相对路径列表

## 使用方式

### 方式 1: 使用 pnpm 快捷命令（推荐）

```bash
pnpm find-diff-files
```

### 方式 2: 直接运行脚本

```bash
pnpm tsx tools/find-diff-files/index.ts
```

### 在代码中使用核心函数

```typescript
import { findChangedFiles } from './tools/find-diff-files';

// 查找 src 目录下的改动文件
const srcFiles = findChangedFiles('src');
console.log(srcFiles);

// 查找其他目录
const componentFiles = findChangedFiles('src/components');
console.log(componentFiles);
```

## API

### `findChangedFiles(targetPath: string): string[]`

核心函数，查找指定目录下存在 Git 改动的文件。

**参数：**
- `targetPath`: 目标目录的相对路径（相对于项目根目录），例如 `'src'` 或 `'src/components'`

**返回：**
- `string[]`: 改动文件的相对路径数组

**示例：**

```typescript
const files = findChangedFiles('src');
// 返回: ['src/app/[locale]/page.tsx', 'src/components/ui/pagination-links.tsx', ...]
```

### `main()`

应用层函数，查找 `src` 目录下的改动文件并输出到控制台。

## Git 状态说明

脚本会识别以下 Git 状态的文件：
- **M** - 修改的文件 (Modified)
- **A** - 新增的文件 (Added)
- **D** - 删除的文件 (Deleted)
- **R** - 重命名的文件 (Renamed)
- **??** - 未跟踪的文件 (Untracked)

对于重命名的文件，会使用新的文件路径。
