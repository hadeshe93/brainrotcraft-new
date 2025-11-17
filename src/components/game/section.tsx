import GameGrid from './grid';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { GameCardProps } from './card';

interface GameSectionProps {
  title: string;
  games: GameCardProps['game'][];
  moreLink?: {
    url: string;
    text?: string;
  };
  className?: string;
}

export default function GameSection({ title, games, moreLink, className }: GameSectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-2xl font-bold md:text-3xl">{title}</h2>
        {moreLink && (
          <Link
            href={moreLink.url}
            className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm font-medium transition-colors md:text-base"
          >
            {moreLink.text || ''} →
          </Link>
        )}
      </div>

      {/* Games Grid */}
      <GameGrid games={games} />
    </section>
  );
}
