import { getTranslations } from 'next-intl/server';
import { wrapForI18n } from '@/i18n/utils';
import type { LocalePageProps } from '@/types/page';
import { getCloudflareEnv } from '@/services/base';
import { getAllGames, getAllGamesSEOContent } from '@/services/content/list';
import { getSidebarData } from '@/services/content/home';
import SidebarContainer from '@/components/blocks/sidebar-container';
import GameGrid from '@/components/game/grid';
import Pagination from '@/components/ui/pagination';
import MarkdownRenderer from '@/components/markdown-renderer';

interface AllGamesPageProps extends LocalePageProps {
  searchParams?: Promise<{ page?: string }>;
}

async function AllGamesPage(props: AllGamesPageProps) {
  const { locale } = await props.params;
  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams?.page) || 1;

  const t = await getTranslations('biz.game');
  const tCommon = await getTranslations('common');

  // Get Cloudflare D1 database
  const env = await getCloudflareEnv();
  const db = (env as any).DB as D1Database;

  // Fetch all data in parallel
  const [gamesData, seoContent, sidebar] = await Promise.all([
    getAllGames(currentPage, 20, db, locale),
    getAllGamesSEOContent(db, locale),
    getSidebarData(db, locale),
  ]);

  return (
    <div className="block-section">
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidebar - Desktop: fixed left, Mobile: hidden or collapsible */}
        <SidebarContainer featuredItems={sidebar.featuredItems} categories={sidebar.categories} tags={sidebar.tags} />

        {/* Main Content Area */}
        <main className="flex-1 space-y-8">
          {/* Page Title */}
          <div>
            <h1 className="text-foreground text-3xl font-bold md:text-4xl">{t('all_games')}</h1>
            {gamesData.pagination.totalItems > 0 && (
              <p className="text-muted-foreground mt-2 text-sm">
                {tCommon('showing_items', {
                  current: gamesData.games.length,
                  total: gamesData.pagination.totalItems,
                  type: t('type_games'),
                })}
              </p>
            )}
          </div>

          {/* Games Grid */}
          <GameGrid games={gamesData.games} />

          {/* Pagination */}
          {gamesData.pagination.totalPages > 1 && (
            <Pagination currentPage={gamesData.pagination.currentPage} totalPages={gamesData.pagination.totalPages} />
          )}

          {/* SEO Content Section */}
          {seoContent && seoContent.content && (
            <section className="prose dark:prose-invert max-w-none">
              <MarkdownRenderer locale={locale} content={seoContent.content} />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

// Generate metadata
export async function generateMetadata(props: AllGamesPageProps) {
  const { locale } = await props.params;
  const env = await getCloudflareEnv();
  const db = (env as any).DB as D1Database;
  const seoContent = await getAllGamesSEOContent(db, locale);

  return {
    title: seoContent.metadataTitle || '',
    description: seoContent.metadataDescription || '',
  };
}

// Enable Static Site Generation with Incremental Static Regeneration
export const revalidate = 3600; // Revalidate every hour
export default wrapForI18n<AllGamesPageProps>(AllGamesPage);
