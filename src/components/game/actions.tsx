'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getGameShareUrl } from '@/lib/game-links';
import ReportDialog from '@/components/report/dialog';
import MdiThumbUp from '~icons/mdi/thumb-up';
import MdiThumbUpOutline from '~icons/mdi/thumb-up-outline';
import MdiThumbDown from '~icons/mdi/thumb-down';
import MdiThumbDownOutline from '~icons/mdi/thumb-down-outline';
import MdiBookmark from '~icons/mdi/bookmark';
import MdiBookmarkOutline from '~icons/mdi/bookmark-outline';
import MdiShare from '~icons/mdi/share-variant';
import MdiFlag from '~icons/mdi/flag';

interface GameActionsProps {
  gameUuid: string;
  gameName: string;
  gameSlug: string;
  initialUpvoteCount?: number;
  initialDownvoteCount?: number;
  initialSaveCount?: number;
  initialShareCount?: number;
  className?: string;
}

export default function GameActions({
  gameUuid,
  gameName,
  gameSlug,
  initialUpvoteCount = 0,
  initialDownvoteCount = 0,
  initialSaveCount = 0,
  initialShareCount = 0,
  className,
}: GameActionsProps) {
  const t = useTranslations('biz.game');
  const [upvoted, setUpvoted] = useState(false);
  const [downvoted, setDownvoted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(initialUpvoteCount);
  const [downvoteCount, setDownvoteCount] = useState(initialDownvoteCount);
  const [saveCount, setSaveCount] = useState(initialSaveCount);
  const [shareCount, setShareCount] = useState(initialShareCount);
  const [isLoading, setIsLoading] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const handleInteraction = async (action: string) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/games/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_uuid: gameUuid,
          action,
        }),
      });

      const data = (await response.json()) as any;

      if (response.ok && data?.game) {
        // Update counts from server response
        setUpvoteCount(data.game.upvote_count);
        setDownvoteCount(data.game.downvote_count);
        setSaveCount(data.game.save_count);
        setShareCount(data.game.share_count);
      } else {
        // Handle error (e.g., show toast notification)
        console.error('Interaction failed:', data?.message);
      }
    } catch (error) {
      console.error('Interaction error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpvote = () => {
    if (downvoted) {
      // Cancel downvote first
      handleInteraction('cancel_downvote');
      setDownvoted(false);
    }

    if (upvoted) {
      handleInteraction('cancel_upvote');
      setUpvoted(false);
    } else {
      handleInteraction('upvote');
      setUpvoted(true);
    }
  };

  const handleDownvote = () => {
    if (upvoted) {
      // Cancel upvote first
      handleInteraction('cancel_upvote');
      setUpvoted(false);
    }

    if (downvoted) {
      handleInteraction('cancel_downvote');
      setDownvoted(false);
    } else {
      handleInteraction('downvote');
      setDownvoted(true);
    }
  };

  const handleSave = () => {
    if (saved) {
      handleInteraction('cancel_save');
      setSaved(false);
    } else {
      handleInteraction('save');
      setSaved(true);
    }
  };

  const handleShare = async () => {
    await handleInteraction('share');

    // Native share or copy to clipboard
    // Use centralized game link utility (fixes bug: was using gameUuid instead of gameSlug)
    const shareUrl = getGameShareUrl(gameSlug);

    if (navigator.share) {
      try {
        await navigator.share({
          title: gameName,
          text: t('share_text', { name: gameName }),
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or error
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        // Show toast: "Link copied to clipboard"
        alert(t('link_copied'));
      } catch (error) {
        console.error('Copy to clipboard failed:', error);
      }
    }
  };

  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
      {/* Upvote */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={handleUpvote}
          disabled={isLoading}
          className={cn('rounded-full transition-colors', upvoted && 'border-primary bg-primary/10 text-primary')}
          aria-label={t('upvote')}
        >
          {upvoted ? <MdiThumbUp className="size-5" /> : <MdiThumbUpOutline className="size-5" />}
        </Button>
        <span className="text-muted-foreground text-xs">{upvoteCount}</span>
      </div>

      {/* Downvote */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={handleDownvote}
          disabled={isLoading}
          className={cn(
            'rounded-full transition-colors',
            downvoted && 'border-destructive bg-destructive/10 text-destructive',
          )}
          aria-label={t('downvote')}
        >
          {downvoted ? <MdiThumbDown className="size-5" /> : <MdiThumbDownOutline className="size-5" />}
        </Button>
        <span className="text-muted-foreground text-xs">{downvoteCount}</span>
      </div>

      {/* Save */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={handleSave}
          disabled={isLoading}
          className={cn('rounded-full transition-colors', saved && 'border-primary bg-primary/10 text-primary')}
          aria-label={t('save')}
        >
          {saved ? <MdiBookmark className="size-5" /> : <MdiBookmarkOutline className="size-5" />}
        </Button>
        <span className="text-muted-foreground text-xs">{saveCount}</span>
      </div>

      {/* Share */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={handleShare}
          disabled={isLoading}
          className="hover:border-primary hover:bg-primary/10 hover:text-primary rounded-full transition-colors"
          aria-label={t('share')}
        >
          <MdiShare className="size-5" />
        </Button>
        <span className="text-muted-foreground text-xs">{shareCount}</span>
      </div>

      {/* Report */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setReportDialogOpen(true)}
          disabled={isLoading}
          className="hover:border-destructive hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors"
          aria-label={t('report')}
        >
          <MdiFlag className="size-5" />
        </Button>
        <span className="text-muted-foreground text-xs">{t('report')}</span>
      </div>

      {/* Report Dialog */}
      <ReportDialog
        gameUuid={gameUuid}
        gameName={gameName}
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
      />
    </div>
  );
}
