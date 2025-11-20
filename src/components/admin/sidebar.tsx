'use client';

import { Link } from '@/i18n/navigation';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import MdiGamepad from '~icons/mdi/gamepad';
import MdiTag from '~icons/mdi/tag';
import MdiLabel from '~icons/mdi/label';
import MdiStar from '~icons/mdi/star';
import MdiTranslate from '~icons/mdi/translate';
import MdiCloudDownload from '~icons/mdi/cloud-download';
import MdiComment from '~icons/mdi/comment';
import MdiAlertCircle from '~icons/mdi/alert-circle';
import MdiCog from '~icons/mdi/cog';
import MdiDatabaseExport from '~icons/mdi/database-export';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    href: '/admin/games',
    label: 'Game Management',
    icon: MdiGamepad,
  },
  {
    href: '/admin/categories',
    label: 'Category Management',
    icon: MdiTag,
  },
  {
    href: '/admin/tags',
    label: 'Tag Management',
    icon: MdiLabel,
  },
  {
    href: '/admin/featured',
    label: 'Featured Management',
    icon: MdiStar,
  },
  {
    href: '/admin/translations',
    label: 'Translation Management',
    icon: MdiTranslate,
  },
  {
    href: '/admin/fetch',
    label: 'Data Fetch',
    icon: MdiCloudDownload,
  },
  {
    href: '/admin/export',
    label: 'Data Export',
    icon: MdiDatabaseExport,
  },
  {
    href: '/admin/site-config',
    label: 'Site Configuration',
    icon: MdiCog,
  },
  {
    href: '/admin/comments',
    label: 'Comment Management',
    icon: MdiComment,
  },
  {
    href: '/admin/reports',
    label: 'Report Management',
    icon: MdiAlertCircle,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-card border-border flex h-full w-64 flex-col border-r">
      {/* Brand Section */}
      <div className="border-border flex h-16 items-center gap-2 border-b px-6">
        <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md font-bold">G</div>
        <span className="text-foreground text-lg font-semibold">GamesRamp CMS</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="size-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-border border-t p-4">
        <p className="text-muted-foreground text-xs">
          © 2025 GamesRamp
          <br />
          Admin Dashboard v1.0
        </p>
      </div>
    </aside>
  );
}
