# 批量下载 Backlinks 工具

此工具用于批量下载域名的 backlinks 数据，并保存为 CSV 文件。

## 功能特性

- 支持从 URL 或纯域名字符串中自动提取域名
- 支持串行下载（默认）和并行下载两种模式
- 自动创建 output 文件夹保存下载的文件
- 提供详细的下载进度和结果统计
- 错误处理和失败重试信息

## 使用方法

### 1. 直接使用函数

```typescript
import { downloadBacklinks } from './index';

// 准备要下载的 URL 或域名列表
const urls = [
  'https://backgroundremover.com',
  'example.com',
  'www.google.com',
];

// 串行下载（默认）
const result = await downloadBacklinks(urls);
console.log(result);
// 输出: { success: 2, failed: 1, total: 3 }

// 并行下载
const result2 = await downloadBacklinks(urls, true);
```

### 2. 运行示例文件

```bash
# 方式 1: 直接运行 index.ts 的测试
npx tsx tools-download-backlinks/index.ts

# 方式 2: 运行 example.ts
npx tsx tools-download-backlinks/example.ts
```

## API 文档

### `downloadBacklinks(urls, parallel?)`

批量下载域名的 backlinks 数据。

**参数:**
- `urls: string[]` - URL 或域名字符串数组
  - 支持完整 URL: `https://example.com/path`
  - 支持带 www: `www.example.com`
  - 支持纯域名: `example.com`
- `parallel: boolean` (可选) - 是否并行下载，默认 `false`

**返回值:**
```typescript
{
  success: number;  // 成功下载数量
  failed: number;   // 失败数量
  total: number;    // 总数量
}
```

## 输出文件

下载的文件保存在 `./output` 文件夹中，文件命名规则：

```
<域名>_backlinks.csv
```

例如：
- `backgroundremover_com_backlinks.csv`
- `example_com_backlinks.csv`

## 注意事项

1. 串行下载更稳定，适合大批量下载
2. 并行下载速度更快，但可能受到服务器限流
3. 文件会自动覆盖同名的旧文件
4. 确保网络连接正常
5. API Key 已内置在请求中，如需更新请修改 `buildRequestUrl` 函数

## 示例输出

```
开始批量下载，模式: 串行
输出目录: /path/to/output
总共 3 个域名

开始下载: backgroundremover.com
✓ 下载成功: backgroundremover.com -> backgroundremover_com_backlinks.csv
开始下载: example.com
✓ 下载成功: example.com -> example_com_backlinks.csv
开始下载: google.com
✗ 下载失败: google.com - HTTP 403: Forbidden

下载完成:
  成功: 2
  失败: 1
  总数: 3

失败的域名:
  - google.com: HTTP 403: Forbidden
```
