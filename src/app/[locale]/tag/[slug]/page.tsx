import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { wrapForI18n } from '@/i18n/utils';
import type { LocalePageProps } from '@/types/page';
import { getCloudflareEnv } from '@/services/base';
import { getGamesByTag } from '@/services/content/list';
import { getSidebarData } from '@/services/content/home';
import SidebarContainer from '@/components/blocks/sidebar-container';
import GameGrid from '@/components/game/grid';
import Pagination from '@/components/ui/pagination';
import MarkdownRenderer from '@/components/markdown-renderer';

interface TagPageProps extends LocalePageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams?: Promise<{ page?: string }>;
}

async function TagPage(props: TagPageProps) {
  const { locale, slug } = await props.params;
  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams?.page) || 1;

  const t = await getTranslations('biz.game');
  const tCommon = await getTranslations('common');

  // Get Cloudflare D1 database
  const env = await getCloudflareEnv();
  const db = (env as any).DB as D1Database;

  // Fetch all data in parallel
  const [tagData, sidebar] = await Promise.all([
    getGamesByTag(slug, currentPage, 20, db, locale as any),
    getSidebarData(db, locale as any),
  ]);

  // Handle 404 if tag not found
  if (!tagData) {
    notFound();
  }

  const { tag, games, pagination } = tagData;

  return (
    <div className="block-section">
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidebar - Desktop: fixed left, Mobile: hidden or collapsible */}
        <SidebarContainer featuredItems={sidebar.featuredItems} categories={sidebar.categories} tags={sidebar.tags} />

        {/* Main Content Area */}
        <main className="flex-1 space-y-8">
          {/* Page Title */}
          <div>
            <h1 className="text-foreground text-3xl font-bold md:text-4xl">{tag.name}</h1>
            {tag.metadataDescription && (
              <p className="text-muted-foreground mt-2 text-sm md:text-base">{tag.metadataDescription}</p>
            )}
            {pagination.totalItems > 0 && (
              <p className="text-muted-foreground mt-2 text-sm">
                {tCommon('showing_items', {
                  current: games.length,
                  total: pagination.totalItems,
                  type: t('type_games'),
                })}
              </p>
            )}
          </div>

          {/* Games Grid */}
          <GameGrid games={games} />

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} />
          )}

          {/* SEO Content Section */}
          {tag.content && (
            <section className="prose dark:prose-invert max-w-none">
              <MarkdownRenderer locale={locale as any} content={tag.content} />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

// Generate metadata
export async function generateMetadata(props: TagPageProps) {
  const { locale, slug } = await props.params;
  const env = await getCloudflareEnv();
  const db = (env as any).DB as D1Database;

  const tagData = await getGamesByTag(slug, 1, 1, db, locale as any);

  if (!tagData) {
    return {
      title: '',
    };
  }

  const { tag } = tagData;

  return {
    title: tag.metadataTitle || tag.name,
    description: tag.metadataDescription || '',
  };
}

// Enable Static Site Generation with Incremental Static Regeneration
export const revalidate = 3600; // Revalidate every hour
export default wrapForI18n<TagPageProps>(TagPage);
