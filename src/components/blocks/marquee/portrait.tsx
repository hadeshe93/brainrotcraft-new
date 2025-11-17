import { cn } from '@/lib/utils';
import { Marquee } from '@/components/ui/marquee';
import type { MarqueePortrait } from '@/types/blocks/marquee';
import Image from '@/components/image';

const ReviewCard = ({ url, alt }: { url: string; alt?: string }) => {
  return <Image className="w48 relative h-64 rounded-none object-cover" alt={alt} src={url} loading='lazy' />;
};

interface MarqueePortraitProps {
  config: MarqueePortrait;
  className?: string;
}

export function MarqueePortrait({ className, config }: MarqueePortraitProps) {
  const { id, title, emphasisTitle = '', description, items } = config;
  const [prefixTitle, suffixTitle] = emphasisTitle ? title.split(emphasisTitle) : [title, ''];
  const halfLength = items.length / 2;
  const firstRow = items.slice(0, halfLength);
  const secondRow = items.slice(halfLength);

  return (
    <section id={id} className={cn('block-section', className)}>
      {/* 主标题 */}
      <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl text-center">
        {prefixTitle}
        {emphasisTitle && <span className="text-primary font-extrabold">{emphasisTitle}</span>}
        {suffixTitle}
      </h2>

      {/* 描述文本 */}
      {description && (
        <p className="mb-12 text-center text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed md:text-xl">{description}</p>
      )}

      {/* 内容 */}
      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
        <Marquee pauseOnHover className="[--duration:20s]">
          {firstRow.map((review, index) => (
            <ReviewCard key={index} {...review.image} />
          ))}
        </Marquee>
        <Marquee reverse pauseOnHover className="[--duration:20s]">
          {secondRow.map((review, index) => (
            <ReviewCard key={index} {...review.image} />
          ))}
        </Marquee>
        <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r"></div>
        <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l"></div>
      </div>
    </section>
  );
}
