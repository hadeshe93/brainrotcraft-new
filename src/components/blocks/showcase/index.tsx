"use client";

import { cn } from '@/lib/utils';
import { Showcase as ShowcaseType } from '@/types/blocks/showcase';
import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from '@/components/image';

interface ShowcaseProps {
  config: ShowcaseType;
  className?: string;
}

export default function Showcase({ className, config }: ShowcaseProps) {
  const { id, title, emphasisTitle = '', description, items } = config;
  const [prefixTitle, suffixTitle] = emphasisTitle ? title.split(emphasisTitle) : [title, ''];
  const t = useTranslations('showcase');
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    alt: string;
    title: string;
    description?: string;
  } | null>(null);

  return (
    <section id={id} className={cn('block-section', className)}>
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

      {/* Apple 风格作品画廊 - 优化 4:3 比例布局 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 lg:gap-8 xl:gap-10">
        {items.map((item, index) => (
          <div
            key={index}
            className="group relative cursor-pointer"
          >
            {/* 主图片容器 - 匹配 AI 生成图片 4:3 比例 */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
              <Image
                src={item.image.url}
                alt={item.image.alt || item.title}
                className={cn(
                  "h-full w-full object-cover transition-all duration-700 ease-out",
                  "group-hover:scale-110"
                )}
                loading='lazy'
                widthSet={[400, 500, 620]}
                widthSizes={{
                  maxSm: '100vw',
                  maxLg: '50vw',
                  maxXl: '33vw',
                  default: '25vw',
                }}
              />
              {/* <img
                src={item.image.url}
                alt={item.image.alt || item.title}
                className={cn(
                  "h-full w-full object-cover transition-all duration-700 ease-out",
                  "group-hover:scale-110"
                )}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              /> */}
              
              {/* Apple 式渐变遮罩 */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent",
                "opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              )} />
              
              {/* 悬浮信息层 */}
              <div className={cn(
                "absolute bottom-0 left-0 right-0 p-6 text-white",
                "transform translate-y-8 opacity-0 transition-all duration-500",
                "group-hover:translate-y-0 group-hover:opacity-100"
              )}>
                <h3 className="text-xl font-semibold mb-2 tracking-tight">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-white/90 text-sm leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>

              {/* 右上角特性标签 */}
              <div className={cn(
                "absolute top-4 right-4",
                "transform translate-x-8 opacity-0 transition-all duration-300 delay-75",
                "group-hover:translate-x-0 group-hover:opacity-100"
              )}>
                <div className="bg-white/20 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-medium">
                  {index % 2 === 0 ? t('pro_label') : t('fast_label')}
                </div>
              </div>

              {/* Apple 式光效 */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent",
                "opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                "pointer-events-none"
              )} />
            </div>

            {/* 底部精简标题 */}
            <div className="mt-4 text-center">
              <h4 className={cn(
                "text-lg font-medium text-foreground transition-colors duration-300",
                "group-hover:text-primary tracking-tight"
              )}>
                {item.title.split(' ')[0]} {/* 只显示第一个词，如 "Thunder" */}
              </h4>
              <p className="text-muted-foreground text-sm mt-1">
                {index % 2 === 0 ? t('pro_quality') : t('speed_mode')}
              </p>
            </div>

            {/* 点击区域 */}
            <button
              onClick={() => setSelectedImage({
                url: item.image.url,
                alt: item.image.alt || item.title,
                title: item.title,
                description: item.description
              })}
              className="absolute inset-0 z-10"
              aria-label={`${t('view_large_image')}: ${item.title}`}
            />

            {/* 高级阴影效果 */}
            <div className={cn(
              "absolute -inset-4 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-[2rem]",
              "opacity-0 transition-opacity duration-500 group-hover:opacity-100 -z-10",
              "blur-xl"
            )} />
          </div>
        ))}
      </div>

      {/* 如果没有作品，显示占位内容 */}
      {items.length === 0 && (
        <div className="text-center py-12 md:py-16">
          <div className="text-muted-foreground text-lg mb-4">暂无作品展示</div>
          <p className="text-muted-foreground text-sm">精彩作品即将上线，敬请期待</p>
        </div>
      )}

      {/* 全屏图片预览模态框 */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          {/* 关闭按钮 */}
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 md:h-12 md:w-12"
            aria-label={t('close_large_image')}
          >
            <X className="h-5 w-5 md:h-6 md:w-6" />
          </button>

          {/* 图片容器 */}
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg">
            <img
              src={selectedImage.url}
              alt={selectedImage.alt}
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />
            
            {/* 图片信息 */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 md:p-6">
              <h3 className="text-white text-lg font-semibold md:text-xl mb-2">
                {selectedImage.title}
              </h3>
              {selectedImage.description && (
                <p className="text-white/90 text-sm md:text-base leading-relaxed">
                  {selectedImage.description}
                </p>
              )}
            </div>
          </div>

          {/* 点击背景关闭 */}
          <div
            className="absolute inset-0 -z-10"
            onClick={() => setSelectedImage(null)}
          />
        </div>
      )}
    </section>
  );
}