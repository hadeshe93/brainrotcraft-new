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