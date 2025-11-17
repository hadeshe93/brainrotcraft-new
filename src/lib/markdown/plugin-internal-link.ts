/**
 * 为 markdown 中的站内链接添加前缀
 */
import type MarkdownIt from 'markdown-it';

// 自定义渲染器
export default function loadInnerLinkPrefixPlugin(md: MarkdownIt) {
  // 保存默认渲染函数
  const defaultRender =
    md.renderer.rules.link_open ||
    function (tokens: any, idx: any, options: any, env: any, self: any) {
      return self.renderToken(tokens, idx, options);
    };
  md.renderer.rules.link_open = function (tokens: any, idx: any, options: any, env: any, self: any) {
    const token = tokens[idx];
    const hrefIndex = token.attrIndex('href');

    if (hrefIndex >= 0) {
      const hrefAttr = token.attrs[hrefIndex];
      const href = hrefAttr[1];
      const prefix = (env && env.innerLinkPrefix) || '';

      // 判断是否是相对链接（不以 http/https/mailto 开头，也不以 # 开头）
      if (!/^(?:[a-z]+:)?\/\//i.test(href) && !href.startsWith('#') && !href.startsWith('mailto')) {
        // 只有默认语言的首页，才允许以 / 结尾
        let newHref = prefix.replace(/\/$/, '') + '/' + href.replace(/^\/+/, '');
        newHref = newHref !== '/' && newHref.endsWith('/') ? newHref.slice(0, -1) : newHref;
        hrefAttr[1] = newHref;
      }
    }

    return defaultRender(tokens, idx, options, env, self);
  };
}
