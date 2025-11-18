# 实现导出

请你帮我在 @tools/batch-export/ 目录下实现游戏信息的导出脚本，具体要求如下。ultrathink

要求：
1. 参考 @docs/biz/project/export-data/demo/*.json，一共 4 份文件，脚本导出来也需要这 4 份文件，需要按照这些文件中的字段以及含义来做：
  - `game-categories.json` 游戏分类数据；
  - `game-tags.json` 游戏标签数据；
  - `game-featured.json` 游戏特色合集数据；
  - `games.json` 游戏列表数据；
2. 先梳理 @src/app/api/ 下是否有 api 能够实现需求，如果没有那么新建一个 `export` 文件夹来承载对应的导出逻辑；
3. 先不要写代码，优先查看已有代码，梳理实现路径和方案，然后沉淀为一份浓缩精炼但不遗漏任何细节的文档，保存到 @docs/biz/project/export-data/ 目录下。

---

## 补充下载游戏的介绍文档

抱歉我在制定需求文档时遗漏了一点：针对游戏详情进行导出为 `games.json` 时，需要将其 `introductions` 表中的 `content` 内容也导出来，并且 json 文档中的 `contentPath` 字段值需要能匹配上其下载位置。请你完善这部分逻辑。ultrathink

---

## 完善逻辑

导出 `games.json` 时，其中的 `contentPath` 值是用游戏的 `slug` 值拼接而成的对吧？这样对于 `slug` 为 `''` 的游戏来说，其文件命名就有问题，所以你大可以不实用 `slug`，而是将游戏名字符串转成 kebab case 就好。ultrathink