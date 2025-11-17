import path from 'path';
import fs from 'fs/promises';

async function main() {
  for (let i = 1; i <= 7; i++) {
    const res = await fetch('https://cgi.gptomni.ai/internal/analyze/retrieveTrendsData', {
      headers: {
        accept: 'application/json, text/plain, */*',
        'content-type': 'application/x-www-form-urlencoded',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        Referer: 'https://cms.gptomni.ai/',
        Cookie:
          '_ga=GA1.1.1078215825.1715655155; __gads=ID=a8612e2c7a27de60:T=1760688056:RT=1760688056:S=ALNI_MbEh33ZBIerqOgwoHIRWNgpTsuifg; __gpi=UID=0000129f93cfc464:T=1760688056:RT=1760688056:S=ALNI_MaS37SNwsbGTnNAnTtiQB5a8THQxA; __eoi=ID=e1c8fa60a28c4736:T=1756975272:RT=1760688056:S=AA-AfjZDJ0iw0VPgG14TDBvXCY3O; _ga_G0KJ8CTZM4=GS2.1.s1760688055$o196$g1$t1760688139$j60$l0$h0; accessToken@internal=GvtQmpGgyphDlL8_wh-Nd; username@internal=hadeshe',
      },
      body: JSON.stringify({ serpId: 'fvMJSgnh_imckm_-kbq4d', pageSize: 20, currentPage: 1 }),
      method: 'POST',
    });
    const data = (await res.json()) as any;
    await fs.writeFile(path.join(__dirname, `output/trends-${i}.json`), JSON.stringify(data, null, 2));
  }
}
main();

// npx tsx tools/analyze/index.ts
