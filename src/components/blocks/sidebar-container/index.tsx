import Sidebar, { SidebarCategory, SidebarTag, SidebarFeaturedItem } from '@/components/blocks/sidebar';
import { cn } from '@/lib/utils';

interface SidebarContainerProps {
  featuredItems: SidebarFeaturedItem[];
  categories: SidebarCategory[];
  tags: SidebarTag[];
  className?: string;
  stickyOffset?: string;
}

export default function SidebarContainer({
  featuredItems,
  categories,
  tags,
  className,
  stickyOffset = 'top-6',
}: SidebarContainerProps) {
  return (
    <aside className={cn('hidden md:block md:w-60 md:flex-shrink-0 lg:w-64', className)}>
      <div className={cn('sticky overflow-y-auto', stickyOffset)} style={{ maxHeight: 'calc(100vh - 6rem)' }}>
        <Sidebar featuredItems={featuredItems} categories={categories} tags={tags} className="bg-muted/20 p-4" />
      </div>
    </aside>
  );
}

// Re-export types for convenience
export type { SidebarCategory, SidebarTag, SidebarFeaturedItem };
