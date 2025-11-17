"use client";

import { cn } from '@/lib/utils';
import { CTA as CTAType } from '@/types/blocks/cta';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

interface CTAProps {
  config: CTAType;
  className?: string;
}

export default function CTA({ className, config }: CTAProps) {
  const { 
    id,
    title, 
    emphasisTitle = '', 
    subtitle, 
    description, 
    primaryButton, 
    secondaryButton, 
    backgroundImage,
    features 
  } = config;
  
  const [prefixTitle, suffixTitle] = emphasisTitle ? title.split(emphasisTitle) : [title, ''];

  return (
    <section 
      id={id}
      className={cn(
        'relative block-section max-w-none overflow-hidden',
        'bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5',
        className
      )}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 -z-10">
        {backgroundImage && (
          <img
            src={backgroundImage.url}
            alt={backgroundImage.alt || 'CTA Background'}
            className="h-full w-full object-cover opacity-10"
          />
        )}
        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/90" />
        
        {/* 装饰性几何图形 */}
        <div className="absolute top-1/4 right-1/4 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 h-24 w-24 rounded-full bg-accent/15 blur-2xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        {/* 主标题 */}
        <div className="mb-6 space-y-2">
          <p className="text-primary font-semibold tracking-wide text-sm uppercase md:text-base">
            {subtitle}
          </p>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl xl:text-6xl">
            {prefixTitle}
            {emphasisTitle && (
              <span className="text-primary bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-extrabold">
                {emphasisTitle}
              </span>
            )}
            {suffixTitle}
          </h2>
        </div>

        {/* 描述文本 */}
        <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg leading-relaxed md:text-xl">
          {description}
        </p>

        {/* 特性列表 */}
        {features && features.length > 0 && (
          <div className="mb-8 flex flex-wrap justify-center gap-4 text-sm md:text-base">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-foreground/80">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        )}

        {/* 按钮组 */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          {/* 主要按钮 */}
          {primaryButton.url ? (
            <Link
              href={primaryButton.url}
              target={primaryButton.target || '_self'}
              className={cn(
                'group relative overflow-hidden rounded-xl px-8 py-4 font-semibold transition-all duration-300',
                'bg-primary text-primary-foreground shadow-lg',
                'hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                'text-base md:text-lg',
                primaryButton.className
              )}
            >
              <span className="relative z-10">{primaryButton.title}</span>
              {/* 悬浮效果 */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </Link>
          ) : (
            <button
              className={cn(
                'group relative overflow-hidden rounded-xl px-8 py-4 font-semibold transition-all duration-300',
                'bg-primary text-primary-foreground shadow-lg',
                'hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                'text-base md:text-lg',
                primaryButton.className
              )}
            >
              <span className="relative z-10">{primaryButton.title}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </button>
          )}

          {/* 次要按钮 */}
          {secondaryButton && (
            <>
              {secondaryButton.url ? (
                <Link
                  href={secondaryButton.url}
                  target={secondaryButton.target || '_self'}
                  className={cn(
                    'rounded-xl px-8 py-4 font-medium transition-all duration-300',
                    'border-2 border-border hover:border-primary',
                    'text-foreground hover:text-primary',
                    'hover:bg-primary/5',
                    'text-base md:text-lg',
                    secondaryButton.className
                  )}
                >
                  {secondaryButton.title}
                </Link>
              ) : (
                <button
                  className={cn(
                    'rounded-xl px-8 py-4 font-medium transition-all duration-300',
                    'border-2 border-border hover:border-primary',
                    'text-foreground hover:text-primary',
                    'hover:bg-primary/5',
                    'text-base md:text-lg',
                    secondaryButton.className
                  )}
                >
                  {secondaryButton.title}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}