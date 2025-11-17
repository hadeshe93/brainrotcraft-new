'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Image from '@/components/image';
import MdiMagnify from '~icons/mdi/magnify';

export interface SidebarCategory {
  uuid: string;
  name: string;
  slug: string;
  iconUrl?: string | null;
}

export interface SidebarTag {
  uuid: string;
  name: string;
  slug: string;
}

export interface SidebarFeaturedItem {
  uuid: string;
  name: string;
  slug: string;
}

interface SidebarProps {
  featuredItems: SidebarFeaturedItem[];
  categories: SidebarCategory[];
  tags: SidebarTag[];
  className?: string;
}

export default function Sidebar({ featuredItems, categories, tags, className }: SidebarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/find?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Map featured item slugs to emoji icons
  const getIconForSlug = (slug: string): string => {
    const iconMap: Record<string, string> = {
      home: '🏠',
      games: '📦',
      hot: '🔥',
      new: '✨',
    };
    return iconMap[slug] || '📌';
  };

  return (
    <div className={cn('flex w-full flex-col rounded-lg', className)}>
      <div className="flex-1">
        {/* Search Section */}
        <div className="mb-6">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Input
                type="search"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                className="absolute top-0 right-0 h-full hover:bg-transparent"
              >
                <MdiMagnify className="text-muted-foreground size-5" />
              </Button>
            </div>
          </form>
        </div>

        {/* Quick Navigation Section */}
        {featuredItems && featuredItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-foreground mb-3 text-sm font-semibold">Quick Navigation</h3>
            <nav className="space-y-1">
              {featuredItems.map((item) => (
                <Link
                  key={item.uuid}
                  href={item.slug === 'home' ? '/' : `/${item.slug}`}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground block rounded-md px-3 py-2 text-sm transition-colors"
                >
                  {getIconForSlug(item.slug)} {item.name}
                </Link>
              ))}
            </nav>
          </div>
        )}

        {/* Categories Section */}
        {categories && categories.length > 0 && (
          <div className="mb-6">
            <h3 className="text-foreground mb-3 text-sm font-semibold">Categories</h3>
            <nav className="space-y-1">
              {categories.map((category) => (
                <Link
                  key={category.uuid}
                  href={`/category/${category.slug}`}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors"
                >
                  {category.iconUrl && (
                    <Image
                      src={category.iconUrl}
                      alt={category.name}
                      width={40}
                      height={40}
                      quality={85}
                      format="auto"
                      className="size-5 flex-shrink-0 object-contain"
                    />
                  )}
                  <span>{category.name}</span>
                </Link>
              ))}
              {categories.length > 5 && (
                <Link
                  href="/categories"
                  className="text-primary hover:text-primary/80 block px-3 py-2 text-sm font-medium transition-colors"
                >
                  View All Categories →
                </Link>
              )}
            </nav>
          </div>
        )}

        {/* Tags Section */}
        {tags && tags.length > 0 && (
          <div>
            <h3 className="text-foreground mb-3 text-sm font-semibold">Tags</h3>
            <nav className="space-y-1">
              {tags.slice(0, 5).map((tag) => (
                <Link
                  key={tag.uuid}
                  href={`/tag/${tag.slug}`}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground block rounded-md px-3 py-2 text-sm transition-colors before:mr-2 before:inline-flex before:size-5 before:items-center before:justify-center before:rounded before:bg-purple-100 before:text-xs before:font-semibold before:text-purple-600 before:content-['#'] dark:before:bg-purple-950/50 dark:before:text-purple-400"
                >
                  {tag.name}
                </Link>
              ))}
              {tags.length > 5 && (
                <Link
                  href="/tags"
                  className="text-primary hover:text-primary/80 block px-3 py-2 text-sm font-medium transition-colors"
                >
                  View All Tags →
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
