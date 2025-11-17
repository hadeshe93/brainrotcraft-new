# 快速开始

## 一键运行

### 测试模式（推荐首次使用）

```bash
cd tools/spider/geometrylite.io
pnpm test
```

预计耗时：1-2 分钟，爬取 64 个游戏

### 完整模式

```bash
cd tools/spider/geometrylite.io
pnpm start
```

预计耗时：10-15 分钟，爬取所有 544+ 个游戏

## 输出结果

CSV 文件保存位置：

- 测试模式：`output/games-test.csv`
- 完整模式：`output/games.csv`

## 查看结果

```bash
# 查看前 10 行
head -10 output/games-test.csv

# 统计游戏数量
wc -l output/games-test.csv

# 查看特定列（标题和游戏链接）
cut -d',' -f1,3 output/games-test.csv | head -20
```

## 示例输出

```csv
Title,Page URL,Game URL,Cover Image,Rating
Candy Jump,https://geometrylite.io/candy-jump,https://candyjump.games235.com/,/cache/data/image/game/candy-jump-m300x180.webp,10
Geometry Jump Sketchy,https://geometrylite.io/geometry-jump-sketchy,https://turbowarp.org/846820413/embed,/cache/data/image/geometry-jump-sketchy-2-m300x180.webp,10
Drift Boss,https://geometrylite.io/drift-boss,https://www.cdn.drift-boss.com/driftboss/index.html,/cache/data/image/drift-boss-m300x180.webp,10
```

## 自定义配置

编辑 `src/index.ts` 或 `src/test.ts`：

```typescript
const config: SpiderConfig = {
  startPage: 1, // 起始页码
  endPage: 17, // 结束页码
  delayMs: 1000, // 请求延迟（毫秒）
  concurrency: 5, // 并发数
};
```

## 常用命令

```bash
# 安装依赖
pnpm install

# 测试运行（2 页）
pnpm test

# 完整运行（17 页）
pnpm start

# 构建 TypeScript
pnpm build

# 查看项目结构
tree -L 2 -I node_modules
```

## 故障排查

### 网络错误

```bash
# 增加延迟，降低并发
delayMs: 2000,
concurrency: 3,
```

### 依赖问题

```bash
# 重新安装依赖
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 权限问题

```bash
# 确保输出目录可写
chmod 755 output/
```

## 进阶使用

查看详细文档：

- [README.md](./README.md) - 项目概述
- [USAGE.md](./USAGE.md) - 详细使用指南
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 架构设计

## 性能建议

| 场景     | 并发数 | 延迟   | 预计耗时 |
| -------- | ------ | ------ | -------- |
| 快速测试 | 10     | 500ms  | 较快     |
| 标准运行 | 5      | 1000ms | 中等     |
| 保守运行 | 3      | 2000ms | 较慢     |

## 支持

如遇问题，请检查：

1. Node.js 版本 >= 18
2. 网络连接正常
3. 依赖安装完整
4. 查看错误日志
