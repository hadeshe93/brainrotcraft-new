/**
 * 为 markdown 中的有序列表内容去除被 p 元素包裹
 */
import type MarkdownIt from 'markdown-it';

export default function loadOrderedListPlugin(md: MarkdownIt) {
  // 保存默认的 ordered_list 渲染函数
  const defaultRender =
    md.renderer.rules.ordered_list_open ||
    function (tokens: any, idx: any, options: any, env: any, self: any) {
      return self.renderToken(tokens, idx, options);
    };

  // 重写 ordered_list_open 渲染规则
  md.renderer.rules.ordered_list_open = function (tokens: any, idx: any, options: any, env: any, self: any) {
    // 处理 tokens 内容
    let i = idx + 1;
    while (i < tokens.length && tokens[i].type !== 'ordered_list_close') {
      // 如果当前 token 是列表项内的段落
      if (tokens[i].type === 'list_item_open') {
        let j = i + 1;
        while (j < tokens.length && tokens[j].type !== 'list_item_close') {
          // 移除段落标签
          if (tokens[j].type === 'paragraph_open') {
            tokens[j].hidden = true;
          }
          if (tokens[j].type === 'paragraph_close') {
            tokens[j].hidden = true;
          }
          j++;
        }
      }
      i++;
    }
    
    return defaultRender(tokens, idx, options, env, self);
  };
}
