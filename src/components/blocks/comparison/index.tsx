import { cn } from '@/lib/utils';
import { Comparison as ComparisonType } from '@/types/blocks/comparison';
import { Check, X } from 'lucide-react';
import Image from '@/components/image';
interface ComparisonProps {
  config: ComparisonType;
  className?: string;
}

export default function Comparison({ className, config }: ComparisonProps) {
  const { id, title, emphasisTitle = '', description, items } = config;
  const [prefixTitle, suffixTitle] = emphasisTitle ? title.split(emphasisTitle) : [title, ''];

  return (
    <section id={id} className={cn('block-section space-y-6', className)}>
      {/* Header */}
      <div className="text-center">
        <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
          {prefixTitle}
          {emphasisTitle && <span className="text-primary font-extrabold">{emphasisTitle}</span>}
          {suffixTitle}
        </h2>
        {description && (
          <p className="text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed md:text-xl">{description}</p>
        )}
      </div>

      {/* Optional Image */}
      {config.img?.url && (
        <div className="flex justify-center">
          <Image
            widthSet={[320, 544, 640, 800]}
            widthSizes={{
              default: '320px',
              minSm: '544px',
              minMd: '640px',
              minLg: '800px',
            }}
            src={config.img.url}
            alt={config.img.alt || 'Comparison chart'}
            className="rounded-xl shadow-lg object-contain w-[20rem] sm:w-[34rem] md:w-[40rem] lg:w-[50rem]"
            loading='lazy'
          />
        </div>
      )}

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              'relative rounded-2xl p-6 md:p-8',
              'border transition-all duration-300',
              item.featured
                ? 'bg-primary/5 border-primary shadow-lg scale-105'
                : 'bg-card/50 border-border/50 hover:border-border',
            )}
          >
            {/* Featured Badge */}
            {item.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                  RECOMMENDED
                </span>
              </div>
            )}

            {/* Title */}
            <h3 className={cn(
              'text-xl font-semibold mb-6 text-center md:text-2xl',
              item.featured && 'text-primary'
            )}>
              {item.title}
            </h3>

            {/* Features List */}
            <div className="space-y-4">
              {item.features.map((feature, featureIndex) => (
                <div
                  key={featureIndex}
                  className={cn(
                    'flex items-start gap-3',
                    feature.highlight && 'font-medium'
                  )}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {feature.highlight ? (
                      <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-1">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                    ) : (
                      <div className="bg-muted rounded-full p-1">
                        <X className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Feature Text */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-muted-foreground">{feature.label}</div>
                    <div className={cn(
                      'text-base',
                      feature.highlight ? 'text-foreground font-medium' : 'text-muted-foreground'
                    )}>
                      {feature.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      
    </section>
  );
}