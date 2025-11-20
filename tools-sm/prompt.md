请你参考 @tools-backlink/download/index.ts，在 @tools-sm/ 目录下实现一个脚本，使用 Playwright 来访问 `https://www.similarweb.com/website/${domain}/` 网页，并返回响应中的字符串。ultrathink

注意：
1. 首次访问会返回 202 状态的 HTML，里面包括了一段脚本，然后会自动顺序发起多个验证请求，最后会自动再次原链接，会附带上 cookie，这时才有可能得到最终的 200 的结果；
2. 如果可以配置的话，配置 Playwright 让他展示浏览器，我想看看自动化流程的过程。