# 使用说明书

## 重写游戏文案

核心文件
- 脚本文件： @tools/rewrite/geometrylite.io/rewrite-games.ts
- 提示文件： @docs/standard/prompt/code.md

步骤：
- 检查「脚本文件」里面的 `csvFiles` 值，之前处理过的就不要处理了，手动改一下范围
- 检查 `main(defaultOptions)` 中的入参，确保传入的是重写相关的枚举值
- 运行 `npx tsx tools/rewrite/geometrylite.io/rewrite-games.ts` —— 至此就生成了重写内容后的数据
- 然后 @tools/rewrite/geometrylite.io/output/ 下会逐渐生成相关的 csv 文件
- 在「提示文件」中找到 `游戏自动化打标操作`，复制内容给 CC 运行，记得改下目标文件 —— 至此就给游戏重新打上了标
- 最后将「脚本文件」里面的 `defaultOptions` 再改成格式化 CSV 成 JSON 文件的枚举值，再运行 —— 至此就准备好了生产环境可用的游戏 JSON 数据