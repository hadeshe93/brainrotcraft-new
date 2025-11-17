import markdownit from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
// @ts-ignore
import markdownItTableOfContents from 'markdown-it-table-of-contents';
import hljs from 'highlight.js/lib/core'; 
import typescript from 'highlight.js/lib/languages/typescript';
import bash from 'highlight.js/lib/languages/bash';
import 'highlight.js/styles/github.css';
import loadOrderedListPlugin from './plugin-ordered-list';
import loadInternalLinkPlugin from './plugin-internal-link';
import loadExternalLinkPlugin from './plugin-external-link';

hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('bash', bash);

const md = markdownit({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }

    return ''; // use external default escaping
  },
});
md.use(markdownItAnchor);
md.use(markdownItTableOfContents);

loadOrderedListPlugin(md);
loadInternalLinkPlugin(md);
loadExternalLinkPlugin(md);

export function renderMarkdown(rawMarkdown: string, env?: any) {
  return md.render(rawMarkdown, env);
}