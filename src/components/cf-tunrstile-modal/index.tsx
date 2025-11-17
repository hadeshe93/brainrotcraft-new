/**
 * 非交互式的 Turnstile 组件，无需用户点击，而且是以 Modal 的形式出现
 */
'use client';

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { renderTurnstileWidget } from '@/lib/turnstile';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ETurnstileErrorCode } from '@/types/services/errors';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface ResolvedResult {
  success: boolean;
  message: string;
  data?: {
    token: string;
  };
  errorCode?: ETurnstileErrorCode;
}

interface TurnstileModalProps {
  sitekey: string;
  theme?: 'light' | 'dark' | 'auto';
  title?: string;
  description?: string;
}

export interface TurnstileModalRef {
  render: (props: TurnstileModalProps) => Promise<ResolvedResult>;
}

const SHOW_TURNSTILE_TIMEOUT = 2000;

const TurnstileModal = forwardRef<TurnstileModalRef>((_, ref) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const currentPropsRef = useRef<TurnstileModalProps | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const resolveRef = useRef<((result: ResolvedResult) => void) | null>(null);
  const handleSuccessRef = useRef<((token: string) => void) | null>(null);
  const handleErrorRef = useRef<((error: string) => void) | null>(null);
  const tTurnstile = useTranslations('turnstile');

  // 使用 useImperativeHandle 暴露 render 方法
  useImperativeHandle(
    ref,
    () => ({
      render: async (props: TurnstileModalProps): Promise<ResolvedResult> => {
        return new Promise(async (resolve) => {
          // 检查是否已有弹窗打开
          if (isVisible) {
            resolve({
              success: false,
              message: tTurnstile('anotherVerificationInProgress'),
              errorCode: ETurnstileErrorCode.VERIFICATION_IN_PROGRESS,
            });
            return;
          }

          // 检查必要参数
          if (!props.sitekey) {
            resolve({
              success: false,
              message: tTurnstile('sitekeyRequired'),
              errorCode: ETurnstileErrorCode.SITEKEY_REQUIRED,
            });
            return;
          }

          // 设置状态和开始渲染
          currentPropsRef.current = props;
          setIsVisible(true);
          setIsLoading(true);
          resolveRef.current = resolve;

          // 延迟渲染 Turnstile，确保 DOM 已挂载
          await new Promise((resolve) => setTimeout(resolve, 100));
          renderTurnstileComponent();
        });
      },
    }),
    [isVisible],
  );

  const renderTurnstileComponent = async () => {
    if (!turnstileContainerRef.current || !currentPropsRef.current) {
      resolveWithError(tTurnstile('containerNotFound'), ETurnstileErrorCode.CONTAINER_NOT_FOUND);
      return;
    }

    try {
      // 清理之前的 widget
      if (widgetIdRef.current) {
        try {
          (window as any).turnstile?.remove(widgetIdRef.current);
        } catch (error) {
          console.warn('Failed to remove previous widget:', error);
        }
      }

      // 清空容器
      turnstileContainerRef.current.innerHTML = '';

      // 创建新的容器元素
      const widgetElement = document.createElement('div');
      widgetElement.id = `turnstile-widget-${Date.now()}`;
      turnstileContainerRef.current.appendChild(widgetElement);

      // 渲染 Turnstile widget
      const widgetId = await renderTurnstileWidget({
        widgetSelector: `#${widgetElement.id}`,
        sitekey: currentPropsRef.current.sitekey,
        onSuccess: (token: string) => {
          handleSuccessRef.current?.(token);
        },
        onError: (error: string) => {
          handleErrorRef.current?.(error);
        },
      });
      // 等 500ms 完成挑战
      await new Promise((resolve) => setTimeout(resolve, 500));
      widgetIdRef.current = widgetId;
      setIsLoading(false);
    } catch (error) {
      resolveWithError(
        error instanceof Error ? error.message : tTurnstile('verificationLoadFailed'),
        ETurnstileErrorCode.VERIFICATION_LOAD_FAILED,
      );
    }
  };

  const handleSuccess = (token: string) => {
    console.log('🎉 Turnstile verification successful');
    resolveWithSuccess(token);
  };

  const handleError = (error: string) => {
    console.error('❌ Turnstile verification failed:', error);
    resolveWithError(`${tTurnstile('verificationFailed')}: ${error}`, ETurnstileErrorCode.VERIFICATION_FAILED);
  };

  const resolveWithSuccess = async (token: string) => {
    const result: ResolvedResult = {
      success: true,
      message: 'Verification completed successfully', // 这个消息通常不会显示给用户，可以保持英文
      data: { token },
    };

    await new Promise((resolve) => setTimeout(resolve, SHOW_TURNSTILE_TIMEOUT));
    if (resolveRef.current) {
      resolveRef.current(result);
    }

    cleanup();
  };

  const resolveWithError = async (message: string, errorCode: ETurnstileErrorCode) => {
    const result: ResolvedResult = {
      success: false,
      message,
      errorCode,
    };

    // 如果是用户手动关闭，那么不需要延迟
    if (errorCode !== ETurnstileErrorCode.USER_CANCELLED_VERIFICATION) {
      await new Promise((resolve) => setTimeout(resolve, SHOW_TURNSTILE_TIMEOUT));
    }

    if (resolveRef.current) {
      resolveRef.current(result);
    }

    cleanup();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // 用户关闭了弹窗
      resolveWithError(tTurnstile('userCancelledVerification'), ETurnstileErrorCode.USER_CANCELLED_VERIFICATION);
    }
  };

  const cleanup = () => {
    setIsVisible(false);
    setIsLoading(false);
    currentPropsRef.current = null;
    resolveRef.current = null;

    // 清理 widget
    if (widgetIdRef.current && (window as any).turnstile) {
      try {
        (window as any).turnstile.remove(widgetIdRef.current);
      } catch (error) {
        console.warn('Failed to remove Turnstile widget:', error);
      }
      widgetIdRef.current = null;
    }
  };

  useEffect(() => {
    handleSuccessRef.current = handleSuccess;
    handleErrorRef.current = handleError;
  }, [handleSuccess, handleError]);

  return (
    <Dialog open={isVisible} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{currentPropsRef.current?.title || tTurnstile('title')}</DialogTitle>
          <DialogDescription>{currentPropsRef.current?.description || tTurnstile('description')}</DialogDescription>
        </DialogHeader>

        {/* Turnstile 容器 */}
        <div className="py-4">
          <div
            ref={turnstileContainerRef}
            className={cn('mx-auto flex items-center justify-center', !isLoading ? 'min-h-[65px]' : '')}
          />
          {isLoading ? (
            <div className="flex h-16 items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                <span className="text-muted-foreground text-sm">{tTurnstile('loadingVerification')}</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* 底部提示 */}
        <div className="pb-2">
          <p className="text-muted-foreground text-center text-xs">{tTurnstile('protectedByCloudflareTurnstile')}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
});

TurnstileModal.displayName = 'TurnstileModal';

export default TurnstileModal;
