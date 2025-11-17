'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import Icon from '@/components/icon';
import { downloadFromUrl, generateFriendlyFilename } from '@/lib/download';

interface DownloadButtonProps {
  /** 下载的图片 URL */
  url: string;
  /** 文件名 */
  filename?: string;
  /** 额外的 CSS 类名 */
  className?: string;
  disabled?: boolean;
  /** 按钮文本 */
  children?: React.ReactNode;
  /** 下载成功回调 */
  onSuccess?: () => void;
  onFailed?: (error: Error) => void;
  onClick?: () => void;
}

type DownloadState = 'idle' | 'downloading' | 'success' | 'error';

export default function DownloadButton({
  url,
  filename,
  className,
  children = 'Download',
  disabled = false,
  onClick,
  onSuccess,
  onFailed,
}: DownloadButtonProps) {
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');

  const handleDownload = async () => {
    if (downloadState === 'downloading') {
      return; // 防止重复点击
    }
    onClick?.();
    setDownloadState('downloading');
    console.log('🔗 下载的 URL:', url);
    try {
      // 生成文件名
      const finalFilename = filename ? filename : undefined;

      // 执行下载
      const success = await downloadFromUrl({
        url,
        filename: finalFilename,
      });

      if (success) {
        setDownloadState('success');
        onSuccess?.();

        // 2秒后重置状态
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setDownloadState('idle');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      setDownloadState('error');
      onFailed?.(error as Error);

      // 3秒后重置状态
      await new Promise((resolve) => setTimeout(resolve, 3000));
      setDownloadState('idle');
    }
  };

  const getIconConfig = () => {
    switch (downloadState) {
      case 'downloading':
        return { name: 'EosIconsLoading' as const };
      case 'success':
        return { name: 'MdiCheck' as const };
      case 'error':
        return { name: 'MdiClose' as const };
      default:
        return null;
    }
  };

  const getButtonText = () => {
    return children;
  };

  const getButtonStyles = () => {
    const baseStyles =
      'inline-flex justify-center items-center gap-2 rounded-md px-3 py-1 text-sm transition-all duration-200 font-medium';

    switch (downloadState) {
      case 'downloading':
        return cn(baseStyles, 'bg-blue-100 text-blue-800 cursor-not-allowed', 'dark:bg-blue-900/30 dark:text-blue-300');
      case 'success':
        return cn(baseStyles, 'bg-green-100 text-green-800 cursor-default', 'dark:bg-green-900/30 dark:text-green-300');
      case 'error':
        return cn(
          baseStyles,
          'bg-red-100 text-red-800 cursor-pointer hover:bg-red-200',
          'dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50',
        );
      default:
        return cn(
          baseStyles,
          disabled ? 'bg-primary/80' : 'bg-primary hover:bg-primary/90',
          'text-primary-foreground cursor-pointer',
        );
    }
  };

  const iconConfig = getIconConfig();
  const isDisabled = downloadState === 'downloading' || downloadState === 'success';

  return (
    <button
      className={cn('text-center', getButtonStyles(), className)}
      onClick={handleDownload}
      disabled={isDisabled || disabled}
      type="button"
      aria-label={`Download ${filename || 'file'}`}
    >
      {iconConfig ? (
        <Icon config={iconConfig} className={cn('size-5', downloadState === 'downloading' && 'animate-spin')} />
      ) : (
        getButtonText()
      )}
    </button>
  );
}
