/**
 * 交互式的 Turnstile 组件，需要用户点击
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { CF_TURNSTILE_SITEKEY } from '@/constants/config';
import { renderTurnstileWidget } from '@/lib/turnstile';

interface CfTurnstileProps {
  onChange?: (token: string) => void;
  sitekey?: string;
}

export default function CfTurnstile({ sitekey = CF_TURNSTILE_SITEKEY, onChange }: CfTurnstileProps) {
  const initializedRef = useRef<boolean>(false);
  const widgetIdRef = useRef<string>('');
  const onChangeRef = useRef<((token: string) => void) | null>(null);
  const loadWidget = useCallback(async () => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      widgetIdRef.current = await renderTurnstileWidget({
        widgetSelector: '#cf-turnstile',
        sitekey,
        onSuccess: (token) => {
          onChangeRef.current?.(token);
        },
        onError: (error) => {
          console.error('[CfTurnstile] error:', error);
        },
      });
    }
  }, [sitekey]);

  const unloadWidget = useCallback(() => {
    if (initializedRef.current && window.turnstile && widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current);
      initializedRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadWidget();
    return () => {
      unloadWidget();
    };
  }, []);

  useEffect(() => {
    if (onChange) {
      onChangeRef.current = onChange;
    }
  }, [onChange]);

  return (
    <div id="cf-turnstile" className="cf-turnstile" data-sitekey={sitekey}></div>
  );
}
