'use client';

import { cn } from '@/lib/utils';
import { CompareShowcase as CompareShowcaseType } from '@/types/blocks/compare-showcase';
import Image from '@/components/image';
import { ReactCompareSlider, ReactCompareSliderHandle } from 'react-compare-slider';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

interface CompareShowcaseProps {
  config: CompareShowcaseType;
  className?: string;
}

export default function CompareShowcase({ className, config }: CompareShowcaseProps) {
  const { id, title, emphasisTitle = '', description, items } = config;
  const [prefixTitle, suffixTitle] = emphasisTitle ? title.split(emphasisTitle) : [title, ''];
  const tCTA = useTranslations('biz.cta');
  return (
    <section id={id} className={cn('block-section !my-0 !max-w-2xl !py-0', className)}>
      {/* 头部内容 */}
      <div className="mb-4 text-left md:mb-6">
        {/* 主标题 */}
        <h2 className="text-2xl font-bold tracking-tight">
          {prefixTitle}
          {emphasisTitle && <span className="text-primary font-extrabold">{emphasisTitle}</span>}
          {suffixTitle}
        </h2>

        {/* 描述文本 */}
        {description && (
          <p className="text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed">{description}</p>
        )}
      </div>

      {/* 对比展示 */}
      <div className="mb-8 grid grid-cols-2 gap-6 sm:grid-cols-2 lg:gap-8">
        {items?.map((item, index) => (
          <div key={index} className="w-full">
            <ReactCompareSlider
              className="mb-4 aspect-[4/3] w-full overflow-hidden rounded-xl shadow-xl"
              handle={
                <ReactCompareSliderHandle
                  linesStyle={{
                    background: 'none',
                    border: 'none',
                    boxShadow: 'none',
                  }}
                  buttonStyle={{
                    width: '40px',
                    height: '40px',
                  }}
                />
              }
              itemOne={
                <Image
                  src={item.images[0].url}
                  alt={item.images[0].alt}
                  loading="lazy"
                  widthSet={[400, 500, 620]}
                  widthSizes={{
                    maxSm: '100vw',
                    maxLg: '50vw',
                    maxXl: '33vw',
                    default: '25vw',
                  }}
                  className="h-full w-full object-cover"
                />
              }
              itemTwo={
                <Image
                  src={item.images[1].url}
                  alt={item.images[1].alt}
                  loading="lazy"
                  widthSet={[400, 500, 620]}
                  widthSizes={{
                    maxSm: '100vw',
                    maxLg: '50vw',
                    maxXl: '33vw',
                    default: '25vw',
                  }}
                  className="transparent-grid h-full w-full object-cover"
                />
              }
            />
            {item.title && <h4 className="text-center text-lg font-medium">{item.title}</h4>}
          </div>
        ))}
      </div>

      {/* CTA */}
      <Link href="/#hero" className="cta-link-button">
        {tCTA('cta_try_biz')}
      </Link>
    </section>
  );
}
