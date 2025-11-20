# SimilarWeb Scraper

使用 Playwright 自动化抓取 SimilarWeb 网站数据的工具。

## 功能特点

- ✅ 自动处理 SimilarWeb 的 202 → 验证 → 200 流程
- ✅ 可视化浏览器窗口（可观察自动化过程）
- ✅ 自动处理 Cookie 注入（无需手动配置）
- ✅ 详细的请求/响应日志记录
- ✅ 保存完整的 HTML 页面内容
- ✅ TypeScript 类型支持

## 目录结构

```
tools-sm/
├── config.ts          # 配置文件（域名列表、超时设置等）
├── index.ts           # 核心爬虫实现
├── example.ts         # 使用示例
├── output/            # 输出目录（自动创建）
└── README.md          # 本文档
```

## 安装依赖

本项目依赖已在根目录的 `package.json` 中配置，无需额外安装。

需要的依赖：
- `playwright` (^1.56.1)
- `typescript` (^5)
- `tsx` (^4.20.3)

## 配置

编辑 `config.ts` 文件：

```typescript
export const TARGET_DOMAINS = [
  'example.com',
  'github.com',
  // 添加更多域名...
];

export const CONFIG = {
  timeout: 90000,              // 页面加载超时（毫秒）
  stabilizationDelay: 5000,    // 页面稳定等待时间（毫秒）
  slowMo: 50,                  // 自动化减速（毫秒，便于观察）
  headless: false,             // 是否显示浏览器窗口
  viewport: {
    width: 1920,
    height: 1080,
  },
};
```

## 使用方法

### 方法 1: 直接运行（使用 config.ts 中的第一个域名）

```bash
npx tsx tools-sm/index.ts
```

### 方法 2: 运行示例（多个示例）

```bash
npx tsx tools-sm/example.ts
```

### 方法 3: 作为模块导入

```typescript
import { scrapeSimilarWeb } from './tools-sm/index';

async function main() {
  // 抓取单个域名
  const result = await scrapeSimilarWeb('example.com');

  if (result.success) {
    console.log('抓取成功！', result.domain);
  } else {
    console.error('抓取失败:', result.error);
  }
}

main();
```

## 工作原理

### SimilarWeb 的验证流程

1. **首次访问** - 返回 HTTP 202 状态码，包含验证脚本
2. **验证阶段** - 浏览器自动执行验证脚本，发送多个验证请求
3. **Cookie 注入** - 验证通过后，SimilarWeb 自动注入认证 Cookie
4. **最终加载** - 页面使用新 Cookie 重新加载，返回 HTTP 200 和完整内容

### 本工具的处理方式

- 使用 `waitUntil: 'networkidle'` 等待网络活动停止
- 90 秒超时以适应验证流程
- 详细的请求/响应日志帮助调试
- 额外等待 5 秒确保页面完全稳定
- 保存最终的完整 HTML 内容

## 输出

成功抓取后，HTML 文件会保存到 `tools-sm/output/` 目录：

```
tools-sm/output/
├── example_com_similarweb.html
├── github_com_similarweb.html
└── ...
```

文件命名格式：`{域名}_similarweb.html`

## 日志说明

运行时会显示详细的日志：

```
🚀 Navigating to SimilarWeb...
→ [REQUEST #1] GET https://www.similarweb.com/website/example.com/
← [RESPONSE #1] [202] https://www.similarweb.com/website/example.com/
   ⚠️  Received 202 - Verification flow starting...
→ [REQUEST #2] POST https://verify.example.com/challenge
← [RESPONSE #2] [200] https://verify.example.com/challenge
← [RESPONSE #15] [200] https://www.similarweb.com/website/example.com/
   ✅ Received 200 - Verification completed!

🍪 Cookies received: 12 cookies
   Cookie names: session_id, verification_token, ...

📄 Extracting page content...
   Page title: example.com Competitive Analysis, Marketing Mix and Traffic
   HTML size: 245.67 KB

✅ Success: example.com -> example_com_similarweb.html
```

## 故障排除

### 问题：验证超时

**解决方案：**
- 增加 `config.ts` 中的 `timeout` 值（例如 120000）
- 增加 `stabilizationDelay` 值（例如 10000）

### 问题：获取到的是验证页面

**解决方案：**
- 确保网络连接稳定
- 尝试增加等待时间
- 检查 SimilarWeb 是否有新的反爬虫机制

### 问题：浏览器无法启动

**解决方案：**
```bash
# 安装 Playwright 浏览器
npx playwright install chromium
```

## 技术细节

### 基于 tools-backlink 的设计

本工具参考了 `tools-backlink/download/index.ts` 的架构：

- 清晰的功能分离（工具函数、核心逻辑、公共 API）
- TypeScript 类型安全
- 完善的错误处理
- 结构化的日志输出

### 关键差异

与 `tools-backlink` 的主要区别：

| 特性 | tools-backlink | tools-sm |
|------|---------------|----------|
| 目标网站 | 3ue.com | SimilarWeb |
| Cookie | 手动配置 | 自动注入 |
| 数据格式 | CSV 下载流 | HTML 内容 |
| 处理流程 | 下载事件 | 网络空闲 |
| 批量处理 | 支持串行/并行 | 单个域名 |

## 注意事项

1. **浏览器窗口** - 默认显示浏览器窗口以便观察流程（可在 config.ts 中修改）
2. **请求频率** - 避免频繁请求导致 IP 被限制
3. **数据使用** - 请遵守 SimilarWeb 的服务条款
4. **验证时间** - 首次验证可能需要 30-60 秒

## 相关文档

- [Playwright 文档](https://playwright.dev/)
- [tools-backlink 参考实现](../tools-backlink/download/)

## License

MIT
