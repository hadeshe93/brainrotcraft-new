# 游戏聚合站

## 本地启动流程

- 删掉 wrangler 文件夹和 drizzle 文件夹
- 执行 `pnpm drizzle:generate` 来生成 sql 文件
- 执行 sql 文件 `pnpm d1:apply`
- 导入分类 `pnpm tsx tools/batch-import/import-categories.ts`
- 导入标签 `pnpm tsx tools/batch-import/import-tags.ts`
- 导入特性合集（Featured Collections）`pnpm tsx tools/batch-import/import-featured.ts`
- 导入游戏 `pnpm tsx tools/batch-import/import-games.ts`

## 初次部署上线

- 在 Cloudflare D1 中手动创建数据库 `<数据库名>`
- 将 CF 上的 `<数据库名>` 和 `<数据库 ID>` 填充回 wrangler.jsonc 中
- 在 wrangler.jsonc 中修改 `NEXTAUTH_URL` 的环境变量值
- 执行 sql 文件 `pnpm d1:apply:remote`
- 在 .env.local 中启用环境变量 `IMPORT_API_ORIGIN`

### 子站使用

如果你的项目是作为子站，那么请走接口从母站里面拉取数据来使用：

- 在谷歌登录后台，GamesRamp 或者其他母站的登录系统里面，加入当前项目的域名，用来登录 CMS
- 访问 Data Fetch 模块


### 母站使用

如果你的项目是作为母站，而且原数据无需改写，那么就执行以下脚本：

- 导入分类 `pnpm tsx tools/batch-import/import-categories.ts`
- 导入标签 `pnpm tsx tools/batch-import/import-tags.ts`
- 导入特性合集（Featured Collections）`pnpm tsx tools/batch-import/import-featured.ts`
- 导入游戏 `pnpm tsx tools/batch-import/import-games.ts`