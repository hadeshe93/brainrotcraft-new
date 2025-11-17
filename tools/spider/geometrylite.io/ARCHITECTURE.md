# 架构设计文档

## 概述

本项目严格遵循 SOLID 原则设计，采用依赖注入和接口抽象，实现了高内聚、低耦合的架构。

## SOLID 原则应用

### 1. 单一职责原则 (Single Responsibility Principle)

每个类只负责一个明确的功能：

```
HttpClient           → 负责 HTTP 请求
GameListParser       → 负责解析游戏列表 HTML
GameDetailParser     → 负责解析游戏详情页面
CsvExporter          → 负责导出 CSV 文件
Spider               → 协调所有模块（编排）
```

#### 示例：HttpClient

```typescript
// ✅ 好的设计：只负责 HTTP 请求
class HttpClient implements IHttpClient {
  async fetch(url: string, config?: RequestConfig): Promise<string> {
    // 仅处理 HTTP 请求逻辑
  }
}

// ❌ 不好的设计：混合多种职责
class HttpClient {
  async fetch(url: string): Promise<string> {}
  parseHtml(html: string): GameInfo[] {} // 违反 SRP
  exportToCsv(data: GameInfo[]): void {} // 违反 SRP
}
```

### 2. 开闭原则 (Open/Closed Principle)

通过接口定义，系统对扩展开放，对修改关闭。

#### 扩展新的解析器（无需修改现有代码）

```typescript
// 原有解析器
class GameListParser implements IParser<GameBasicInfo[]> {
  parse(html: string, baseUrl?: string): GameBasicInfo[] {}
}

// ✅ 扩展：添加新的 JSON 解析器（不修改原代码）
class JsonGameParser implements IParser<GameBasicInfo[]> {
  parse(json: string, baseUrl?: string): GameBasicInfo[] {
    const data = JSON.parse(json);
    // JSON 解析逻辑
  }
}

// 使用时替换即可
const spider = new Spider(
  config,
  httpClient,
  new JsonGameParser(), // 替换解析器
  detailParser,
  exporter,
);
```

#### 扩展新的导出器

```typescript
// ✅ 扩展：添加 JSON 导出器
class JsonExporter implements IExporter<GameFullInfo> {
  async export(data: GameFullInfo[], filePath: string): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(filePath, json, 'utf8');
  }
}

// ✅ 扩展：添加数据库导出器
class DatabaseExporter implements IExporter<GameFullInfo> {
  async export(data: GameFullInfo[], _: string): Promise<void> {
    await database.insert('games', data);
  }
}
```

### 3. 里氏替换原则 (Liskov Substitution Principle)

所有实现 `IParser` 的解析器可以相互替换，不影响程序的正确性。

```typescript
// 所有解析器都可以替换使用
const parsers: IParser<GameBasicInfo[]>[] = [new GameListParser(), new JsonGameParser(), new XmlGameParser()];

// 任何一个都可以传递给 Spider
parsers.forEach((parser) => {
  const spider = new Spider(config, httpClient, parser, detailParser, exporter);
  // 程序正常工作
});
```

### 4. 接口隔离原则 (Interface Segregation Principle)

定义了细粒度的接口，客户端不依赖不需要的接口。

```typescript
// ✅ 好的设计：细粒度接口
interface IHttpClient {
  fetch(url: string, config?: RequestConfig): Promise<string>;
}

interface IParser<T> {
  parse(html: string, baseUrl?: string): T;
}

interface IExporter<T> {
  export(data: T[], filePath: string): Promise<void>;
}

// ❌ 不好的设计：臃肿接口
interface ISpiderService {
  fetch(url: string): Promise<string>;
  parseList(html: string): GameBasicInfo[];
  parseDetail(html: string): string;
  exportCsv(data: GameFullInfo[]): void;
  exportJson(data: GameFullInfo[]): void;
  exportDatabase(data: GameFullInfo[]): void;
}
```

### 5. 依赖倒置原则 (Dependency Inversion Principle)

高层模块（Spider）不依赖低层模块的具体实现，而是依赖抽象接口。

```typescript
// ✅ 好的设计：依赖抽象接口
class Spider {
  constructor(
    config: SpiderConfig,
    private httpClient: IHttpClient, // 依赖接口
    private listParser: IParser<GameBasicInfo[]>,
    private detailParser: IParser<string>,
    private exporter: IExporter<GameFullInfo>,
  ) {}
}

// ❌ 不好的设计：依赖具体实现
class Spider {
  constructor(
    config: SpiderConfig,
    private httpClient: HttpClient, // 依赖具体类
    private listParser: GameListParser,
    private detailParser: GameDetailParser,
    private exporter: CsvExporter,
  ) {}
}
```

## 架构图

```
┌─────────────────────────────────────────────────────────┐
│                        Spider                           │
│                    (协调器/编排者)                        │
│                                                         │
│  依赖注入所有模块，协调爬虫流程：                          │
│  1. 爬取游戏列表                                          │
│  2. 爬取游戏详情                                          │
│  3. 导出数据                                             │
└───────────────┬──────────────┬──────────────┬───────────┘
                │              │              │
                ▼              ▼              ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │ IHttpClient  │  │   IParser<T> │  │ IExporter<T> │
     │  (接口)      │  │   (接口)     │  │   (接口)     │
     └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
            │                 │                  │
            ▼                 ▼                  ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │ HttpClient   │  │ ListParser   │  │ CsvExporter  │
     │              │  │ DetailParser │  │              │
     └──────────────┘  └──────────────┘  └──────────────┘
```

## 依赖注入示例

```typescript
// index.ts - 主入口
function main() {
  // 1. 创建配置
  const config: SpiderConfig = { ... };

  // 2. 创建所有依赖（可以替换为任何实现）
  const httpClient = new HttpClient();
  const listParser = new GameListParser();
  const detailParser = new GameDetailParser();
  const exporter = new CsvExporter();

  // 3. 依赖注入：创建 Spider
  const spider = new Spider(
    config,
    httpClient,    // 可替换为 MockHttpClient
    listParser,    // 可替换为 JsonGameParser
    detailParser,  // 可替换为其他解析器
    exporter       // 可替换为 JsonExporter
  );

  // 4. 运行
  await spider.run(outputPath);
}
```

## 模块职责详解

### HttpClient

**职责**: 封装所有 HTTP 请求逻辑

**特性**:

- 统一的请求头管理
- 超时控制
- 错误处理
- 请求延迟

```typescript
class HttpClient implements IHttpClient {
  async fetch(url: string, config?: RequestConfig): Promise<string>;
  async delay(ms: number): Promise<void>;
}
```

### GameListParser

**职责**: 解析游戏列表 HTML，提取游戏基本信息

**输入**: HTML 字符串
**输出**: `GameBasicInfo[]`

```typescript
interface GameBasicInfo {
  url: string; // 游戏详情链接
  title: string; // 游戏标题
  coverImage: string; // 封面图
  rating: string; // 评分
}
```

### GameDetailParser

**职责**: 解析游戏详情页，提取实际游戏链接

**输入**: HTML 字符串
**输出**: `string` (游戏 iframe URL)

**解析策略**:

1. 优先从 `#show-embed` 的 `data-iframe` 属性获取
2. 备用方案：从 `#game-area` iframe 的 `src` 属性获取

### CsvExporter

**职责**: 将游戏数据导出为 CSV 文件

**特性**:

- 自动创建输出目录
- UTF-8 编码
- 标准 CSV 格式

### Spider

**职责**: 协调所有模块，编排爬虫流程

**核心流程**:

```typescript
async run(outputPath: string): Promise<void> {
  // 1. 爬取所有游戏列表
  const games = await this.fetchAllGameLists();

  // 2. 爬取每个游戏的详情
  const gamesWithDetails = await this.fetchGameDetails(games);

  // 3. 导出到 CSV
  await this.exporter.export(gamesWithDetails, outputPath);
}
```

## 优势

### 1. 可测试性

每个模块可以独立测试：

```typescript
// 测试 HttpClient
test('HttpClient should fetch HTML', async () => {
  const client = new HttpClient();
  const html = await client.fetch('https://example.com');
  expect(html).toContain('<html>');
});

// 测试 Parser（无需实际 HTTP 请求）
test('GameListParser should parse games', () => {
  const parser = new GameListParser();
  const mockHtml = '<li class="games__item">...</li>';
  const games = parser.parse(mockHtml);
  expect(games).toHaveLength(1);
});
```

### 2. 可维护性

- 职责清晰，修改某个模块不影响其他模块
- 接口定义明确，容易理解

### 3. 可扩展性

- 添加新功能无需修改现有代码
- 可以轻松替换任何模块的实现

### 4. 可重用性

- 每个模块都可以在其他项目中重用
- 例如 `HttpClient` 可用于任何爬虫项目

## 总结

本项目通过严格遵循 SOLID 原则，实现了：

✅ **高内聚**：每个模块职责单一、功能完整
✅ **低耦合**：模块间通过接口通信，依赖倒置
✅ **易扩展**：添加新功能无需修改现有代码
✅ **易测试**：每个模块可以独立测试
✅ **易维护**：职责清晰，代码可读性高

这是一个教科书级别的 SOLID 原则应用示例。
