'use client';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Embed as EmbedType } from '@/types/blocks/embed';
import ShareList from '@/components/share/list';
import { useTranslations } from 'next-intl';

export interface EmbedProps {
  config: EmbedType;
}
export function Embed({ config }: EmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const tBiz = useTranslations(`biz.${config.key}`);
  return (
    <>
      <iframe
        ref={iframeRef}
        src={tBiz('iframe_url')}
        // @ts-ignore
        allowtransparency="true"
        webkitallowfullscreen="true"
        mozallowfullscreen="true"
        allow="autoplay; fullscreen *; geolocation; microphone; camera; midi; monetization; xr-spatial-tracking; gamepad; gyroscope; accelerometer; xr; cross-origin-isolated; web-share"
        frameborder="0"
        allowfullscreen="true"
        // scrolling="no"
        scrolling="auto"
        id="game_drop"
        msallowfullscreen="true"
        width="100%"
        height="600px"
        className={cn('mx-auto w-full')}
      ></iframe>
      <ShareList i18nText={{ title: tBiz('share_title') }} className="mt-4 rounded-lg px-6 py-1" />
    </>
  );
}
