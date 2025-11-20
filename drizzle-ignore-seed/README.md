# 说明

本文件夹下面放置非根据 @src/db/schema + `pnpm drizzle:generate` 自动产出的种子 sql 文件，必要时执行命令如下。

## 开发环境

```bash
# 清空表数据 - 如果需要
pnpm wrangler d1 execute brainrotcraft --local --file=drizzle-ignore-seed/clear-site-config.sql

# 导入
pnpm wrangler d1 execute brainrotcraft --local --file=drizzle-ignore-seed/seed-site-config.sql

# 验证数据
pnpm wrangler d1 execute brainrotcraft --local --command="SELECT * FROM site_config;"
```

## 开发环境

```bash
# 导入
pnpm wrangler d1 execute brainrotcraft --remote --file=drizzle-ignore-seed/seed-site-config.sql

# 验证数据
pnpm wrangler d1 execute brainrotcraft --remote --command="SELECT * FROM site_config;"
```