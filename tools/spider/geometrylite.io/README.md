# Geometry Lite Spider

这是一个用于爬取 geometrylite.io 网站游戏数据和下载封面图的工具。

## 功能特性

1. **游戏数据爬取**: 从 geometrylite.io 爬取游戏信息并保存为 CSV 文件
2. **封面图下载**: 并发下载游戏封面图到本地

## 安装依赖

```bash
pnpm install
```

## 使用方法

### 1. 爬取游戏数据

```bash
pnpm start
# 或
pnpm start scrape
```

这将：

- 爬取游戏列表和详情
- 将数据保存到 `output/games.csv` 文件

### 2. 下载封面图

```bash
pnpm start download-covers
```

这将：

- 从 `output/games-*.csv` 文件中读取所有封面图 URL
- 并发下载封面图到 `output/covers/` 目录
- 实时显示下载进度
- 自动重试失败的下载（最多重试 1 次）
- 将失败的下载记录保存到 `output/download-cover-results.json`

## 配置说明

### 爬虫配置 (src/index.ts)

```typescript
const config: SpiderConfig = {
  baseUrl: 'https://geometrylite.io',
  apiUrl: 'https://geometrylite.io/game-new.ajax',
  startPage: 1,
  endPage: 17,
  pageSize: 32,
  delayMs: 1000, // 请求延迟（毫秒）
  concurrency: 5, // 并发请求数
};
```

### 下载器配置 (src/index.ts)

```typescript
const downloader = new CoverDownloader(
  coversDir,
  10, // 并发下载数
  1, // 重试次数
);
```

## 项目结构

```
geometrylite.io/
├── src/
│   ├── index.ts              # 主入口文件
│   ├── spider.ts             # 爬虫核心逻辑
│   ├── cover-downloader.ts   # 封面图下载器
│   ├── http-client.ts        # HTTP 客户端
│   ├── game-list-parser.ts   # 游戏列表解析器
│   ├── game-detail-parser.ts # 游戏详情解析器
│   └── csv-exporter.ts       # CSV 导出器
├── output/
│   ├── games-*.csv           # 游戏数据 CSV 文件
│   ├── covers/               # 下载的封面图目录
│   └── download-cover-results.json  # 下载失败记录
└── package.json
```

## 输出文件

### CSV 文件格式

CSV 文件包含以下字段：

- `Title`: 游戏标题
- `Page URL`: 游戏页面 URL
- `Game URL`: 游戏播放 URL
- `Cover Image`: 封面图 URL
- `Rating`: 游戏评分
- `Content Path`: 内容文件路径

### 下载失败记录格式

如果有下载失败的情况，会生成 `download-cover-results.json` 文件：

```json
[
  {
    "url": "https://example.com/image.webp",
    "statusCode": 404,
    "error": "HTTP 404: Not Found"
  }
]
```

## 批量上传图片文件到 R2

根据 Cloudflare R2 Docs 的如下文档指引，实现使用 `rclone` 工具快速批量上传几百个文件到 R2 Bucket。

### rclone 安装

参考官网的脚本安装方式，最快最省事：https://rclone.org/install/#script-installation

### rclone 配置

- 完全参考 CF 的配置文档指引来： https://developers.cloudflare.com/r2/examples/rclone/#configure-rclone
- 鉴权和 Endpoint 具体配置内容在 CF R2 概述首页的右下角： https://dash.cloudflare.com/7fd0cf2117971feb0a4b9e67358d5ef4/r2/overview

### 批量上传

要将 @tools/spider/geometrylite.io/output/covers/ 下的 500 多份图片文件批量上传到 `union-biz` 这个 Bucket 下的 `gamesramp/cover/` 目录下：

```
$ rclone copy tools/spider/geometrylite.io/output/covers r2:union-biz/gamesramp/covers/
```

一条命令搞定，耗时大概在 2~3 分钟。

## 技术栈

- **TypeScript**: 类型安全的 JavaScript
- **cheerio**: HTML 解析
- **csv-parse**: CSV 文件解析
- **csv-writer**: CSV 文件写入
- **p-limit**: 并发控制
- **turndown**: HTML 转 Markdown

## 开发

### 编译

```bash
pnpm build
```

### 运行测试

```bash
pnpm test
```

## 注意事项

1. 下载封面图时，并发数设置为 10，避免对服务器造成过大压力
2. 下载失败会自动重试 1 次
3. 所有下载进度会实时显示在控制台
4. 封面图文件名与 URL 中的文件名保持一致
5. 下载任务会自动去重，相同的 URL 只会下载一次

## 许可证

ISC
