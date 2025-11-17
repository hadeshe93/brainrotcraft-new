# 项目内部的相关提示词

## 调研业务 - Background Remover

请你帮我针对 "remove background" 关键词做一份调研分析报告。

需要包含：
1. 目前市场上还存在哪些机会？
2. 找出 10 个目标核心关键词，并根据自然搜索量由高到低排序
3. 根据最匹配的核心关键词，找出相关的衍生关键词、长尾关键词
4. 根据相关的关键词，完成可落地的站点 SEO 计划。

## 调研业务 - Bulk Background Remover

我现在想在本站点基础上新增「Bulk Background Remover」子页面来承接批量移除图片背景的功能，请你提前帮我针对关键词「Bulk Background Remover」做一份市场调研分析报告，保存到 @docs/biz/query/bulk-background-remover/ 下。ultrathink

需要包含：
1. 目前市场上还存在哪些机会？
2. 找出 10 个目标核心关键词，并根据自然搜索量由高到低排序
3. 根据最匹配的核心关键词，找出相关的衍生关键词、长尾关键词
4. 根据相关的关键词，完成可落地的站点 SEO 计划。

参考：
- 本站开发前调研： @docs/biz/query/background-remover/
- 本站项目首页文案：@src/i18n/pages/en/index.ts、@src/i18n/pages/en/content.md 和 @src/i18n/pages/en/brief-content.md

---

我现在想在我的站点（https://freebackgroundremover.net/）基础上新增「Bulk Background Remover」子页面来承接批量移除图片背景的功能，请你提前帮我针对关键词「Bulk Background Remover」做一份市场调研分析报告，保存到 @docs/biz/query/bulk-background-remover/ 下。ultrathink

需要包含：
1. 目前市场上还存在哪些机会？
2. 找出 10 个目标核心关键词，并根据自然搜索量由高到低排序
3. 根据最匹配的核心关键词，找出相关的衍生关键词、长尾关键词
4. 根据相关的关键词，完成可落地的站点 SEO 计划。

## 生成文案 - Bulk Background Remover

刚才你已经针对「Bulk Background Remover」完成了市场分析调研报告，现在请你为该关键词的「主页面」书写生产环境级别的站点文案，并存放到 @docs/biz/copywriting/bulk-background-remover/ 中。ultrathink

要求：
- 本次我优先开发主页面，所以请仅聚焦在主页面上
- 按照市场分析调研报告文档以及我的批量工具特性进行书写，用 Markdwon 格式
- 文案需要包含如下结构（如果你有其他补充也可以）：
  - 总结性特点 + 总结性介绍
  - 本工具是什么？
  - 本工具怎么使用？
  - 为什么选择本工具？（如果涉及到友商，看看是否考虑使用表格呈现？）
  - 常见问题（问题题目使用 H3 标题）
  - 元标题、元描述（要求符合 SEO 最佳实践，具有吸引力）
- 请你先列 TODO，然后逐项工作进行，如果不能在一次会话中完美完成，那么要提示我压缩本次对话，为你释放上下文窗口

批量移除图片背景工具的特性：
- 无登录情况下每次批量处理上限是 12 张，登录之后每次批量处理上限是 20 张，暂时均无日限制和月限制；
- 短期内计划上线单次付费和订阅计划，届时免费计划下会更新限制情况；
- 我使用的是 Cloudflare Image Transform 的能力，这个不要透漏到文案中，仅提供给你作为参考，你可以提炼其特点，比如每分钟能处理图片的数量，或者其优点等等。

参考：
- 「Bulk Background Remover」市场分析调研报告： @docs/biz/query/bulk-background-remover/

## 根据业务微调隐私政策和服务条款

请你帮我微调一下隐私政策 @src/i18n/pages/en/privacy/content.md 和服务条款 @src/i18n/pages/en/terms/content.md 中关于网站功能的部分，其他应该都能适用，你可以顺便检查一下。 ultrathink

参考：
- 本站项目首页文案：@src/i18n/pages/en/index.ts 以及 @src/i18n/pages/en/content.md
- 调研报告：@docs/biz/query

---

## 讨论定价

请你参考如下资料，然后帮我针对 Bulk Background Remover 思考并制定定价策略，最终保存到 @docs/biz/query/pricing/ 目录下。ultrathink

说明：
- 我应该是想要采用单次付费模式，如果你对按月、年订阅模式也有好建议的话，可以一并提出
- 我自己的思考是：虽然目前针对匿名用户和登录用户的批量操作的策略是免费、不限量，但是每次有最多图片张数限制，前者是 12 张，后者是 20 张，这类用户定位应该是偶尔使用的，似乎没有太强的付费需求，我设想是针对需要大批量操作的用户进行收费，比如一次性批量 50 张、100 张之类的，但是我还是没有能够将这些闭环思考出来，需要你帮忙
- 要从几方面来思考：针对免费用户应该如何限制？针对付费用户应该设置怎样的阶梯收费模式？

参考：
- 调研分析报告： @docs/biz/query/bulk-background-remover/
- 页面文案：@src/i18n/pages/en/bulk/

---

## 生成站点 LOGO 图

请你生成一张平面 LOGO，主体是一张带有白色边框的 Polaroid 照片，照片不需要填充具体的物体，只需要填充泛黄的颜色，并勾勒一层阴影。LOGO 之外的地方均是透明背景。

---

## 生成站点介绍文案

请你根据如下文档，帮我打造关于本站点项目的英语介绍文案，并保存到 @docs/biz/promote/introduction.md 目录下。ultrathink

需要包含：
1. Pitch Line：一句话介绍，不超过 80 字符；
2. Short Description：简短介绍，不超过 160 字符；
3. Detailed Description：详细介绍，不超过 600 字符；
4. Ultra Detailed Description：超长篇幅介绍，不超过 1000 字符。

要求：
1. 不要使用 "-" 连字符来连接上下句子；
2. 不要使用 emoji；
3. 不要使用 “不是...而是” 的 AI 固定句式。

参考：
- 本站项目首页文案：@src/i18n/pages/en/index.ts、 @src/i18n/pages/en/content.md 和 @src/i18n/pages/en/brief-content.md
- 站点开发前的调研：@docs/biz/query/

---

## 生成站点社媒宣传文案

请你根据如下文档，帮我写一份在不同社媒平台上发布的推文。先抛出小疑问，制造问题或者悬疑，然后提出我们的站点。ultrathink

参考：
- 本站项目首页文案：@src/i18n/pages/en/index.ts
- 本站首页文案架构设计： @docs/biz/report/homepage-architecture.md
- 本站核心关键词调研报告： @docs/biz/report/homepage-kw-research.md

## 生成介绍文案

请你为我们站点项目的「About」页面编写一份 Markdown 格式的文案，主要用来介绍我们站点的功能、核心价值以及未来展望，最后保存到 @docs/ 下。ultrathink

参考：
- 本站开发前调研： @docs/biz/query
- 本站项目首页文案：@src/i18n/pages/en/index.ts、@src/i18n/pages/en/content.md 和 @src/i18n/pages/en/brief-content.md


## 全站翻译

你是一位多语言专家，请你帮我将指定的英语文案文件全部翻译成地道的葡萄牙语言，并存放到指定的目录下。ultrathink

包括：
- 源文件夹 @src/i18n/pages/en 下的所有英语文案文件，翻译到 @src/i18n/pages/pt
- 源文件夹 @src/i18n/messages/en 下的所有英语文案文件，翻译到 @src/i18n/messages/pt

要求：
1. 源文件夹下的文件包括子文件夹下的所有文件，请递归查找；
2. 先找到所有源文件；
3. 然后对逐份文件进行以下流程：（1）通读、理解含义和内容主旨；（2）进行翻译，以此提高翻译准确率；（3）翻译后进行检查校验，如果有问题则优化完善，确保语法准确，内容匹配、完整且无遗漏；
4. 对一份文件执行完流程之后，再轮到下一份文件；请你自动提示自己对下一份文件执行相同流程，直至完成，不要让我来提示你进行下一步；
5. 每完成一份文件，输出一下目前的总体进度，直至结束。

## 单文件翻译

你是一位多语言专家，请你帮我将中文文档 @mii-creator/content.md 翻译成地道的美式英语，并放到 @mii-creator/content-en.md 中。ultrathink

要求：
1. 先通读全文，理解含义和内容主旨；
2. 然后才进行翻译，以此提高翻译准确率；
3. 一步步进行，翻译完成后对语法和内容含义进行检查和校对。