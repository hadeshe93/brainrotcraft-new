import GameCard, { type GameCardProps } from './card';
import { cn } from '@/lib/utils';

interface GameGridProps {
  games: GameCardProps['game'][];
  className?: string;
}

export default function GameGrid({ games, className }: GameGridProps) {
  if (!games || games.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        <p>No games found.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        // Responsive grid layout
        // Mobile: 1-2 columns
        // Tablet: 2-3 columns
        // Desktop: 4 columns
        'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        className,
      )}
    >
      {games.map((game) => (
        <GameCard key={game.uuid} game={game} />
      ))}
    </div>
  );
}
