import { getTranslations } from 'next-intl/server';
import { wrapForI18n } from '@/i18n/utils';
import type { LocalePageProps } from '@/types/page';
import { getCloudflareEnv } from '@/services/base';
import { getAllGames, getAllGamesSEOContent } from '@/services/content/list';
import { getSidebarData } from '@/services/content/home';
import SidebarContainer from '@/components/blocks/sidebar-container';
import GameGrid from '@/components/game/grid';
import PaginationLinks from '@/components/ui/pagination-links';
import MarkdownRenderer from '@/components/markdown-renderer';
import { LanguageCode } from '@/types/lang';

interface AllGamesPageProps extends LocalePageProps {
  params: Promise<{
    locale: LanguageCode;
    page?: string[];  // Optional catch-all for pagination
  }>;
  // searchParams removed - using path parameters for pagination
}

async function AllGamesPage(props: AllGamesPageProps) {
  const { locale, page: pageParam } = await props.params;

  // Parse page number from path
  let currentPage = 1;
  if (pageParam && pageParam.length > 0) {
    // Only allow single page parameter: /games/2
    if (pageParam.length > 1) {
      throw new Error('Invalid page parameter');
    }

    const pageNum = Number(pageParam[0]);
    if (isNaN(pageNum) || pageNum < 1 || !Number.isInteger(pageNum)) {
      throw new Error('Invalid page number');
    }

    currentPage = pageNum;
  }

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

  // Validate page range
  if (currentPage > gamesData.pagination.totalPages) {
    throw new Error('Page out of range');
  }

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
            <PaginationLinks currentPage={gamesData.pagination.currentPage} totalPages={gamesData.pagination.totalPages} baseUrl="/games" />
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
  const { locale, page: pageParam } = await props.params;

  // Parse page number
  const page = pageParam && pageParam.length > 0 ? Number(pageParam[0]) : 1;

  const env = await getCloudflareEnv();
  const db = (env as any).DB as D1Database;
  const seoContent = await getAllGamesSEOContent(db, locale);

  return {
    title: page > 1 ? `${seoContent.metadataTitle || 'All Games'} - Page ${page}` : seoContent.metadataTitle || '',
    description: seoContent.metadataDescription || '',
    alternates: {
      canonical: page === 1 ? '/games' : `/games/${page}`,
    },
  };
}

// Enable Static Site Generation with Incremental Static Regeneration
export const revalidate = 3600; // Revalidate every hour

// Skip build-time pre-rendering, generate on first request
export async function generateStaticParams() {
  return [];
}

export default wrapForI18n<AllGamesPageProps>(AllGamesPage);
