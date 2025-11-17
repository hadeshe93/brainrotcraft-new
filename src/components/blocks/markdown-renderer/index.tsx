import { cn } from '@/lib/utils';
import { MarkdownRenderer as MarkdownRendererType } from '@/types/blocks/markdown-renderer';
import { default as MarkdownRendererComponent } from '@/components/markdown-renderer';
import { useLocale } from 'next-intl';
import { LanguageCode } from '@/types/lang';
interface MarkdownRendererProps {
  config: MarkdownRendererType;
  className?: string;
}

export default function MarkdownRenderer({ className, config }: MarkdownRendererProps) {
  const { id = '', content } = config;
  const locale = useLocale() as LanguageCode;
  return (
    <section id={id} className={cn('block-section prose dark:prose-invert', className)}>
      <MarkdownRendererComponent locale={locale} content={content} />
    </section>
  );
}