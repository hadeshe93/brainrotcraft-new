# 外链分析工作流

这是一套外链分析工作流，借助于 Sermrush 的外链导出工具，拿到多个网站的外链表格进行交叉分析，得到共同的外链列表，提高运营效率。

## 流程

- 先上 Semrush，随便分析一个域名的外链列表，然后点击导出（不需要设置过滤条件了），去看接口的 Cookie，并复制下来替换到 @tools-backlink/download/index.ts 中（如果原 Cookie 没有过期就没必要替换了）；
- 准备好一批目标参考网站的域名，最好的方式就是通过 query.domains 将所有群友站域名全部收集起来；
- 将域名放进 @tools-backlink/download/index.ts 中，然后终端执行 `npx tsx tools-backlink/download/index.ts`，就能下载到各自域名的外链 csv 表格文件，并保存到 tools-backlink/download/output/ 目录中；
- 然后检查 @tools-backlink/analyze/index.ts 中的目标分析目录路径是否正确
- 最后运行 `npx tsx tools-backlink/analyze/index.ts` 即可