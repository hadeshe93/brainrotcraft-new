# 使用指南

## 快速开始

### 1. 测试运行（推荐）

测试模式只爬取前 2 页（约 64 个游戏），快速验证功能：

```bash
pnpm test
```

输出文件：`output/games-test.csv`

### 2. 完整运行

爬取所有 17 页（约 544 个游戏）：

```bash
pnpm start
```

输出文件：`output/games.csv`

预计耗时：约 10-15 分钟（取决于网络速度和并发设置）

## 自定义配置

编辑 `src/index.ts` 或 `src/test.ts` 中的配置：

```typescript
const config: SpiderConfig = {
  baseUrl: 'https://geometrylite.io',
  apiUrl: 'https://geometrylite.io/game-new.ajax',

  // 页码范围
  startPage: 1, // 起始页
  endPage: 17, // 结束页（测试用 2，完整用 17）

  pageSize: 32, // 每页游戏数（固定）

  // 性能配置
  delayMs: 1000, // 每批请求之间的延迟（毫秒）
  concurrency: 5, // 并发请求数（建议 3-10）
};
```

### 配置说明

- **delayMs**: 增加延迟可以减轻服务器压力，但会增加总耗时
- **concurrency**: 并发数越高速度越快，但可能被服务器限流。建议值：
  - 测试：3-5
  - 生产：5-10

## 输出格式

CSV 文件包含以下字段：

| 字段        | 说明                 | 示例                                            |
| ----------- | -------------------- | ----------------------------------------------- |
| Title       | 游戏标题             | Candy Jump                                      |
| Page URL    | 游戏详情页链接       | https://geometrylite.io/candy-jump              |
| Game URL    | 实际游戏 iframe 链接 | https://candyjump.games235.com/                 |
| Cover Image | 游戏封面图片         | /cache/data/image/game/candy-jump-m300x180.webp |
| Rating      | 游戏评分             | 10                                              |

### CSV 示例

```csv
Title,Page URL,Game URL,Cover Image,Rating
Candy Jump,https://geometrylite.io/candy-jump,https://candyjump.games235.com/,/cache/data/image/game/candy-jump-m300x180.webp,10
Slope,https://geometrylite.io/slope,https://slopegame.io/,/cache/data/image/game/slope-game-m300x180.webp,8.5
```

## 常见问题

### 1. 遇到 429 错误（Too Many Requests）

降低并发数或增加延迟：

```typescript
concurrency: 3,    // 降低并发
delayMs: 2000,     // 增加延迟到 2 秒
```

### 2. 某些游戏的 Game URL 为空

这是正常现象，部分游戏页面可能：

- 结构不同
- 动态加载失败
- 页面维护中

### 3. 想只爬取特定页码范围

修改 `startPage` 和 `endPage`：

```typescript
startPage: 5,      // 从第 5 页开始
endPage: 10,       // 到第 10 页结束
```

## 进阶使用

### 自定义解析器

如果网站结构发生变化，可以自定义解析器：

```typescript
import { IParser, GameBasicInfo } from './types';

class MyCustomParser implements IParser<GameBasicInfo[]> {
  parse(html: string, baseUrl?: string): GameBasicInfo[] {
    // 自定义解析逻辑
  }
}

// 替换默认解析器
const spider = new Spider(
  config,
  httpClient,
  new MyCustomParser(), // 使用自定义解析器
  detailParser,
  exporter,
);
```

### 自定义导出格式

实现 `IExporter` 接口可以导出为其他格式（JSON、数据库等）：

```typescript
import { IExporter, GameFullInfo } from './types';

class JsonExporter implements IExporter<GameFullInfo> {
  async export(data: GameFullInfo[], filePath: string): Promise<void> {
    // 导出为 JSON
    const json = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(filePath, json, 'utf8');
  }
}
```

## 性能优化建议

1. **首次运行使用测试模式**，确保配置正确
2. **根据网络情况调整并发数**，避免超时
3. **定期运行**，保持数据最新
4. **处理失败的游戏**，可以记录失败的 URL 后重试

## 注意事项

⚠️ **请遵守以下原则**：

1. 合理设置延迟，不要对目标网站造成过大压力
2. 建议在非高峰时段运行
3. 遵守网站的 robots.txt 和使用条款
4. 数据仅供学习研究使用

## 技术支持

如有问题，请检查：

1. 网络连接是否正常
2. 依赖包是否正确安装
3. Node.js 版本是否符合要求
4. 查看控制台错误信息
