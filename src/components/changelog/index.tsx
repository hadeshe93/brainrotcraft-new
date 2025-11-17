import { Changelog as ChangelogType } from '@/types/blocks/changelog';
import { cn } from '@/lib/utils';
import MarkdownRenderer from '@/components/markdown-renderer';
import { LanguageCode } from '@/types/lang';

interface ChangelogProps {
  configs: ChangelogType;
  locale: LanguageCode;
  className?: string;
}

export default function Changelog(props: ChangelogProps) {
  const { configs, locale, className } = props;
  const total = configs.list.length;
  return (
    <div className={cn('mx-auto', className)}>
      {configs.list.map((item, index) => (
        <div
          key={item.version}
          className={cn(
            'border-neutral flex gap-2 px-2 py-4',
            index === 0 ? 'font-extrabold' : '',
            index === total - 1 ? '' : 'border-b',
          )}
        >
          <h2 className="w-1/5 shrink-0 font-mono">{item.version}</h2>
          <p className="w-1/5 shrink-0">{item.date}</p>
          <div className="w-3/5">
            {item.changes.map((change, idx) => (
              <section key={idx} className="">
                {
                  index > 0 ? (<MarkdownRenderer locale={locale} content={change} />) : change
                }
              </section>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
