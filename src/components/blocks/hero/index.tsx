import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Hero as HeroType } from '@/types/blocks/hero';
import MdiStarsOutline from '~icons/mdi/stars-outline';
import Icon from '@/components/icon';
import Image from '@/components/image';

interface HeroProps {
  config: HeroType;
  className?: string;
}

const BADGE_COLORS = [
  'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', 
  'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
];
const ICON_STARS_OUTLINE_CONFIG = {
  name: 'MdiStarsOutline',
};
export default function Hero({ className, config }: HeroProps) {
  const { title, emphasisTitle } = config;
  const [prefixTitle, suffixTitle] = !!emphasisTitle && title.includes(emphasisTitle) 
    ? title.split(emphasisTitle) 
    : [title, ''];
  
  // If title is empty, just show emphasisTitle
  const showTitle = title || emphasisTitle;
  
  return (
    <section className={cn('block-section', 'text-center', className)}>
      <div className="flex flex-col items-center justify-center">
        {/* Main Title */}
        <div className="flex items-center justify-center gap-4">
          <Image widthSet={[48, 56]} widthSizes={{default: '48px', minMd: '56px'}} src={config.logo.url} alt={config.logo.alt || ''} className="size-12 md:size-14 rounded-2xl shadow-lg" />
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gold-gradient">
            {!title && emphasisTitle ? (
              // If title is empty, just show emphasisTitle
              <span className="font-extrabold">{emphasisTitle}</span>
            ) : (
              // Normal rendering with prefix and suffix
              <>
                {prefixTitle}
                <span className="font-extrabold">{emphasisTitle}</span>
                {suffixTitle}
              </>
            )}
          </h1>
        </div>

        {/* Primary Description */}
        <p className="mt-6 text-xl md:text-2xl text-foreground max-w-2xl leading-relaxed">
          {config.primaryDescription}
        </p>

        {/* Secondary Description */}
        <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-xl flex items-center justify-center gap-2">
          <Icon config={ICON_STARS_OUTLINE_CONFIG} className="size-8 text-primary" />
          <span>{config.secondaryDescription}</span>
          <Icon config={ICON_STARS_OUTLINE_CONFIG} className="size-8 text-primary" />
        </p>

        {/* Feature Badges */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:gap-3 pt-4">
                     {
             config.badges?.map((badge, index) => {
               const colorClassName = BADGE_COLORS[index % BADGE_COLORS.length];
               return (
                 <Badge key={index} variant="outline" className={cn('rounded-full px-4 py-1', colorClassName)}>
                   {badge.title}
                 </Badge>
               )
             })
           }
        </div>
      </div>
    </section>
  );
}
