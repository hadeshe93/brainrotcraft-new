'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Image from '@/components/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import GameActions from '@/components/game/actions';
import MdiFullscreen from '~icons/mdi/fullscreen';
import MdiFullscreenExit from '~icons/mdi/fullscreen-exit';

interface GameEmbedProps {
  gameUuid: string;
  gameName: string;
  gameUrl: string;
  thumbnail: string;
  initialUpvoteCount?: number;
  initialDownvoteCount?: number;
  initialSaveCount?: number;
  initialShareCount?: number;
  className?: string;
}

export default function GameEmbed({
  gameUuid,
  gameName,
  gameUrl,
  thumbnail,
  initialUpvoteCount = 0,
  initialDownvoteCount = 0,
  initialSaveCount = 0,
  initialShareCount = 0,
  className,
}: GameEmbedProps) {
  const t = useTranslations('biz.game');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        // Enter fullscreen
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  // Listen for fullscreen change events
  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };

  // Add/remove fullscreen change listener
  if (typeof window !== 'undefined') {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
  }

  return (
    <div ref={containerRef} className={cn('bg-background relative w-full', className)}>
      {/* Game iframe */}
      <div className="border-border relative aspect-video w-full overflow-hidden rounded-lg border bg-black">
        <iframe
          src={gameUrl}
          title={gameName}
          className="size-full"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
          allow="accelerometer; gyroscope; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>

      {/* Game info and actions */}
      <div className="mt-4 flex items-center justify-between gap-4">
        {/* Game thumbnail and name */}
        <div className="flex items-center gap-3">
          <div className="border-border relative size-12 flex-shrink-0 overflow-hidden rounded-md border">
            <Image src={thumbnail} alt={gameName} className="size-full object-cover" />
          </div>
          <h2 className="text-foreground line-clamp-2 text-lg font-semibold">{gameName}</h2>
        </div>

        {/* Fullscreen button and game actions */}
        <div className="flex items-center gap-3">
          {/* Fullscreen button */}
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handleFullscreen}
              aria-label={isFullscreen ? t('fullscreen_exit') : t('fullscreen_enter')}
              className="flex-shrink-0"
            >
              {isFullscreen ? <MdiFullscreenExit className="size-5" /> : <MdiFullscreen className="size-5" />}
            </Button>
            <span className="text-muted-foreground text-xs">&nbsp;</span>
          </div>

          {/* Game Actions */}
          <GameActions
            gameUuid={gameUuid}
            gameName={gameName}
            initialUpvoteCount={initialUpvoteCount}
            initialDownvoteCount={initialDownvoteCount}
            initialSaveCount={initialSaveCount}
            initialShareCount={initialShareCount}
          />
        </div>
      </div>
    </div>
  );
}
