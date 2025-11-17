import { cn } from '@/lib/utils';
import { HowItWorks as HowItWorksType } from '@/types/blocks/how-it-works';
import { Check } from 'lucide-react';

interface HowItWorksProps {
  config: HowItWorksType;
  className?: string;
}

export default function HowItWorks({ className, config }: HowItWorksProps) {
  const { id, title, emphasisTitle = '', description, sections } = config;
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

      {/* Sections */}
      <div className="space-y-12 max-w-5xl mx-auto">
        {sections.map((section, index) => (
          <div
            key={index}
            className={cn(
              'relative rounded-2xl p-8 md:p-10',
              'bg-card/50 border border-border/50',
              'hover:border-border transition-all duration-300',
              'hover:shadow-lg hover:shadow-primary/5'
            )}
          >
            {/* Section Number */}
            <div className="absolute -top-4 -left-4 md:-top-5 md:-left-5">
              <div className="bg-primary text-primary-foreground w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-lg md:text-xl">
                {index + 1}
              </div>
            </div>

            {/* Section Title */}
            <h3 className="text-xl md:text-2xl font-semibold mb-4 text-foreground">
              {section.title}
            </h3>

            {/* Section Content */}
            <p className="text-muted-foreground leading-relaxed mb-6">
              {section.content}
            </p>

            {/* Features List */}
            {section.features && section.features.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 pt-6 border-t border-border/50">
                {section.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center gap-3">
                    <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-1 flex-shrink-0">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Optional Image */}
      {config.img?.url && (
        <div className="mt-12 flex justify-center">
          <img
            src={config.img.url}
            alt={config.img.alt || 'How it works illustration'}
            className="rounded-xl shadow-lg max-w-full"
          />
        </div>
      )}
    </section>
  );
}