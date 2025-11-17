import { cn } from '@/lib/utils';
import { Steps as StepsType } from '@/types/blocks/steps';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

interface StepsProps {
  config: StepsType;
  className?: string;
}

export default function Steps({ className, config }: StepsProps) {
  const { id, title, emphasisTitle = '', description, items } = config;
  const [prefixTitle, suffixTitle] = emphasisTitle ? title.split(emphasisTitle) : [title, ''];

  return (
    <section id={id} className={cn('block-section', className)}>
      <div className="container mx-auto max-w-6xl">
        {/* 头部内容 */}
        <div className="mb-8 text-center md:mb-10">
          {/* 主标题 */}
          <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
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

        {/* 步骤列表 */}
        <div className="relative grid grid-cols-1 gap-3 lg:grid-cols-4 lg:gap-5">
          {items.map((item, index) => (
            <div
              key={index}
              className={cn(
                'flex flex-row items-start gap-2 lg:flex-col lg:gap-0',
                'group relative rounded-lg p-3 lg:p-4',
                'hover:border-border/50 focus:border-border/50 border border-transparent',
                'cursor-pointer transition-all duration-300',
                'hover:bg-card focus:bg-card',
              )}
              tabIndex={0}
            >
              {/* 步骤编号 */}
              <div className="mb-2 flex items-center justify-start">
                <div
                  className={cn(
                    'relative z-[1]',
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold md:h-7 md:w-7 md:text-sm',
                    'bg-muted text-muted-foreground transition-all duration-300',
                    'group-hover:bg-primary group-hover:text-primary-foreground',
                    'group-focus:bg-primary group-focus:text-primary-foreground',
                  )}
                >
                  {index + 1}
                </div>
              </div>

              <div>
                {/* 步骤标题 */}
                <h3
                  className={cn(
                    'mb-1.5 text-lg leading-tight font-semibold md:text-xl',
                    'text-foreground transition-colors duration-300',
                    'group-hover:text-primary group-focus:text-primary',
                  )}
                >
                  {item.title}
                </h3>

                {/* 步骤描述 */}
                {item.description && (
                  <div
                    className={cn(
                      'text-xs leading-relaxed md:text-sm',
                      'text-muted-foreground transition-colors duration-300',
                      'group-hover:text-foreground group-focus:text-foreground',
                    )}
                  >
                    {Array.isArray(item.description)
                      ? item.description.map((desc) => <p key={desc}>{desc}</p>)
                      : item.description}
                  </div>
                )}
              </div>
            </div>
          ))}
          {/* 步骤连线 */}
          <div
            className={cn(
              'absolute -z-1 block',
              // 从当前编号右侧中心连接到下一个编号左侧中心
              'top-6 bottom-0 left-[1.7rem] w-px', // 移动端位置
              'lg:top-[1.8rem] lg:right-0 lg:left-6 lg:h-px lg:w-auto', // 桌面端位置
              'bg-muted-foreground/10 transition-all duration-300',
            )}
          />
        </div>

        {/* 次级 CTA */}
        {
          config.cta && (
            <div className="flex items-center justify-center mt-6">
              <Link href={config.cta.url}>
                <Button size="lg" className="bg-accent text-accent-foreground font-semibold">
                  {config.cta.buttonText}
                </Button>
              </Link>
            </div>
          )
        }
      </div>
    </section>
  );
}
