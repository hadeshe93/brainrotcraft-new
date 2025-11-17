import { cn } from '@/lib/utils';
import { FAQ as FAQType } from '@/types/blocks/faq';
import MarkdownRenderer from '@/components/markdown-renderer';
import { useLocale } from 'next-intl';
import { LanguageCode } from '@/types/lang';

interface FAQProps {
  config: FAQType;
  className?: string;
}

export default function FAQ({ className, config }: FAQProps) {
  const { id, title, emphasisTitle = '', description, items } = config;
  const [prefixTitle, suffixTitle] = emphasisTitle ? title.split(emphasisTitle) : [title, ''];
  const locale = useLocale() as LanguageCode;
  return (
    <section id={id} className={cn('block-section bg-background text-foreground', className)}>
      <div className="container mx-auto max-w-6xl">
        {/* 头部内容 */}
        <div className="mb-8 text-center md:mb-12">
          {/* 主标题 */}
          <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            {prefixTitle}
            {emphasisTitle && <span className="text-primary font-extrabold">{emphasisTitle}</span>}
            {suffixTitle}
          </h2>

          {/* 描述文本 */}
          {description && (
            <p className="text-muted-foreground mx-auto max-w-2xl text-base leading-relaxed md:text-lg">
              {description}
            </p>
          )}
        </div>

        {/* FAQ 网格 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:gap-12">
          {items.map((item, index) => (
            <div key={index} className="space-y-3">
              {/* 问题部分 */}
              <div className="flex items-start gap-3">
                {/* 编号 */}
                <div className="border-primary/30 bg-primary/10 text-primary flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border text-sm font-medium">
                  {index + 1}
                </div>

                {/* 问题文字 */}
                <h3 className="text-foreground text-xl leading-tight font-semibold md:text-2xl">{item.question}</h3>
              </div>

              {/* 答案部分 */}
              <div className="pl-9">
                {/* <p className="text-muted-foreground text-sm leading-relaxed md:text-base">{item.answer}</p> */}
                <div className="text-muted-foreground text-sm leading-relaxed md:text-base prose dark:prose-invert">
                  <MarkdownRenderer locale={locale} content={item.answer} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
