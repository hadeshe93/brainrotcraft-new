import { cn } from '@/lib/utils';
import { UseCases as UseCasesType } from '@/types/blocks/use-cases';
import Icon from '@/components/icon';

interface UseCasesProps {
  config: UseCasesType;
  className?: string;
}

export default function UseCases({ className, config }: UseCasesProps) {
  const { id, title, emphasisTitle = '', description, items } = config;
  const [prefixTitle, suffixTitle] = emphasisTitle ? title.split(emphasisTitle) : [title, ''];

  return (
    <section id={id} className={cn('block-section', className)}>
      {/* Header */}
      <div className="mb-12 text-center md:mb-16">
        <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
          {prefixTitle}
          {emphasisTitle && <span className="text-primary font-extrabold">{emphasisTitle}</span>}
          {suffixTitle}
        </h2>
        {description && (
          <p className="text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed md:text-xl">{description}</p>
        )}
      </div>

      {/* Use Cases Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              'group relative rounded-2xl p-6 md:p-8',
              'bg-card/50 border border-border/50',
              'hover:border-border transition-all duration-300',
              'hover:shadow-lg hover:shadow-primary/5',
              'hover:-translate-y-1'
            )}
          >
            {/* Icon and Title */}
            <div className="mb-4">
              {/* Icon */}
              <div className="mb-4">
                <div className={cn(
                  'inline-flex h-14 w-14 items-center justify-center',
                  'bg-primary/10 text-primary rounded-xl',
                  'group-hover:bg-primary group-hover:text-primary-foreground',
                  'transition-all duration-300 group-hover:scale-110'
                )}>
                  <Icon config={item.icon} className="h-7 w-7" />
                </div>
              </div>

              {/* Title */}
              <h3 className={cn(
                'text-xl font-semibold mb-2 md:text-2xl',
                'group-hover:text-primary transition-colors duration-300'
              )}>
                {item.title}
              </h3>
            </div>

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed mb-4">
              {item.description}
            </p>

            {/* Stats Badge */}
            {item.stats && (
              <div className="mt-auto pt-4 border-t border-border/50">
                <span className={cn(
                  'inline-flex items-center px-3 py-1 rounded-full',
                  'bg-primary/10 text-primary text-sm font-medium',
                  'group-hover:bg-primary group-hover:text-primary-foreground',
                  'transition-all duration-300'
                )}>
                  {item.stats}
                </span>
              </div>
            )}

            {/* Decorative gradient line */}
            <div className={cn(
              'absolute bottom-0 left-6 right-6 h-0.5',
              'bg-gradient-to-r from-transparent via-primary/30 to-transparent',
              'opacity-0 group-hover:opacity-100',
              'transition-opacity duration-300'
            )} />
          </div>
        ))}
      </div>
    </section>
  );
}