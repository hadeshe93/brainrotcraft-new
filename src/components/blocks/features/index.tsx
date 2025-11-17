import { cn } from '@/lib/utils';
import { Features as FeaturesType } from '@/types/blocks/features';
import Icon from '@/components/icon';

interface FeaturesProps {
  config: FeaturesType;
  className?: string;
}

export default function Features({ className, config }: FeaturesProps) {
  const { id, title, emphasisTitle = '', description, items, uiType = 'grid' } = config;
  const [prefixTitle, suffixTitle] = emphasisTitle ? title.split(emphasisTitle) : [title, ''];
  const isDualColumn = uiType === 'dual-column';
  return (
    <section id={id} className={cn('block-section', isDualColumn ? 'max-w-5xl' : '', className)}>
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
          <p className="text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed md:text-xl">{description}</p>
        )}
      </div>

      {/* 特性网格 */}
      {uiType === 'grid' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {items.map((item, index) => (
            <div
              key={index}
              className={cn(
                'group bg-card/50 relative rounded-2xl p-6 backdrop-blur-sm md:p-8',
                'border-border/50 hover:border-border border transition-all duration-300',
                'hover:shadow-primary/5 hover:-translate-y-1 hover:shadow-lg',
              )}
            >
              {/* 图标和标题行 */}
              <div className="mb-4 flex items-center gap-4">
                {/* 图标容器 */}
                <div className="relative flex-shrink-0">
                  <div
                    className={cn(
                      'inline-flex h-12 w-12 items-center justify-center md:h-14 md:w-14',
                      'bg-primary/10 text-primary rounded-xl',
                      'group-hover:bg-primary group-hover:text-primary-foreground',
                      'transition-all duration-300 group-hover:scale-110',
                    )}
                  >
                    <Icon config={item.icon!} className="h-6 w-6 md:h-7 md:w-7" />
                  </div>

                  {/* 装饰性背景圆圈 */}
                  <div
                    className={cn(
                      'from-primary/20 to-primary/5 absolute -inset-1 rounded-xl bg-gradient-to-r',
                      '-z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100',
                    )}
                  />
                </div>

                {/* 标题 */}
                <div className="min-w-0 flex-1">
                  <h3
                    className={cn(
                      'text-foreground text-xl font-semibold md:text-2xl',
                      'group-hover:text-primary transition-colors duration-300',
                      'max-h-[3.5rem] overflow-hidden leading-tight md:max-h-[4rem]',
                    )}
                  >
                    {item.title}
                  </h3>
                </div>
              </div>

              {/* 描述内容 */}
              {item.description && (
                <div className="">
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              )}

              {/* 底部装饰线条 */}
              <div
                className={cn(
                  'via-primary/30 absolute right-6 bottom-0 left-6 h-0.5 bg-gradient-to-r from-transparent to-transparent',
                  'opacity-0 transition-opacity duration-300 group-hover:opacity-100',
                )}
              />
            </div>
          ))} 
        </div>
      )}

      {/* 双列交叉布局 */}
      {uiType === 'dual-column' && (
        <div className="space-y-6">
          {items.map((item, index) => {
            const isEven = index % 2 === 0;

            return (
              <div
                key={index}
                className={cn(
                  'group flex flex-col gap-8 md:flex-row md:items-center md:gap-12 lg:gap-16',
                  isEven ? '' : 'md:flex-row-reverse',
                )}
              >
                {/* 图片部分 */}
                {item.image && (
                  <div className="relative w-full md:w-1/2">
                    <div className="relative overflow-hidden">
                      <div className="flex items-center justify-center">
                        <img
                          src={item.image.url}
                          alt={item.image.alt || item.title}
                          className={cn(
                            'h-auto w-60 md:w-68 object-cover transition-transform duration-500',
                            'group-hover:scale-105',
                          )}
                        />
                      </div>

                      {/* 装饰性渐变叠层 */}
                      <div
                        className={cn(
                          'absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent',
                          'opacity-0 transition-opacity duration-300 group-hover:opacity-100',
                        )}
                      />
                    </div>

                    {/* 装饰性背景元素 */}
                    <div
                      className={cn(
                        'absolute -inset-4 -z-10 rounded-2xl bg-gradient-to-br',
                        isEven
                          ? 'from-primary/20 via-primary/10 to-transparent'
                          : 'from-primary/10 via-primary/20 to-transparent',
                        'opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100',
                      )}
                    />
                  </div>
                )}

                {/* 文字内容部分 */}
                <div className="w-full md:w-1/2">
                  <div className="space-y-4">
                    {/* 标题 */}
                    <h3
                      className={cn(
                        'text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl',
                        'text-foreground transition-colors duration-300',
                        'group-hover:text-primary',
                      )}
                    >
                      {item.title}
                    </h3>

                    {/* 描述 */}
                    {item.description && (
                      <p className="text-muted-foreground text-base leading-relaxed md:text-lg">
                        {item.description}
                      </p>
                    )}

                    {/* 装饰性下划线 */}
                    <div className="pt-2">
                      <div
                        className={cn(
                          'h-1 w-24 rounded-full bg-gradient-to-r',
                          isEven
                            ? 'from-primary to-primary/50'
                            : 'from-primary/50 to-primary',
                          'transform transition-all duration-500',
                          'group-hover:w-32',
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
