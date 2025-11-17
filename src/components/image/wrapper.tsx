'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import Icon from '@/components/icon';
import DownloadButton from '@/components/blocks/download-button';
import ImagePreviewer from '@/components/blocks/previewer';

interface ImageWrapperProps {
  children: React.ReactNode;
  /** 图片URL用于下载 */
  imageUrl?: string;
  /** 下载文件名 */
  filename?: string;
  /** 点击预览回调 */
  onPreview?: () => void;
  /** 额外的 CSS 类名 */
  className?: string;
  /** 是否显示操作按钮 */
  showActions?: boolean;
}

export default function ImageWrapper({
  children,
  imageUrl,
  filename,
  onPreview,
  className,
  showActions = true,
}: ImageWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn('relative group inline-block', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}

      {/* 操作按钮容器 - 绝对定位在右下角 */}
      {showActions && (
        <div className={cn(
          'absolute bottom-2 right-2 flex gap-2',
        )}>
          <ImagePreviewer src={imageUrl!} className="flex h-full w-full items-center justify-center">
          {/* 预览按钮 - 圆形 */}
          <button
            onClick={onPreview}
            className={cn(
              'size-8 rounded-full border border-foreground bg-foreground/20 flex justify-center items-center'
            )}
            aria-label="Preview image"
            type="button"
          >
            <Icon
              config={{ name: 'MdiEye' }}
              className="size-4 text-foreground"
            />
          </button>
          </ImagePreviewer>

          {/* 下载按钮 - 圆形（如果提供了imageUrl） */}
          {imageUrl && (
            <DownloadButton
              url={imageUrl}
              filename={filename}
              className={cn(
                '!flex !size-8 !p-0 shrink-0 rounded-full'
              )}
            >
              <Icon
                config={{ name: 'MdiDownload' }}
                className="size-5"
              />
            </DownloadButton>
          )}
        </div>
      )}
    </div>
  );
}