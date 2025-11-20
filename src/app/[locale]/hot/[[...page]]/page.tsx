import { getTranslations } from 'next-intl/server';
import { wrapForI18n } from '@/i18n/utils';
import type { LocalePageProps } from '@/types/page';
import { getCloudflareEnv } from '@/services/base';
import { getHotGames, getHotGamesSEOContent } from '@/services/content/list';
import { getSidebarData } from '@/services/content/home';
import SidebarContainer from '@/components/blocks/sidebar-container';
import GameGrid from '@/components/game/grid';
import PaginationLinks from '@/components/ui/pagination-links';
import MarkdownRenderer from '@/components/markdown-renderer';
import { LanguageCode } from '@/types/lang';

interface HotPageProps extends LocalePageProps {
  params: Promise<{
    locale: LanguageCode;
    page?: string[];  // Optional catch-all for pagination
  }>;
  // searchParams removed - using path parameters for pagination
}

async function HotPage(props: HotPageProps) {
  const { locale, page: pageParam } = await props.params;

  // Parse page number from path
  let currentPage = 1;
  if (pageParam && pageParam.length > 0) {
    // Only allow single page parameter: /hot/2
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
  const [hotGamesData, seoContent, sidebar] = await Promise.all([
    getHotGames(currentPage, 20, db, locale),
    getHotGamesSEOContent(db, locale),
    getSidebarData(db, locale),
  ]);

  const { games, pagination } = hotGamesData;

  // Validate page range
  if (currentPage > pagination.totalPages) {
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
            <h1 className="text-foreground text-3xl font-bold md:text-4xl">{t('hot_games')}</h1>
            {seoContent.metadataDescription && (
              <p className="text-muted-foreground mt-2 text-sm md:text-base">{seoContent.metadataDescription}</p>
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
            <PaginationLinks currentPage={pagination.currentPage} totalPages={pagination.totalPages} baseUrl="/hot" />
          )}

          {/* SEO Content Section */}
          {seoContent.content && (
            <section className="prose dark:prose-invert max-w-none">
              <MarkdownRenderer locale={locale as any} content={seoContent.content} />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

// Generate metadata
export async function generateMetadata(props: HotPageProps) {
  const { locale, page: pageParam } = await props.params;

  // Parse page number
  const page = pageParam && pageParam.length > 0 ? Number(pageParam[0]) : 1;

  const env = await getCloudflareEnv();
  const db = (env as any).DB as D1Database;
  const seoContent = await getHotGamesSEOContent(db, locale);

  return {
    title: page > 1 ? `${seoContent.metadataTitle || 'Hot Games'} - Page ${page}` : seoContent.metadataTitle || '',
    description: seoContent.metadataDescription || '',
    alternates: {
      canonical: page === 1 ? '/hot' : `/hot/${page}`,
    },
  };
}

// Enable Static Site Generation with Incremental Static Regeneration
export const revalidate = 3600; // Revalidate every hour

// Skip build-time pre-rendering, generate on first request
export async function generateStaticParams() {
  return [];
}

export default wrapForI18n<HotPageProps>(HotPage);
