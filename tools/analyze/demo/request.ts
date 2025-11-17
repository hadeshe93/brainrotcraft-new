fetch('https://cgi.gptomni.ai/internal/analyze/retrieveTrendsData', {
  headers: {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/x-www-form-urlencoded',
    'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    Referer: 'https://cms.gptomni.ai/',
  },
  body: '{"serpId":"fvMJSgnh_imckm_-kbq4d","pageSize":20,"currentPage":1}',
  method: 'POST',
});
