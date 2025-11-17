// import { Lang } from '@/lib/langs';
import { LanguageCode } from '@/types/lang';
import { renderMarkdown } from '@/lib/markdown';
import { checkIsDefaultLocale } from '@/i18n/utils-client';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  locale: LanguageCode;
  content: string;
  className?: string;
}

export default function MarkdownRenderer(props: MarkdownRendererProps) {
  const { locale, content, className } = props;
  const isDefaultLocale = checkIsDefaultLocale(locale);
  const innerLinkPrefix = isDefaultLocale ? '' : `/${locale}`;
  const rawHTML = renderMarkdown(content, { innerLinkPrefix });

  return (
    <div className={cn('markdown-renderer', className)} dangerouslySetInnerHTML={{ __html: rawHTML }}></div>
  );
}