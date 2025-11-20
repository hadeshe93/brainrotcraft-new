import path from 'path';
import fs from 'fs/promises';

async function main() {
  const response = await fetch("https://cgi.gptomni.ai/internal/analyze/retrieveTrendsData", {
    "headers": {
      "accept": "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      "content-type": "application/x-www-form-urlencoded",
      "priority": "u=1, i",
      "sec-ch-ua": "\"Chromium\";v=\"142\", \"Google Chrome\";v=\"142\", \"Not_A Brand\";v=\"99\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"macOS\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "cookie": "_ga=GA1.1.1078215825.1715655155; __gads=ID=a8612e2c7a27de60:T=1760688056:RT=1760688056:S=ALNI_MbEh33ZBIerqOgwoHIRWNgpTsuifg; __gpi=UID=0000129f93cfc464:T=1760688056:RT=1760688056:S=ALNI_MaS37SNwsbGTnNAnTtiQB5a8THQxA; __eoi=ID=e1c8fa60a28c4736:T=1756975272:RT=1760688056:S=AA-AfjZDJ0iw0VPgG14TDBvXCY3O; _ga_G0KJ8CTZM4=GS2.1.s1760688055$o196$g1$t1760688139$j60$l0$h0; accessToken@internal=3jrCY1FcG6GQ3Kc_Rf-Ma; username@internal=hadeshe",
      "Referer": "https://cms.gptomni.ai/"
    },
    "body": "{\"serpId\":\"896zpq104thusm8IHx2ik\",\"pageSize\":200,\"currentPage\":1}",
    "method": "POST"
  });
  const data = await response.json();
  await fs.writeFile(path.join(__dirname, `output/trends.json`), JSON.stringify(data, null, 2));
}

// 执行： pnpm tsx tools/fetch-serp/index.ts
main();

/**

提示词:

我在附件中上传了一份谷歌趋势数据，包含多个游戏相关关键词的搜索量数据，这些数据的时间跨度在最近 3 个月内。请你帮我分析这些数据，过滤出符合我目标要求的关键词，并附带简要的信息说明，最终以文档的形式反馈。

要求：
1. 最近从 0 呈现上升趋势的关键词，且没有出现急剧下降到 0 的趋势；
2. 如果关键词的相对搜索量从 0 开始并超过「colorfle」的搜索量，那么需要记录下来；
3. 过滤出来后，进行深度调研分析，这些关键词对应的用户需求以及社媒上的热度是否符合做新站点来承接流量；如果符合，那么记录下来；
4. 最后整理好信息，以文档形式反馈给我。

 */