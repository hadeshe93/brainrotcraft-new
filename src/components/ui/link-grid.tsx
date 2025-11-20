import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import Image from '@/components/image';

export interface LinkItem {
  uuid: string;
  name: string;
  slug: string;
  count?: number;
  iconUrl?: string | null;
}

interface LinkGridProps {
  items: LinkItem[];
  baseUrl: string; // e.g., '/category' or '/tag'
  className?: string;
}

export default function LinkGrid({ items, baseUrl, className }: LinkGridProps) {
  if (!items || items.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        <p>No items found.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        // Responsive grid layout - 5 columns on desktop, fewer on smaller screens
        'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
        className,
      )}
    >
      {items.map((item) => (
        <Link
          key={item.uuid}
          href={`${baseUrl}/${item.slug}`}
          className="bg-card hover:bg-accent/10 group border-border flex h-24 items-center justify-center rounded-lg border px-4 text-center shadow-sm transition-all duration-200 hover:shadow-md"
        >
          <div className="flex flex-col items-center gap-1">
            {item.iconUrl && (
              <Image src={item.iconUrl} alt={item.name} width={40} height={40} className="size-8 object-contain" />
            )}
            <span className="text-foreground group-hover:text-primary line-clamp-2 text-sm font-medium">
              {item.name}
            </span>
            {item.count !== undefined && item.count > 0 && (
              <span className="text-muted-foreground text-xs">({item.count})</span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
