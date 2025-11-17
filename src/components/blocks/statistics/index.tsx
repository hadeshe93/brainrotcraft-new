import { cn } from '@/lib/utils';
import { Statistics as StatisticsType } from '@/types/blocks/statistics';
import Icon from '@/components/icon';

interface StatisticsProps {
  config: StatisticsType;
  className?: string;
}

export default function Statistics({ className, config }: StatisticsProps) {
  const { id, title, emphasisTitle = '', description, items } = config;
  const [prefixTitle, suffixTitle] = emphasisTitle ? title.split(emphasisTitle) : [title, ''];

  return (
    <section id={id} className={cn('block-section max-w-none bg-muted/30', className)}>
      <div className="container mx-auto max-w-6xl">
        {/* 头部内容 */}
        <div className="mb-12 text-center md:mb-16">
          {/* 主标题 */}
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            {prefixTitle}
            {emphasisTitle && <span className="text-primary font-extrabold">{emphasisTitle}</span>}
            {suffixTitle}
          </h2>

          {/* 描述文本 */}
          {description && (
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg leading-relaxed md:text-xl">
              {description}
            </p>
          )}
        </div>

        {/* 统计数据网格 */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-12">
          {items.map((item, index) => (
            <div
              key={index}
              className="text-center"
            >
              {/* 前置描述文字 */}
              <div className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground md:text-base">
                {item.formerText}
              </div>

              {/* 突出显示的数字/核心数据 */}
              <div className="mb-2 text-4xl font-bold text-primary md:text-5xl lg:text-6xl">
                {item.middleText}
              </div>

              {/* 后置描述文字 */}
              <div className="text-base font-medium text-muted-foreground md:text-lg">
                {item.latterText}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
