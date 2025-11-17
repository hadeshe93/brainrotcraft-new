'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import Icon from '@/components/icon';

interface ImagePreviewerProps {
  /** 图片 URL */
  src: string;
  /** 图片 alt 文本 */
  alt?: string;
  /** 触发预览的子元素 */
  children: React.ReactNode;
  /** 自定义样式类名 */
  className?: string;
}

export default function ImagePreviewer({ 
  src, 
  alt = 'Preview image', 
  children, 
  className 
}: ImagePreviewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 确保在客户端挂载后才渲染 Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // 防止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // 组件卸载时恢复滚动
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const openPreview = () => setIsOpen(true);
  const closePreview = () => setIsOpen(false);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closePreview();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closePreview();
    }
  };

  // 全屏浮层组件
  const PreviewModal = () => (
    <div
      className={cn(
        'fixed inset-0 z-[9999]', // 使用更高的 z-index
        'bg-black/80 backdrop-blur-sm',
        'flex items-center justify-center',
        'animate-in fade-in-0 duration-300'
      )}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* 关闭按钮 */}
      <button
        onClick={closePreview}
        className={cn(
          'absolute top-4 right-4 z-10',
          'p-2 rounded-full',
          'bg-black/50 hover:bg-black/70',
          'text-white hover:text-white',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-white/50'
        )}
        aria-label="Close preview"
      >
        <Icon 
          config={{ name: 'MdiClose' }} 
          className="size-6 text-white" 
        />
      </button>

      {/* 预览图片 */}
      <div className="relative w-[90vw] h-[90vh] p-4">
        <img
          src={src}
          alt={alt}
          className={cn(
            'block mx-auto',
            'max-w-full max-h-full',
            'object-contain',
            'rounded-lg shadow-2xl',
            'animate-in zoom-in-95 duration-300'
          )}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* 触发元素 */}
      <div onClick={openPreview} className={cn('cursor-pointer', className)}>
        {children}
      </div>

      {/* 使用 Portal 渲染全屏浮层到 document.body */}
      {isOpen && mounted && createPortal(<PreviewModal />, document.body)}
    </>
  );
}
