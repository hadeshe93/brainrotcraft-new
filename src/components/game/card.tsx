import { Link } from '@/i18n/navigation';
import Image from '@/components/image';
import { cn } from '@/lib/utils';
import { getGamePath } from '@/lib/game-links';
import type { SimilarGame } from '@/types/game';

export interface GameCardProps {
  game: SimilarGame;
  className?: string;
}

export default function GameCard({ game, className }: GameCardProps) {
  return (
    <Link href={getGamePath(game.slug)} className={cn('group block', className)}>
      <div className="bg-card hover:bg-accent/10 overflow-hidden rounded-lg shadow-sm transition-all duration-200 hover:shadow-md">
        {/* Game Thumbnail */}
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={game.thumbnail}
            alt={game.name}
            width={300}
            height={200}
            quality={85}
            format="auto"
            widthSet={[300, 600]} // Responsive image sizes
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
          {/* Optional: Show rating badge */}
          {game.rating !== undefined && game.rating > 0 && (
            <div className="bg-background/80 absolute top-2 right-2 rounded-md px-2 py-1 text-xs font-semibold backdrop-blur-sm">
              ⭐ {game.rating.toFixed(1)}
            </div>
          )}
        </div>

        {/* Game Name */}
        <div className="p-3">
          <h3 className="text-foreground group-hover:text-primary line-clamp-2 text-sm font-medium">{game.name}</h3>
          {/* Optional: Show interaction count */}
          {false && game.interact !== undefined && game.interact! > 0 && (
            <p className="text-muted-foreground mt-1 text-xs">{game.interact!.toLocaleString()} plays</p>
          )}
        </div>
      </div>
    </Link>
  );
}
