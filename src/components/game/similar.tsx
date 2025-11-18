'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import GameCard from '@/components/game/card';
import { cn } from '@/lib/utils';
import type { SimilarGame } from '@/types/game';

interface SimilarGamesProps {
  games: SimilarGame[];
  className?: string;
}

export default function SimilarGames({ games, className }: SimilarGamesProps) {
  const t = useTranslations('biz.game');

  if (!games || games.length === 0) {
    return null;
  }

  return (
    <section className={cn('space-y-4', className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-2xl font-bold">{t('similar_games')}</h2>
        <Link href="/new" className="text-primary hover:text-primary/80 text-sm font-medium transition-colors">
          {t('more_new_games')} →
        </Link>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {games.map((game) => (
          <GameCard key={game.uuid} game={game} />
        ))}
      </div>
    </section>
  );
}
