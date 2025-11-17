# 开发

## 审阅方案

我即将要开发一个在线游戏聚合站，让用户可以无限制地畅玩 H5 游戏。请你仔细阅读 @plan.md 文档中的内容，帮我逐个审阅，并提出你的思考和建议，保存到 docs/biz/project/audit/ 目录下。ultrathink

要求：

- 每一个部分都要审阅，然后结合目前市场现状，你可以搜索互联网，再进行分析

---

## 再次审阅方案

我之前让你帮我审阅了新游戏聚合站的初版方案 @docs/standard/prompt/dev-plan/v1.0.md，你已经给出来了详细的审核意见 @docs/biz/project/audit/。
现在我已经优化整改完毕了，请详见 @docs/standard/prompt/dev-plan/v1.1.md，并请你再次审核，并将结果保存到 @docs/biz/project/audit/v1.1/ 下。ultrathink

## 准备开发

希望你记得我们刚才完成的审阅任务，现在请你根据审阅报告，规划好第一阶段 MVP 要实现的 TODO，并在 @docs/biz/project/development/ 目录下建立文件来进行备忘沉淀和进度跟踪。ultrathink

说明：

- 由于我们本项目是通过 `@opennextjs/cloudflare` 来部署到 Cloudflare Worker 上的 Next.js v15 App Router 项目，所以需要通过 @src/services/base/index.ts 中的 `getCloudflareEnv` 函数来获得 Worker 内的 `env` 变量；

参考：

- 刚才的审阅报告：@docs/biz/project/audit/

---

## 开发前提醒

正式开发前再提醒说明下：

- 开发过程中，优先考虑使用社区提供的优秀方案，而不是自己去造轮子；比如在 UI 中，尽量优先使用 Shadcn UI 或者 Magic UI 库提供的组件；在服务端层面，优先使用成熟的 npm 包方案，核心是选择性价比更高的，满足当前需求即可，包体积尽量小；
- 谨记服务端 Cloudflare Worker 中的一些限制；
- 遇到框架或者库的问题，就用 context7 mcp 去查最新文档，但是当然要和目前安装的版本匹配了；

你可以先把这些记录到合适的文档，然后输出一段让你自己启动开发的提示语给我，因为我后面要压缩对话。

---

## 开发阶段修正类型声明错误

在开始 Phase 2 之前，我检查了一下你刚才实现的文件，发现基本上都有一些小的类型错误，请你先 fix 吧。

---

## 补充代码开发规范

对了，代码开发的相关规范都在 @.cursor/rules/ 目录下，请你也补充到 @docs/standard/prompt/implementation-guide.md 文档中的合适位置吧，顺便在文档里面更新一下目前进度，以及了解一下接下来的剩余任务。

---

## 修正管理端表单

发现一个重大问题：在 @src/app/[locale]/admin/categories/page.tsx 和 @src/app/[locale]/admin/tags/page.tsx 中，表单的字段和提交到 API Route 对应的字段对应不上，需要重新逐个场景检查并修复。 ultrathink

---

## 待办事项

- [x] 初步开发完所有页面
- [x] 本地爬取所有游戏数据
- [x] 本地构造所有游戏分类和标签
- [x] 本地工具侧接入 Gemini API 来重写游戏介绍、元标题和元描述（自动化新增改写后的 csv 和内容） - 进行中 1/11
- [x] 本地工具批量下载游戏封面图并汇总文件
- [ ] 将分类和标签的 MD 文档转化成 JSON 文件，并补充 Meta 信息
- [ ] 新增批量导入 api（先导入分类、标签，最后导入游戏）

---

## 开发游戏爬虫脚本

"""
请你帮我在 @tools/spider/geometrylite.io/ 目录下开发针对 `geometrylite.io` 游戏聚合站的爬虫，具体要求如下，请你遵循 SOLID 原则去实现。ultrathink

\#\# 爬虫函数逻辑描述

先爬取游戏列表和信息，最后汇总成一份 csv 文件保存到 @tools/spider/geometrylite.io/output/ 文件夹，目前需要两个功能函数，描述如下。

\#\# 爬取该站点所有游戏的功能函数

使用以下请求 DEMO，`page` 参数从 `1` 增加到 `17`，其他参数保持不变。接口响应会返回 `text/html` 字符串，请使用 `cheerio` 这个轻量的 npm 包去解析，我需要每一款游戏的详情链接、标题、封面图、评分。具体每个数据是包裹在什么元素中就交给你去发现了，回包数据我扒下来放到 @docs/standard/prompt/siper/all-games-api-response.md 文件中了。

```js
fetch('https://geometrylite.io/game-new.ajax?page=1&limit=32', {
  headers: {
    accept: '*/*',
    'accept-language': 'en-US,en;q=0.9',
    priority: 'u=1, i',
    'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'x-requested-with': 'XMLHttpRequest',
    cookie:
      'gmuid=player_fc6e9306ceb70406; _ga_98SJMCEF0K=GS2.1.s1761826873$o1$g0$t1761826878$j55$l0$h1477172019; PHPSESSID=kphav148g4s846neht0oj3v0ij; _gid=GA1.2.1656682387.1762159042; _clck=16n5bh4%5E2%5Eg0p%5E0%5E2129; _ga=GA1.2.1123266288.1761825404; __gads=ID=4be7fa047417f8ce:T=1761826155:RT=1762159200:S=ALNI_Magh3Bot_BUJU07cS-QatHubUhK6g; __gpi=UID=000012f4ccfdfd64:T=1761826155:RT=1762159200:S=ALNI_MYYr3mOnjjBADXgEVRn1bmWOKQwxw; __eoi=ID=82b6b78ee0951cf2:T=1761826155:RT=1762159200:S=AA-Afjb06VYoCF2fZWxAQvtNp7Tw; FCCDCF=%5Bnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2C%5B%5B32%2C%22%5B%5C%22a84bc5ef-1a15-49a6-8707-b2baefbdd60a%5C%22%2C%5B1761825407%2C699000000%5D%5D%22%5D%5D%5D; _clsk=aj5xqn%5E1762159201330%5E5%5E1%5Ey.clarity.ms%2Fcollect; FCNEC=%5B%5B%22AKsRol9xd1AJYSw1lnJBPf949ZguaGrnV7Drycpmcxtc2CNgh4f3NvelPNeFONKjqZux1hIBy_QCCg_Su8AYSfXE3KKNKVVHt56ixIPOUcsSvAMQWOphvy9zmaPPg2rJ0pMF5kTTkYatqqpnzOAy7x9gUXbhqr2rjw%3D%3D%22%5D%5D; _ga_924VEG2GDG=GS2.1.s1762159040$o11$g1$t1762159344$j60$l0$h0',
    Referer: 'https://geometrylite.io/all-games',
  },
  body: null,
  method: 'GET',
});
```

\#\# 爬取具体游戏信息的功能函数

具体游戏页面的链接 demo 为：`https://geometrylite.io/candy-jump`。请你用函数实现对应的爬虫，将 HTML 爬取下来之后，使用 `cheerio` 这个 npm 包去解析，找到 `id="game-area"` 的 iframe，拿到对应的实际游戏链接。

"""

### 继续优化 - 1

提两个优化点，请继续实现。ultrathink

1. 目前爬取的封面图 url 基本上是绝对路径，请你检查到符合这个特征的，在爬虫函数中补上对应的 Origin `https://geometrylite.io` 来构成完整的 url；
2. 爬取具体游戏信息时，我还需要其介绍文案，请你在爬虫逻辑中将 `class="article--content game-content-page"` 对应的 HTML 内容使用 `turndown` 这个 npm 包，反向解析成 Markdown 文案，然后逐个保存到 `@tools/spider/geometrylite.io/output/content/` 目录下，每个游戏的文案存一份文件，然后将文件的相对路径，填写到汇总的 csv 中去，保持 csv 的清爽。

### 继续优化 - 2

提一个优化点，请继续实现。ultrathink

1. 我看目前是爬取所有游戏信息之后，再一并写入 csv 文件里面，如果游戏量太大的话，会增加内存风险，请你优化成满 100 条数据就写一份 csv 文件，然后文件名按带序号的规范命名。你觉得如何？

---

## 生成游戏分类列表

我用爬虫爬取了一个线上的游戏聚合站（具体参考以下信息），请你参考爬取结果，帮我在 @docs/biz/project/dev-meta/ 目录下以 Markdwon 的形式生成游戏聚合站一般都会具有的分类列表。ultrathink

参考爬取结果：

- 游戏元信息：@tools/spider/geometrylite.io/output/game-\*.csv，其中具体介绍列会引用下面的 markdown 文档；
- 游戏具体介绍：@tools/spider/geometrylite.io/output/content/\*.md；

输出文档具体形式：

```markdwon
# 游戏聚合站分类列表建议

## <分类名称 1>

<分类 1 的详细内容介绍（用于 SEO 与玩家了解）>

## <分类名称 2>

<分类 2 的详细内容介绍（用于 SEO 与玩家了解）>

...
```

要求：

1. 在开始之前请先和我讨论一下你对该方案的可行性想法；
2. 我确认完全没问题之后，你再开始生成。

---

## 生成游戏标签列表

我用爬虫爬取了一个线上的游戏聚合站（具体参考以下信息），请你参考爬取结果，帮我在 @docs/biz/project/dev-meta/ 目录下以 Markdwon 的形式生成游戏聚合站一般都会具有的标签列表。ultrathink

参考爬取结果：

- 游戏元信息：@tools/spider/geometrylite.io/output/game-\*.csv，其中具体介绍列会引用下面的 markdown 文档；
- 游戏具体介绍：@tools/spider/geometrylite.io/output/content/\*.md；

输出文档具体形式：

```markdwon
# 游戏聚合站标签列表建议

## <标签名称 1>

<标签 1 的详细内容介绍（用于 SEO 与玩家了解）>

## <标签名称 2>

<标签 2 的详细内容介绍（用于 SEO 与玩家了解）>

...
```

要求：

1. 在开始之前请先和我讨论一下你对该方案的可行性想法；
2. 我确认完全没问题之后，你再开始生成。

---

## 工具侧接入 AI SDK 来利用 LLM 能力打造自动化

请你在 @tools/ai/ 下实现接入谷歌大模型的能力，并以异步函数的方式对外暴露，我后面需要在自动化脚本工具中接入该函数。ultrathink

说明：

1. 我目前仅需要 Chat 能力；

---

## 本地工具侧接入 Gemini API 来重写游戏介绍、元标题和元描述

请你使用 @tools/ai/ 来重写游戏介绍、元标题和元描述，详细要求如下。ultrathink

逻辑：

1. 使用 @tools/ai/ 提供的函数，指定 `gemini-2.5-pro` 模型；
2. 逐份读取 @tools/spider/geometrylite.io/output/games-\*.csv 文件，针对每一款游戏，根据其名称和在 @tools/spider/geometrylite.io/output/content/ 中对应的内容文案，让 Gemini 对游戏进行深度调研，包括内容、基本和高级玩法、控制操作、用户常见疑问，最终重新汇总到新的 csv 文件中，以及将详细内容按游戏粒度创建对应文件；
3. 比如读取的是 `@tools/spider/geometrylite.io/output/games-001.csv` 文件，那么最终输出的文件就保存为 `@tools/rewrite/geometrylite.io/output/games-001.csv`，后者将会比前者多两列数据，分别为 `MetaTitle` 和 `MetaDescription`；另外，由于内容详情会被重新调研和分析之后改写，每个游戏的内容文件也要存放到 `@tools/rewrite/geometrylite.io/output/content/` 目录下，并且更新新 csv 文件中的 `Content Path` 列；

要求：

1. 最终诉求是在 @tools/rewrite/geometrylite.io/ 目录下按以上实现自动化脚本；
2. 测试 Case 中，仅需要针对其中一份 csv 文件中的 5 个游戏进行即可；
3. 但是在开始实现之前，请你评估本方案的可行性，以及你还有什么问题？
4. **当我们将方案定下来，我审核之后，才能开始写代码**。

---

针对待确认问题清单进行明确：

1. 使用英文；
2. 重写后的内容请参考下面的「内容框架模板」；
3. 不需要；
4. MetaTitle 长度限制在 50-60 字符之间，MetaDescription 长度限制在 150-160 字符之间；如果长度有盈余，那么可以包含品牌名称，否则可以不包含，优先级不高；
5. 可以的
6. 允许
7. 重试 1 次，仍失败后记录并跳过，继续往下处理。

针对你的疑问：

1. 我更希望从用户玩家的角度所希望看到的内容风格触发，具体的 Prompt 你帮我思考；
2. 需要；
3. 重写后的内容不需要与原文结构对齐，而是参考下面的「内容框架模板」；
4. 不需要，英语即可。

内容框架模板：

```markdown
<Short Description>

## What is <Game Name>?

<Content>

## How to Play <Game Name>?

<Content>

## What Makes <Game Name> Special?

<Content>

## Frequently Asked Questions

### <Quesion 1>

<Answer>

### <Quesion 2>

<Answer>

...
```

备注：

1. 请你确认以上的回答，并思考是否还有待确认项；
2. 如果没有其他待确认事项，请你输出一份实现方案，并保存到 @docs/biz/project/dev-rewrite/implementation-guide.md 文件中；
3. 我确认最终方案文件内容没有问题之后，再让你开始开发。

---

1. 选项 A，让它自己去搜，另外更正下，用 `gemini-2.5-pro` 模型；
2. 可以
3. 按你的建议
4. 可以
5. 按你的建议
6. 按你的建议
7. 按你的建议

---

我仔细地审核了文档内容，非常完善！不过我再增加一点需求：因为我看逻辑是将生成好的 JSON 数据来生成新的 csv 文件，那可以将这份 JSON 数据也用文件的方式保留下来，和 CSV 同级目录，命名方式一样，后缀为 `.json` 即可。请你据此更新文档。

---

我审核了，有个小问题需要修正下：JSON 数据结构中不要包含完整的 `content`，这样会大大地增加 JSON 文件体积，读取时候有爆内存风险，有目前的 `contentPath` 足够了，需要的时候再去读对应内容文件即可。请据此更新文档。

---

鉴于刚才的测试结果，我提几个优化需求点，请思考并实现。ultrathink

需求点：

1. 由于我们有了进程保存文件，所以拥有了断点恢复功能，但是我希望在运行脚本的时候，让用户简单选择是「恢复断点运行」还是「重新开始」；
2. 由于免费计划下的 Google AI API 的 `gemini-pro-2.5` 模型有每分钟 2 次的限制，那就新增一个 OpenRouter 提供商，详情请参考 https://ai-sdk.dev/providers/community-providers/openrouter，指定使用 Google 的 `gemini-pro-2.5` 模型；并且原来的函数封装也不要删掉，在 @tools/ai/google-chat.ts 中新增一个 OpenRouter 方式的请求函数，然后通过在 @tools/ai/config.ts 中新增一个配置项来指定大模型提供商，定义一个 ts 枚举类型来用就好。

---

再提几个需求点（如下），请认真思考并实现。ultrathink

需求点：

1. @tools/rewrite/geometrylite.io/rewrite-games.ts 的断点设计是针对每一份 csv 文件都有一个进度 json 文件，我觉得这大可不必，因为生产模式下运行时，肯定是从头开始串行处理每份 csv 的，进度 json 文件应该只有一份，补充记录目前处理到哪一份 csv 文件；而且其命名方式也得更新；
2. @tools/rewrite/geometrylite.io/rewrite-games.ts 的 CLI 交互式运行时，应该再增加一个选项，让用户选择是测试模式还是生产模式，测试模式仅测试前 5 个游戏，生产模式是全量运行；现在我看逻辑貌似仅处理一份文件。

---

在 @tools/rewrite/geometrylite.io/rewrite-games.ts 中，去掉交互式环节，改用传入参数到 `main` 函数的方式，入参类型为 `MainOptions`。ultrathink

---

我在 @tools/rewrite/geometrylite.io/rewrite-games.ts 中的 L311 中补充了一个枚举，用于重试 Progress 中记录的失败游戏列表，请你在合适的地方补充该逻辑。ultrathink

逻辑描述：

1. 如果是 `Retry` 的场景下，脚本工具需要读取进度 JSON 文件中的 `failedGames` 列表，并定位到指定的 csv 文件，找到对应的行，然后进行重试；
2. 重试成功之后则要更新回进度 JSON 文件。

---

目前发现 @tools/rewrite/geometrylite.io/lib/validator.ts 中，对 `metaTitle` 和 `metaDescription` 的字数校验逻辑有点严格，会导致超过几个字符就失败，导致 AI API 的调用成本上升。所以可否在 @tools/rewrite/geometrylite.io/config.ts 的 `CONFIG` 中新增两个配置，用于稍稍放宽对这两个字数的校验范围，比如说 `deltaRange` 为 `5`。ultrathink

---

## CSV 转 JSON 工具

我在 @tools/rewrite/geometrylite.io/rewrite-games.ts 中的 L426 处补充了一个枚举 `ReformatCsv2Json` ，用于将 @tools/rewrite/geometrylite.io/output/games-\*.csv 文件，在保留原文件的前提下，格式化输出为新的 json 文件。请你在合适的地方补充该逻辑。ultrathink

逻辑描述：

1. 如果是 `ReformatCsv2Json` 的场景下，脚本工具需要并发读取 @tools/rewrite/geometrylite.io/output/games-\*.csv 文件，并按以下列名与字段名对应的关系，将 csv 数据转换成 JSON 数据，并保存为对应的文件，例如 `games-001.csv` 的数据就转换为 `games-001.json` 文件，如果目标文件已存在，那么全量覆盖即可；
2. 期间需要对 `Cover Image` 列数据做转换再存到 JSON 文件，例如原本是 `https://geometrylite.io/cache/data/image/game/mr-flip/mr-flip-m300x180.webp`，那么取其文件名，然后和 `https://enqxmjd3.gamesramp.com/gamesramp/covers/` 进行拼接，最后就应该是 `https://enqxmjd3.gamesramp.com/gamesramp/covers/mr-flip-m300x180.webp`；
3. 期间需要对 `Categories` 和 `Tags` 列数据做转换再存到 JSON 文件，规则是按英文 `,` 分割成数组，并 `trim()` 掉每个元素字符串两边的空格。

CSV 列名与 JSON 字段名对应关系：

```js
{
  Title: 'title',
  'Page URL': 'pageUrl',
  'Game URL': 'gameUrl',
  'Cover Image': 'coverImage',
  Rating: 'rating',
  'Content Path': 'contentPath',
  'Meta Title': 'metaTitle',
  'Meta Description': 'metaDescription',
  Categories: 'categories',
  Tags: 'tags',
}
```

---

## 游戏自动化打标操作（执行中 - 11/11）

请你根据如下「游戏分类数据」和「游戏标签数据」给如下「目标文件」中的游戏进行打标操作。ultrathink

目标文件：
1. @tools/rewrite/geometrylite.io/output/games-011.csv

要求：
1. 每个游戏应该有大于或等于 1 个的分类，以及大于或等于 1 个的标签；
2. 在 csv 文件中新增两个列（`Categories` 和 `Tags`），并将各游戏的分类和标签数据补充到对应的列中去，值之间用英文符号 "," 进行分隔；
3. 每次仅针对 1 份 csv 文件进行，完成后让我审核，我审核通过之后，你再继续下一份文件；
4. 如果你所处理的 csv 文件中，某些游戏已经有了对应的分类和标签，那就可以跳过；
5. 你可以先生成所有对应的分类和标签，最后写一个脚本来加入到 csv 中，应该可以节省一些上下文窗口。

数据：
- 游戏分类数据：@docs/biz/project/dev-meta/game-categories.md
- 游戏标签数据：@docs/biz/project/dev-meta/game-tags.md

---

## 游戏自动化拉取缩略图操作（已实现）

> 流程：拉图 -> 上传 R2 -> 拼凑 Public Url -> 替换 JSON 数据

请你在 @tools/spider/geometrylite.io/src/index.ts 中补充实现另外一个主入口函数，用于实现并发下载游戏的封面图文件。ultrathink

逻辑描述：

1. 并发读取 @tools/spider/geometrylite.io/games-\*.csv 文件，然后收集每行的 `Cover Image` 链接地址；并发数无限制；
2. 并发下载收集到的封面图文件到 @tools/spider/geometrylite.io/output/covers/ 目录下；并发数为 10；
3. 控制台实时显示进度情况；
4. 遇到下载失败的进行重试，重试次数为 1，依旧失败的进行记录到文件 @tools/spider/geometrylite.io/output/download-cover-results.json；包括响应状态码，失败原因和封面图地址。

---

## 将分类和标签的 MD 文档转化成 JSON 文件

### 先补充 Meta 信息

请你为如下的游戏分类数据和标签数据补充上对应的 Meta Title 和 Meta Description。ultrathink

文档：

- 游戏分类数据：@docs/biz/project/dev-meta/game-categories.md；
- 游戏标签数据：@docs/biz/project/dev-meta/game-tags.md；

要求：

- 为每一个分类和标签构思 Meta Title 和 Meta Description，需要具备（1）吸引力，（2）包含核心关键词且SEO 友好，（3）Meta Title 的字符数应该在 50-60 之间，（4）Meta Description 的字符数应该在 140-160 之间；
- 将原本的 Markdown 内容结构改成如下格式。

新内容结构格式：

```md
## <分类名> 或 <标签名>

### Content

<原内容>

### Meta Title

<元标题>

### Meta Descrption

<元描述>
```

### 再 MD 转 JSON 文件

请你在 @tools/rewrite/cate-and-tag/ 目录下帮我实现一个工具脚本，将下面列出的游戏分类数据和游戏标签数据格式化成 JSON 文件。ultrathink

要求：

1. 先分析数据文件内的 Markdwon 结构，和 JSON 文件字段建立对应关系；
2. 规划实现方案，并沉淀到 @docs/biz/project/dev-meta/ 目录下。

---

## 开发批量操作 API

一路走来，我们开发了一些自动化脚本工具，目前产出了一些「游戏分类数据」、「游戏标签数据」、「游戏详情数据」，现在我需要你在 @src/app/api/admin/ 下开发批量导入的 API 接口，方便将这些数据导入到数据库中。ultrathink

目前有如下数据待导入：

- 游戏分类数据：@docs/biz/project/dev-meta/game-categories.md，对应于游戏分类表；
- 游戏标签数据：@docs/biz/project/dev-meta/game-tags.md，对应于游戏标签表；
- 游戏详情数据：@tools/rewrite/geometrylite.io/output/games-\*.json，对应于游戏详情表；

要求：

1. 先查看 @src/app/api/admin/ 下是否已经有满足需求的批量导入 API，如果有则跳过，没有则准备补充；
2. 在正式开始写代码之前，先统计、规划，然后输出文档到 @docs/biz/project/dev-batch-api/implementation-guide.md 中，供我审核，我审核通过之后，才能开始写代码。

### 更新分类和标签数据文件

我做了一个脚本工具将分类数据和标签数据的 Markdown 文档格式化成 JSON 文档了，对应关系如下，请你根据最细你的 JSON 文档来更新下实现方案，我里面补充了每个分类或标签的 `slug`、元标题和元描述，提供的数据更加全面了。ultrathink

更新关系

- 游戏分类数据：
  - 原来：@docs/biz/project/dev-meta/game-categories.md
  - 最新：@docs/biz/project/dev-meta/game-categories.json
- 游戏标签数据：@docs/biz/project/dev-meta/game-tags.md
  - 原来：@docs/biz/project/dev-meta/game-tags.md
  - 最新：@docs/biz/project/dev-meta/game-tags.json

---

## 扒取唐亦安网站

请你以 https://www.roblox.com/charts?device=computer&country=all 为入口，递归深入查找，查看是否有且有哪些游戏是和下面的正则表达式域名是可以匹配上的？deep think

```md
<!-- 2025年4月份注册 -->

b\w+x\.com

<!-- 2025年6月份注册 -->

h\w+x\.com

<!-- 2025年8月份注册 -->

t\w+l\.com

<!-- 2025年9月份注册 -->

p\w+s\.com

<!-- 2025年10月份注册 -->

p\w+k\.live
```

```json
[
  {
    "created_at": "2025-04",
    "indistinct_domain_regx": "b\w+?x\.com",
    "category": "游戏资讯站"
  },
  {
    "created_at": "2025-05",
    "indistinct_domain_regx": "m\w+?s\.com",
    "category": "游戏站"
  },
  {
    "created_at": "2025-06",
    "indistinct_domain_regx": "h\w+?x\.com",
    "category": "游戏资讯站"
  },
  {
    "created_at": "2025-08",
    "indistinct_domain_regx": "t\w+?l\.com",
    "category": "游戏资讯站"
  },
  {
    "created_at": "2025-09",
    "indistinct_domain_regx": "p\w+?s\.com",
    "category": "游戏资讯站"
  },
  {
    "created_at": "2025-09",
    "indistinct_domain_regx": "p\w+?k.live",
    "category": "游戏资讯站"
  }
]
```

---

## 优化前端页面

### 举报按钮功能

在 @src/app/[locale]/game/[slug]/page.tsx 中，L67-L69 不应该传入事件绑定函数，会导致服务端渲染报错，所以我注释掉了。请你直接在 `<GameActions />` 组件里面的 Report 按钮的点击回调中去唤起对话框就好。 ultrathink

### 游戏行动按钮

在 @src/app/[locale]/game/[slug]/page.tsx 中，我看到 L58-L66 将 `<GameActions />` 组件放到 `<GameEmbed />` 组件下方了。合理的做法应该是要放到 `<GameEmbed />` 里面，和 Fullscreen button 在同一行，在它后面。ultrathink

### 游戏具体分类下的游戏数量

在 @src/services/content/list.ts 中，L242 的 `gameCount` 是准确的吗？可是我现在游戏数据表里面应该只有 50 款游戏，上线了的只有一款哦。ultrathink

### 优化 Featured 页面

如下几个页面的 SEO 数据都是写死的，请你优化成真正地从 DB 表里面取，不要偷工减料。ultrathink

页面：

- @src/app/[locale]/games/page.tsx
- @src/app/[locale]/hot/page.tsx
- @src/app/[locale]/new/page.tsx

### 优化侧边栏

为什么侧边栏 @src/components/blocks/sidebar-container/index.tsx 还是会随着页面一起滚动？ultrathink

### 优化侧边栏在小屏幕下的显示

目前侧边栏只有在 `md` 以上的屏幕才会展示，我设想让它在其它屏幕下在 @src/components/blocks/header/index.tsx 中的 L60-L142 中展示，且此时不再是 `sticky` 布局，而是正常的可滚动布局。但是其需要的 `props` 数据来源又是一个问题。你有什么好方案？ultrathink

### 优化前端集合数据展示

请你根据 @.env.local 中的 `SHOW_COLLECTION_STRATEGY` 环境变量，来控制以下的数据。此外你还可以帮我检查一下是否有需要补充修改的。ultrathink

- @src/services/content/list.ts
  - `getAllCategories` 函数
  - `getAllTags` 函数
- @src/services/content/home.ts
  - `getSidebarCategories` 函数
  - `getSidebarTags` 函数

## 优化 CMS 页面

### CMS 游戏详情编辑表单中缺少字段

在 @src/components/admin/game-form.tsx 内的表单字段里，我觉得缺少了「游戏介绍表」中的 `metadataTitle`、`metadataDescription` 和 `content` 字段。目前我在 CMS 上没有找到能编辑这三个字段的地方，我觉得将他们融合到一个表单中去编辑比较高效。你怎么看？ultrathink

参考：

- 游戏介绍表：@src/db/schema.ts 中的 L334-L355

虽然你在 @src/components/admin/game-form.tsx 内的表单字段里加上了游戏介绍的 3 个字段，但是我针对已存在的游戏进行编辑时，发现其没有拉取表中已有的数据字段值。请完善。

### CMS 优化请求状态

我看 @src/app/[locale]/admin/games/page.tsx 中有些请求没有管理状态，你觉得使用 `swr` 来包装一下请求去使用，然后针对相关请求在 UI 上补充展示请求状态和结果，这个优化方向如何？ultrathink

### CMS 优化其他页面的请求状态

在 @src/app/[locale]/admin/ 下的其他几个页面，也请你检查一下是否用 `swr` 来包装下请求会更好？更方便在 UI 上展示请求的相关状态。ulrtathink

### CMS 补充特性页面 - 进行中

在 @src/app/[locale]/admin/ 下缺少了对特性表 `featured` 的管理页面，请补充上去，页面结构和功能应该和 @src/app/[locale]/admin/categories/page.tsx 类似。ultrathink

## 优化批量导入 - 进行中

昨天你实现的批量导入 API 端点有如下几个，在本地运行时开发调试没有问题，但是能兼容在线上 Cloudflare Worker 中的运行时吗？你本来是如何为线上运行时批量导入考虑的？ultrathink

批量导入 API 端点：

- @src/app/api/admin/games/import/route.ts
- @src/app/api/admin/categories/import/route.ts
- @src/app/api/admin/tags/import/route.ts

### 新增排序功能

请你为 @src/app/[locale]/admin/games/page.tsx 页面中的表格增加一下按 `Status` 列排序的功能，对应的 API 在 @src/app/api/admin/games/route.ts。ultrathink

## 数据

### 补充文案

请你为游戏聚合站中常见的几个页面编写 SEO 友好且遵循最佳实践的文案。deep think

目标页面：

1. All Categories
2. All Tags
3. All Games
4. Hot Games
5. New Games

要求：

- 需要针对每个页面编写的内容包括：元标题、元描述、内容文案
- 使用英文
- 使用 Markdown 格式

信息：

- 我们站点域名是 `gamesramp.com`
- 参考 https://poki.com/en/categories

### 补充导出 featured 表数据

请你在 @tools/rewrite/cate-and-tag/ 中帮我写一个脚本，用来导出 @src/db/schema.ts 中 `featured` 表的所有数据，并按 @tools/rewrite/cate-and-tag/output/game-categories.json 类似的格式，以 JSON 方式保存到 @tools/rewrite/cate-and-tag/output/ 下。ultrathink

说明：

- 应该可以请求 @src/app/api/admin/featured/ 下的接口来直接获取数据。

### 补充批量导入脚本

我刚才又准备来可以批量导入 `featured` 表的 JSON 数据 @tools/rewrite/cate-and-tag/output/featured.json，请你针对这个在 @tools/batch-import/ 目录下补充批量导入的脚本。顺便更新操作方法到文档中 @docs/biz/project/dev-batch-api/testing-guide.md 中。ultrathink

### 优化游戏批量导入脚本

批量导入脚本 @tools/batch-import/import-games.ts 中，`game.introduction` 在的 `content` 内容，应该是要去 @tools/rewrite/geometrylite.io/output/content/ 下面读取对应文件的文案。具体对应的关系在 `games-*.json` 里面，`contentPath` 的值就表明了。请你 fix。ultratink

## 重写静态页面的文案

我们本项目是一个线上 H5 游戏聚合站，域名为 `gamesramp.com`，请你据此帮我改写如下几个从旧项目中继承过来的静态页面下的内容文案，结构可以保持不变，根据业务和特点改写其中要点内容。ultrathink

要求：

- 优先仔细思考规划内容文案
- 然后才是改动文件

需要修改的文案文件：

- 「About」页面的文案：@src/i18n/pages/en/about/content.md
- 「Privacy」页面的文案：@src/i18n/pages/en/privacy/content.md
- 「Terms」页面的文案：@src/i18n/pages/en/terms/content.md

---

请帮我继续改写 @src/i18n/pages/en/index.ts 中的 `layout.metadata.title` 和 `layout.metadata.description`。ultrathink

要求：

- 遵循 SEO 最佳实践：元标题字符数在 50-60 之间，元描述在 140-160 之间，包含核心关键词；
- 强吸引力，光具备 SEO 能力还不够，还需要吸引用户点击。

---

请你看看 @src/i18n/pages/en/dcma/content.md 的内容是否还有重写的必要？如果无需重写，那么是否需要优化和完善？ultrathink

---

## 修复 sitemap

@src/app/sitemap.ts 里面的逻辑需要按如下要求修正一下。ultrathink

要求：

1. 只有标记为已上线的游戏页面才能出现在 sitemap 中；
2. 只有其下游戏数量不为 `0` 的分类或者标签页面才能出现在 sitemap 中。

备注：

- 你可以在 @src/services/content/ 下找找对应的拉取数据的服务，目前有实现了类似需求的。

## 修复服务端逻辑

### 特性逻辑

目前发现管理「游戏」与「特性」之间的关系有缺漏，如下描述，请你先据此提出妥善的方案，保存在 @docs/biz/project/dev-operation/ 目录下，供我审核。ultrathink

目标文件：
- 查询首页数据文件：@src/services/content/home.ts
- 查询列表数据文件：@src/services/content/list.ts

缺漏：
- 「首页数据文件」和「列表数据文件」中获取「Hot」数据的逻辑没有对齐，前者是根据绑定关系来查的，后者是根据表中数据来查的；我希望能结合两者的特点，既保留前者的运营侧能力，又保留后者的自动化统计筛选能力；
- 不仅是「Hot」数据，我希望「New」数据也能具备相应的运营侧能力；

总结：
- 如果要有运营能力，那么就需要在 @src/app/[locale]/admin/games/page.tsx 的表格里面的 `Actions` 那列再加一个操作按钮，点击弹窗之后能运营游戏与 `Featured`、`Category` 和 `Tag` 数据之间的关联关系。
- 运营数据的权重更高，提供数据的服务中，将运营数据优先排列在前。

## 批量过滤出所有游戏名

请你帮我在 @tools/rewrite/geometrylite.io/ 下写一个脚本，用于针对对应的 JSON 文件提取出相关信息列表，具体要求如下。ultrathink

逻辑：
1. 遍历 @tools/rewrite/geometrylite.io/games-*.json 文件，然后提取 `title` 对应的值；如果值是这种 `Geometry Dash: UFO Flying` 有带英文 `:` 字符的，那么只取 `title.split(':')[0]`；
2. 输出到 @tools/rewrite/geometrylite.io/output/list/ 目录下，以 txt 文件保存即可，每行一个值。


## 根据游戏名称查到的 Google Trends

我将所有的游戏名分批送去第三方服务上中使用 Google Trends 查相对于 "colorfle" 的趋势了，并拿到了所有汇报结果。请你先帮我看看 @tools/analyze/output/trends-1.json 数据，你是否能读懂？ ultrathink

说明：
- "colorfle" 是一款猜谜类游戏，日搜索量大概 1K 左右；
- 这些数据拿到之后，是可以在前端绘制出如图的搜索量趋势图的；
- 我的核心目的是想请你分析 JSON 数据，帮我分 5 档输出游戏名称列表，按搜索量趋势由高到低排序；先看看你是否能读懂吧。

### 继续综合评估数据

请问你可以将 @tools/analyze/rank/trends-\*.txt 所有文件的数据拉通，配合原始数据 @tools/analyze/output/trends-\*.json 来一起看吗？最后还是分成 5 档，写入一份综合文件里面。ultrathink

要求：
- 先评估一下我这个需求是否合理？实现是否可行？
- 我同意之后，你再进行。

## 生成首页文案

请你帮我根据以下的参考内容，给我的在线游戏聚合站[GamesRamp](gamesramp.com)写一份正文文案来介绍我们的站点。ultrathink

要求：
- 文案不要使用 Emoji
- 文案不要使用“不是...而是...”的 AI 固定句式
- 文案要有「活人感」
- 使用英文，最后结果保存到 @tools/rewrite/cate-and-tag/output/ 下

## 参考内容

元信息：
```json
{
  "title": "Play Free Online Games at GamesRamp",
  "description": "GamesRamp is the best website to play free online games on your mobile, tablet or computer. No downloads, no registration. Just click and play!",
}
```

分类、标签、特征页面信息：
- @tools/rewrite/cate-and-tag/output/*.json

游戏详情信息：
- @tools/rewrite/geometrylite.io/output/*.json
- @tools/rewrite/geometrylite.io/output/content/*.md

## 给分类表加图标属性

我需要给分类添加图标，请你帮我按顺序完成如下事项。ultrathink

事项：
- 在 @src/db/schema.ts 中的 `categories` 表中新增列 `iconUrl`，然后使用 `drizzle:generate` npm script 自动来生成增量迁移脚本，不用去手动创建 SQL 文件；
- 在 @src/app/[locale]/admin/categories/page.tsx 中的新增、编辑分类的弹窗表单中，新增 `iconUrl` 输入框，并且在 @src/app/api/admin/categories/route.ts 文件的两个方法路由中新增 `iconUrl` 字段；
- 在 @src/services/content/home.ts 文件的 `getSidebarCategories` 函数中新增查询返回字段 `iconUrl`。

## 收敛获取侧边栏的数据为服务

如图所示，在这些文件里面都为侧边栏去单独一个个请求数据，请你将关于侧边栏数据请求的操作封装成一个 service 函数，并存放到 @src/services/content/ 目录下，然后更新调用处。ultrathink

## 优化侧边栏

将 @src/components/blocks/sidebar/index.tsx 中 L72-L95 的项更新成使用数据表 `featured` 中的数据，只不过固定过滤这目前这些列表项来展示。完成后，顺便更新刚才那些应用层入参数据。ultrathink

## 添加多语言

我想给整个网站的添加多语言文案，目前看 DB 表 @src/db/schema.ts 涉及到的有 `introductions` 表、`categories` 表、`tags` 表和 `featured` 表，其中的 `metaTitle`、`metaDescription` 和 `content` 是需要做多语言的。对此需求，你有什么想法？我有什么遗漏的地方？ultrathink

### 自动化多语言

我详细地阅读了你沉淀的文档，在此提出几点讨论。ultrathink

1. CMS 相关的编辑框中无需 [+ Add Language] 功能，因为我打算新增一个「多语言管理页面」来实现自动化翻译。
2. CMS 侧边栏新增一个「多语言管理」项，对应新增「多语言管理页面」，每个语言以卡片形式展现。
3. CMS「多语言管理页面」中的每个卡片上有审计数据，审计范围包括：（1）已上线的游戏列表；（2）分类列表；（3）标签列表；（4）特性列表。审计内容为：（1）「已翻译数量」/「总数量」；（2）百分比；需要建立对应的数据表，数据表字段应该包含：（0）uuid，（1）code（语言代码，例如 `en`），（2）language（当地语言名称，例如 `繁體中文`），（3）zhLanguage（简体中文语言名称，例如 `波兰语`），（4）创建时间、更新时间、删除时间；审计内容数据不需要做服务端渲染，在客户端中去做拉取即可，请求过程展示加载态。
4. CMS「多语言管理页面」中额外包含一个与卡片大小相同的「新增」按钮，点击后弹出表单，需要填写的字段按表字段来做；每个卡片右上方有「更多」的 ICON 按钮，点击展示下拉列表，包含「编辑」、「删除」、「刷新审计」、「自动化翻译」按钮，其中「默认语言」只有「编辑」按钮，默认语言为 @src/i18n/language.ts 导出的 `DEFAULT_LOCALE` 常量。
5. 「自动化翻译」按钮在点击之后弹窗给出两个选项：（1）全部翻译；（2）补充翻译。前者为不管是否已经有对应的语言翻译，一律重新全部翻译；后者为仅针对空的字段进行补充翻译。自动化翻译的流程为根据要审计的范围，并发触发翻译任务接口，接口中接收到请求之后调用 `ai` 包和 `@openrouter/ai-sdk-provider` 包去做 AI 翻译，模型指定为 `openai/gpt-4.1`，重点是要写好提示词，力求翻译准确、完善，符合当地的表达习惯。

### 补充注意事项

补充一些重要的注意事项，请你也完善到文档中。ultrathink

1. UI 组件优先级：采用本地已有组件 > 安装并采用缺少的 Shadcn UI 组件 > 采用 Magic UI 组件 > 创建新组件；
2. 新的 Table 组件和表单组件，请使用配置驱动式生成，避免重复写大量类似的标签，影响打包体积；存量的以后根据新的经验逐渐更新替换；
3. 对于数据表的修改更新只需要对 @src/db/schema.ts 文件进行，然后运行 `drizzle:generate` npm script 就可以生成对应的 SQL 文件，不要手动去创建 SQL 文件；
4. 所有的代码要遵循 SOLID 原则；
5. 消费任务队列的逻辑单独封转一个服务，存放到 @src/services/ 目录下，本地开发下直接调用，线上才走任务队列；
6. 「6.2.4 AI 翻译提示词」中的提示词请你改成使用英文提示词；
7. 在「八、回退策略」中，不要在对 C 端用户的前端页面中加入回退机制下的「SEO Meta」和「用户提示」，如果翻译完成度不达标，直接返回 302 重定向到默认语言。

### 为啥多个 sql 文件

请问为啥这次需求中新增了两个 `0002_` 开头的 sql 脚本文件？分别为 @drizzle/0002_add_translation_tasks.sql 和 @drizzle/0002_chunky_maddog.sql。我再三强调你不要自己主动创建文件，写好 @src/db/schema.ts 就行，其他的交给 `drizzle:generate` npm script 来自动化生成 sql 文件。你详细解释一下，现在请不要改动文件。

### CMS 首页

@src/app/[locale]/admin/page.tsx 卡片列表和 @src/components/admin/sidebar.tsx 侧边栏列表的内容没有对齐，请完善。


### 多语言管理页面

这个多语言管理页面 @src/app/[locale]/admin/translations/page.tsx，我体验了下发现你好像完全没有按照 @docs/biz/project/dev-i18n/i18n-implementation.md 中的「5.1 多语言管理页面（独立页面）」这个章节规划的来做呀。我认为的问题如下，请你详细解释一下为什么？不要动代码。ultrathink

问题：
1. 没有启用语言数量展示
2. 没有「新增语言」按钮
3. 应该是每个语言一个审计模块卡片，而不是每个业务项一个模块卡片
4. 还有其他的你看规划文档吧。

### 多语言管理页面 - 抓 bug 1

目前体验发现如下问题，请 fix。ulrathink

@src/app/[locale]/admin/translations/page.tsx 下的问题列表：
1. 删除语言时没有 Loading 态，体验差；
2. 删除 A 语言之后，再重新新增 A 语言会报错说对应的语言代码已存在。

### 多语言管理页面 - 抓 bug 2

@src/services/translation/processor.ts 中 L60 开始的 `translateGames` 函数中，过滤条件应该设置为仅针对状态为已上线的游戏进行翻译。ultrathink

### 多语言管理页面 - 抓 bug 3

对于 @src/services/ai/translation.ts 翻译部分的实现，我真是无力吐槽。请你认真、细致、一丝不苟地阅读需求规划文档 @docs/biz/project/dev-i18n/i18n-implementation.md 中的整个「## 六、自动化翻译系统」章节。然后明确你需要重做、完善的部分。ultrathink

### 多语言管理页面 - 抓 bug 4

以 @src/app/[locale]/admin/translations/page.tsx 为入口，向下查找组件和页面，会发现他们都缺少了一个意识：对于 Games 的翻译首先关注的应该是「上线了的游戏」，而非「全部游戏」。你可以先查看下代码和设计，看看我们可以怎么调整下 UI 和对应的接口。ultrathink

### 多语言管理页面 - 抓 bug 5

游戏管理中针对游戏的编辑弹窗表单中，左边红框中文翻译的字段值是空的，但是之前我已经执行完翻译了。原因应该是右边红框中回包字段里面没有包含多语言翻译，反倒是将默认语言的文案字段包含了，默认语言的本来外层就有。ultrathink

### 多语言管理页面 - 抓 bug 6 - 处理中

分类管理、标签管理、特性管理，这三个页面都是复用同一个管理组件，但是我执行完翻译之后，编辑弹窗里面看「简体中文」部分是没有数据的，原因应该是拉表格列表接口的时候没有返回。你看看怎么修复这个问题。ultrathink

### 多语言管理页面 - 抓 bug 7

截图红框中的「整体完成度」百分比是按「全部游戏」来统计的吧？请你优先按「在线游戏」来参与统计，在下面再附上一个「全部游戏」参与统计的百分比，就像上面「在线游戏翻译」的数据展示部分一样，区分主次。ultrtahink

### 多语言管理页面 - 抓 bug 8

这里的展示也不对劲，当时我在前面多语言管理页面中打开「自动化翻译弹窗」时，「补充翻译」的统计待翻译量是 32 条，后面进来看任务却展示的是全量数据的翻译量。请你连带后台服务的逻辑也检查一下，到底是哪里出了问题？实际触发翻译量有没有问题？ultrathink

### 多语言管理页面 - 抓 bug 9

@src/components/admin/language-management/language-card.tsx 中 L275-L283 这个按钮是干啥用的？路由跳转地址我看是不存在的。ultrathink

### 多语言管理页面 - 抓 bug 10

@src/app/[locale]/admin/translations/page.tsx 页面中，在「卡片出来之前」以及「卡片出来之后加载完统计数据之前」，缺少加载态，请补充。ultrathink

### 多语言管理页面 - 抓 bug 11

请你巨细无遗地检查一下如下几个 C 端用户页面，看看目前是否已经兼容了向服务拉取多语言文案进行展示？ultrathink

涉及页面：
- @src/app/[locale]/categories/page.tsx
- @src/app/[locale]/category/[slug]/page.tsx
- @src/app/[locale]/game/[slug]/page.tsx
- @src/app/[locale]/games/page.tsx
- @src/app/[locale]/hot/page.tsx
- @src/app/[locale]/new/page.tsx
- @src/app/[locale]/tag/[slug]/page.tsx
- @src/app/[locale]/tags/page.tsx

### 多语言管理页面 - 抓 bug 12

@src/app/api/admin/featured/route.ts 中的 GET 接口缺少了多语言翻译的返回，参考 @src/app/api/admin/categories/route.ts 中的 GET 接口。ultrathink

### 多语言管理页面 - 抓 bug 13

我发现对于某个分类、标签、特性合集或者是游戏介绍表， 比如其对应的翻译表中只有 `content` 字段为空，即没有翻译内容，这时候也会被归类到「翻译完成」一类。我认为正确的逻辑应该是：对比默认语言的表字段内容，如果它有而翻译表字段没有，则判断为该项未翻译完成。你认为如何？如果你同意，那么告诉我你的完善计划以及目标修改文件。ultrathink

### 多语言管理页面 - 抓 bug 14

我在 /admin/translations 页面看中文翻译的时候是全部翻译完成了，但是在自动化翻译弹窗里面我依然尝试触发增量翻译任务，发现任务依旧能创建成功，而且显示需要翻译已上线且已完成翻译的 2 个游戏。另外，游戏翻译完成之后，又紧接着显示要翻译 15 个分类。请你彻查这里面的逻辑 bug，然后汇报给我，先不要急着改代码。ultrathink

---

我找到问题出在 @src/app/api/admin/translations/generate/route.ts 的 POST 接口里面，当为 `supplement` 增量翻译时，即使统计出来待翻译的数量 `gamesCount`、`categoriesCount`、`tagsCount` 和 `featuredCount` 均为 0，此时依然还会调用 `createTranslationTask` 函数，其里面又去写 DB 表；然后在本地开发环境，依然也还会调用 `processTranslationTask` 函数，里面又去串行调用翻译函数，因为入参 `categories` 对象里面所有值都是 `true`。而且最傻逼的是在 @src/services/translation/processor.ts 里面的 L134-L138 里面，入参的 `existingIntroTranslation` 内字段名是 snake_case 的，而入参的 `introData` 的内字段名是 kebabCase 的，调用 `isTranslationComplete` 函数判断的结果肯定永远都是 `false`，也就是会造成每一个字段都需要重新翻译。 请你自己巨细无遗地全部检查一遍，输出审计报告，先别改动代码。ultrathink

---

### 多语言管理页面 - 抓 bug x

发现一个大缺陷，我梳理出以下待改内容，但可能有遗漏，请帮我重新 review 还有哪些需要修改，整理出一份浓缩但是没有遗漏的文档，并存放到 @docs/biz/project/dev-i18n/patch-name-translation/ 目录下。ultrathink

如下翻译表缺少 `name` 字段（因为不同语言下名称也有可能不同的）：
- 分类表：@src/db/schema.ts 中的 `categoryTranslations`
- 标签表：@src/db/schema.ts 中的 `tagTranslations`
- 特性合集表：@src/db/schema.ts 中的 `featuredTranslations`

对应的 CMS 如下内容也要修改：
- 分类管理的新增、编辑弹窗
- 标签管理的新增、编辑弹窗
- 特性合集表管理的新增、编辑弹窗

对应的审计相关内容也要修改：
- 翻译表对比原表字段列表增加 `name` 字段

对应的执行翻译的逻辑也要修改：
- 新增翻译 `name` 字段

---

现在请你根据 @docs/biz/project/dev-i18n/patch-name-translation/*.md 文档进行剩下的 CMS UI 改动工作。当上下文窗口快满时停下来，我来输入压缩命令。ultrathink 


### 多语言管理页面 - 抓 bug x+1

请你帮我审计一下 @src/app/[locale]/ 下面有哪些 C 端页面以及其下用到的组件是写死了英语文案的，比如说向从 C 端游戏页面入手，找到了 @src/components/comment/form.tsx 评论组件，里面写死了英文文案。不要改动代码，先 Markdown 文件方式整理汇报到 @docs/biz/project/dev-i18n/patch-ui-text/ 目录下。ultrathink

注意：不需要统计 CMS 端的，只需要统计面向 C 端用户的。


## 拉取游戏机制

我要请你帮我设计一个完善的子站拉取主站游戏相关信息并入库的机制。基本需求如下，请你仔细分析、思考并出方案