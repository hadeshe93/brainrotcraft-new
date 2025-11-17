/**
 * 为 markdown 中的站外链接添加如下属性：
 * - target="_blank"
 * - rel="noopener nofollow"
 */
import type MarkdownIt from 'markdown-it';

// 自定义渲染器
export default function loadExternalLinkPlugin(md: MarkdownIt) {
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
      
      // 判断是否是外部链接（以 http/https 开头）
      if (/^(?:http|https):\/\//i.test(href)) {
        // 添加 target="_blank" 属性
        const targetIndex = token.attrIndex('target');
        if (targetIndex < 0) {
          token.attrPush(['target', '_blank']);
        } else {
          token.attrs[targetIndex][1] = '_blank';
        }
        
        // 添加 rel="noopener nofollow" 属性
        const relIndex = token.attrIndex('rel');
        if (relIndex < 0) {
          token.attrPush(['rel', 'noopener nofollow']);
        } else {
          token.attrs[relIndex][1] = 'noopener nofollow';
        }
      }
    }
    
    return defaultRender(tokens, idx, options, env, self);
  };
}

